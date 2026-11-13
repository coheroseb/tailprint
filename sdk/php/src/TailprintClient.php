<?php

declare(strict_types=1);

namespace Tailprint;

use InvalidArgumentException;
use Tailprint\Exceptions\AuthenticationException;
use Tailprint\Exceptions\RateLimitException;
use Tailprint\Exceptions\TailprintException;
use Tailprint\Exceptions\TimeoutException;
use Tailprint\Exceptions\ValidationException;

/**
 * Official Tailprint PHP & Laravel Client SDK (v1.4.0).
 *
 * Zero-dependency client for Tailwind CSS HTML-to-PDF rendering, Hosted Document
 * Templates, EU Factur-X / ZUGFeRD E-Invoicing, PDF Operations & Async Batch Jobs.
 *
 * Documentation: https://tailprint.com/docs
 */
class TailprintClient
{
    public const VERSION = '1.4.0';

    private string $apiKey;
    private string $baseUrl;
    private float $timeout;

    /**
     * Optional custom HTTP transport callback for testing:
     * fn(string $method, string $url, array $headers, ?string $body, float $timeout): array{status:int, headers:array<string,string>, body:string}
     *
     * @var callable|null
     */
    private $transport;

    public function __construct(
        ?string $apiKey = null,
        ?string $baseUrl = null,
        float $timeout = 30.0,
        ?callable $transport = null
    ) {
        $envKey = getenv('TAILPRINT_API_KEY');
        $envBase = getenv('TAILPRINT_BASE_URL');

        $this->apiKey = $apiKey ?? (is_string($envKey) ? $envKey : '');
        $resolvedBase = $baseUrl ?? (is_string($envBase) && $envBase !== '' ? $envBase : 'https://tailprint.com');
        $this->baseUrl = rtrim($resolvedBase, '/');
        $this->timeout = $timeout;
        $this->transport = $transport;
    }

    // =========================================================================
    // Fluent Builders (Laravel & Modern PHP)
    // =========================================================================

    /**
     * Start a fluent PDF render from Tailwind HTML.
     */
    public function html(string $html): PendingPdf
    {
        return new PendingPdf($this, ['html' => $html]);
    }

    /**
     * Start a fluent PDF render from a public URL.
     */
    public function url(string $url): PendingPdf
    {
        return new PendingPdf($this, ['url' => $url]);
    }

    /**
     * Start a fluent PDF render from a hosted template ID and JSON data.
     *
     * @param array<string, mixed> $data
     */
    public function template(string $templateId, array $data): PendingPdf
    {
        return new PendingPdf($this, [
            'template_id' => $templateId,
            'data' => $data,
        ]);
    }

    /**
     * Start a fluent PDF render from a Laravel Blade view.
     *
     * @param array<string, mixed> $data
     */
    public function view(string $view, array $data = []): PendingPdf
    {
        if (!function_exists('view')) {
            throw new TailprintException('Laravel view() helper is not available outside a Laravel application.');
        }

        /** @var object $rendered */
        $rendered = view($view, $data);
        $html = method_exists($rendered, 'render') ? (string) $rendered->render() : (string) $rendered;

        return new PendingPdf($this, ['html' => $html]);
    }

    // =========================================================================
    // 1. Core PDF Rendering & Hosted Templates
    // =========================================================================

    /**
     * Render Tailwind HTML, a public URL, or a hosted template (`template_id` + `data`) into a vector PDF.
     *
     * Returns raw PDF binary string by default, or an associative array when `store => true` or `async => true`.
     *
     * @param array<string, mixed> $options
     * @return string|array<string, mixed>
     */
    public function renderPdf(array $options): string|array
    {
        $hasHtml = isset($options['html']) && is_string($options['html']) && $options['html'] !== '';
        $hasUrl = isset($options['url']) && is_string($options['url']) && $options['url'] !== '';
        $hasTemplate = isset($options['template_id']) && is_string($options['template_id']) && $options['template_id'] !== '';

        if (!$hasHtml && !$hasUrl && !$hasTemplate) {
            throw new InvalidArgumentException("Either 'html', 'url', or 'template_id' must be provided.");
        }
        if ($hasTemplate && (!isset($options['data']) || !is_array($options['data']))) {
            throw new InvalidArgumentException("'data' array is required when 'template_id' is set.");
        }

        $expectBinary = empty($options['store']) && empty($options['async']);

        return $this->request('/v1/render/pdf', 'POST', $options, $expectBinary);
    }

    /**
     * Shorthand to render a hosted template (`invoice-modern`, `receipt-minimal`, `certificate-classic`, `report-executive`).
     *
     * @param array<string, mixed> $data
     * @param array<string, mixed> $options
     * @return string|array<string, mixed>
     */
    public function renderTemplate(string $templateId, array $data, array $options = []): string|array
    {
        $payload = array_merge($options, [
            'template_id' => $templateId,
            'data' => $data,
        ]);

        return $this->renderPdf($payload);
    }

    /**
     * List all available hosted document templates.
     *
     * @return array<int, array<string, mixed>>
     */
    public function listTemplates(): array
    {
        /** @var array<string, mixed> $res */
        $res = $this->request('/v1/templates', 'GET', null, false);
        /** @var array<int, array<string, mixed>> $templates */
        $templates = $res['templates'] ?? [];
        return $templates;
    }

    /**
     * Inspect a hosted template, including its `example_data` and `example_request`.
     *
     * @return array<string, mixed>
     */
    public function getTemplate(string $templateId): array
    {
        /** @var array<string, mixed> $res */
        $res = $this->request('/v1/templates/' . rawurlencode($templateId), 'GET', null, false);
        return $res;
    }

    /**
     * Enqueue an asynchronous PDF rendering job and return job metadata immediately.
     *
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function renderPdfAsync(array $options): array
    {
        $options['async'] = true;
        /** @var array<string, mixed> $res */
        $res = $this->request('/v1/render/pdf', 'POST', $options, false);
        return $res;
    }

    /**
     * Submit up to 100 documents for concurrent batch rendering with optional auto-merge.
     *
     * @param array<int, array<string, mixed>> $items
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function renderBatch(array $items, array $options = []): array
    {
        if (count($items) === 0) {
            throw new InvalidArgumentException("'items' must be a non-empty array of render specifications.");
        }

        $payload = array_merge($options, ['items' => $items]);
        /** @var array<string, mixed> $res */
        $res = $this->request('/v1/render/batch', 'POST', $payload, false);
        return $res;
    }

    /**
     * Retrieve the status and results of an asynchronous or batch rendering job.
     *
     * @return array<string, mixed>
     */
    public function getJob(string $jobId): array
    {
        /** @var array<string, mixed> $res */
        $res = $this->request('/v1/jobs/' . rawurlencode($jobId), 'GET', null, false);
        return $res;
    }

    /**
     * Poll a job until it reaches 'completed' or 'failed' status.
     *
     * @return array<string, mixed>
     */
    public function waitForJob(string $jobId, float $pollInterval = 1.0, float $timeout = 60.0): array
    {
        $start = microtime(true);
        while (true) {
            $status = $this->getJob($jobId);
            $state = $status['status'] ?? '';

            if ($state === 'completed') {
                return $status;
            }
            if ($state === 'failed') {
                $errMsg = is_string($status['error'] ?? null) ? $status['error'] : "Job {$jobId} failed";
                throw new TailprintException($errMsg, 500, $status);
            }

            if ((microtime(true) - $start) >= $timeout) {
                throw new TimeoutException("Timed out waiting for job {$jobId} after {$timeout}s", 408, $status);
            }

            usleep((int) ($pollInterval * 1_000_000));
        }
    }

    // =========================================================================
    // 2. European E-Invoicing (Factur-X / ZUGFeRD 2.2 / EN 16931)
    // =========================================================================

    /**
     * Generate a hybrid PDF/A-3 invoice with embedded EN 16931 CII XML (Factur-X / ZUGFeRD 2.2).
     *
     * @param array<string, mixed> $invoice
     * @param array<string, mixed> $options
     * @return string|array<string, mixed>
     */
    public function generateEInvoice(array $invoice, ?string $html = null, array $options = []): string|array
    {
        $payload = array_merge($options, ['invoice' => $invoice]);
        if ($html !== null) {
            $payload['html'] = $html;
        }

        $expectBinary = empty($payload['store']);
        return $this->request('/v1/einvoice/generate', 'POST', $payload, $expectBinary);
    }

    /**
     * Validate a PDF for Factur-X / ZUGFeRD / EN 16931 compliance and extract structured invoice data.
     *
     * @return array<string, mixed>
     */
    public function validateEInvoice(string $pdf): array
    {
        $payload = ['pdf' => $this->toDataUri($pdf)];
        /** @var array<string, mixed> $res */
        $res = $this->request('/v1/einvoice/validate', 'POST', $payload, false);
        return $res;
    }

    // =========================================================================
    // 3. PDF Manipulation & Post-Processing
    // =========================================================================

    /**
     * Merge 2 to 20 PDF documents (raw bytes, URLs, or Base64 strings) into a single PDF.
     *
     * @param array<int, string> $pdfs
     * @param array<string, mixed>|null $metadata
     * @return string|array<string, mixed>
     */
    public function mergePdfs(array $pdfs, ?array $metadata = null, bool $store = false): string|array
    {
        if (count($pdfs) < 2) {
            throw new InvalidArgumentException('At least 2 PDFs are required to merge.');
        }

        $payload = [
            'pdfs' => array_map([$this, 'toDataUri'], $pdfs),
            'store' => $store,
        ];
        if ($metadata !== null) {
            $payload['metadata'] = $metadata;
        }

        return $this->request('/v1/pdf/merge', 'POST', $payload, !$store);
    }

    /**
     * Split a PDF into multiple parts by page ranges (e.g. "1-3, 4, 5-7").
     *
     * @return array<string, mixed>
     */
    public function splitPdf(string $pdf, string $ranges, bool $store = true): array
    {
        $payload = [
            'pdf' => $this->toDataUri($pdf),
            'ranges' => $ranges,
            'store' => $store,
        ];
        /** @var array<string, mixed> $res */
        $res = $this->request('/v1/pdf/split', 'POST', $payload, false);
        return $res;
    }

    /**
     * Stamp a PDF with diagonal watermarks, page numbers, headers/footers, or image overlays.
     *
     * @param array<string, mixed> $options
     * @return string|array<string, mixed>
     */
    public function stampPdf(string $pdf, array $options = []): string|array
    {
        $payload = array_merge($options, ['pdf' => $this->toDataUri($pdf)]);
        $expectBinary = empty($payload['store']);
        return $this->request('/v1/pdf/stamp', 'POST', $payload, $expectBinary);
    }

    /**
     * Optimize and linearize a PDF document.
     *
     * @param array<string, mixed> $options
     * @return string|array<string, mixed>
     */
    public function compressPdf(string $pdf, array $options = []): string|array
    {
        $payload = array_merge($options, ['pdf' => $this->toDataUri($pdf)]);
        $expectBinary = empty($payload['store']);
        return $this->request('/v1/pdf/compress', 'POST', $payload, $expectBinary);
    }

    /**
     * Fill interactive AcroForm fields in a PDF and optionally flatten them.
     *
     * @param array<string, string|bool> $fields
     * @return string|array<string, mixed>
     */
    public function fillPdfForm(string $pdf, array $fields, bool $flatten = true, bool $store = false): string|array
    {
        $payload = [
            'pdf' => $this->toDataUri($pdf),
            'fields' => $fields,
            'flatten' => $flatten,
            'store' => $store,
        ];
        return $this->request('/v1/pdf/fill-form', 'POST', $payload, !$store);
    }

    // =========================================================================
    // 4. Webhook Verification
    // =========================================================================

    /**
     * Verify the `X-Tailprint-Signature` HMAC-SHA256 header sent on webhook deliveries.
     */
    public static function verifyWebhookSignature(
        string $payload,
        string $signatureHeader,
        string $secret
    ): bool {
        if ($signatureHeader === '' || $secret === '') {
            return false;
        }

        $cleanSig = str_starts_with($signatureHeader, 'sha256=')
            ? substr($signatureHeader, 7)
            : $signatureHeader;

        $expected = hash_hmac('sha256', $payload, $secret);
        return hash_equals($expected, $cleanSig);
    }

    // =========================================================================
    // Internal HTTP Transport
    // =========================================================================

    private function toDataUri(string $input): string
    {
        if (
            str_starts_with($input, 'http://') ||
            str_starts_with($input, 'https://') ||
            str_starts_with($input, 'data:')
        ) {
            return $input;
        }

        // Raw PDF bytes start with "%PDF-"
        if (str_starts_with($input, '%PDF-')) {
            return 'data:application/pdf;base64,' . base64_encode($input);
        }

        return 'data:application/pdf;base64,' . $input;
    }

    /**
     * @param array<string, mixed>|null $payload
     * @return string|array<string, mixed>
     */
    private function request(
        string $endpoint,
        string $method = 'POST',
        ?array $payload = null,
        bool $expectBinary = false
    ): string|array {
        $url = $this->baseUrl . (str_starts_with($endpoint, '/') ? '' : '/') . $endpoint;
        $headers = [
            'User-Agent' => 'Tailprint-PHP-SDK/' . self::VERSION,
        ];

        if ($this->apiKey !== '') {
            $headers['Authorization'] = 'Bearer ' . $this->apiKey;
        }

        $body = null;
        if ($payload !== null) {
            if (isset($payload['idempotency_key']) && is_string($payload['idempotency_key']) && $payload['idempotency_key'] !== '') {
                $headers['Idempotency-Key'] = $payload['idempotency_key'];
            }
            unset($payload['idempotency_key']);
            $headers['Content-Type'] = 'application/json';
            $body = json_encode($payload, JSON_THROW_ON_ERROR);
        }

        $response = $this->sendHttpRequest($method, $url, $headers, $body);
        $status = $response['status'];
        $resBody = $response['body'];
        $contentType = strtolower($response['headers']['content-type'] ?? '');

        if ($status < 200 || $status >= 300) {
            $this->throwForStatus($status, $resBody);
        }

        if ($expectBinary || str_contains($contentType, 'application/pdf')) {
            return $resBody;
        }

        if ($resBody === '') {
            return [];
        }

        $decoded = json_decode($resBody, true);
        return is_array($decoded) ? $decoded : ['raw' => $resBody];
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, headers: array<string, string>, body: string}
     */
    private function sendHttpRequest(string $method, string $url, array $headers, ?string $body): array
    {
        if ($this->transport !== null) {
            return ($this->transport)($method, $url, $headers, $body, $this->timeout);
        }

        $ch = curl_init($url);
        if ($ch === false) {
            throw new TailprintException('Failed to initialize cURL session.');
        }

        $headerLines = [];
        foreach ($headers as $k => $v) {
            $headerLines[] = "{$k}: {$v}";
        }

        $responseHeaders = [];
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headerLines,
            CURLOPT_TIMEOUT => (int) ceil($this->timeout),
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HEADERFUNCTION => static function ($curl, string $headerLine) use (&$responseHeaders): int {
                $len = strlen($headerLine);
                $parts = explode(':', $headerLine, 2);
                if (count($parts) === 2) {
                    $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
                }
                return $len;
            },
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $rawBody = curl_exec($ch);
        $errno = curl_errno($ch);
        $errMsg = curl_error($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0 || !is_string($rawBody)) {
            if ($errno === CURLE_OPERATION_TIMEDOUT) {
                throw new TimeoutException("Tailprint request timed out after {$this->timeout}s: {$errMsg}", 408);
            }
            throw new TailprintException("Tailprint network error: {$errMsg}", 0);
        }

        return [
            'status' => $statusCode,
            'headers' => $responseHeaders,
            'body' => $rawBody,
        ];
    }

    private function throwForStatus(int $status, string $body): never
    {
        $message = "Tailprint API error (HTTP {$status})";
        $details = null;

        $decoded = json_decode($body, true);
        if (is_array($decoded)) {
            if (isset($decoded['message']) && is_string($decoded['message'])) {
                $message = $decoded['message'];
            }
            $details = $decoded;
        } elseif ($body !== '') {
            $message = $body;
        }

        match ($status) {
            400 => throw new ValidationException($message, $status, $details),
            401, 403 => throw new AuthenticationException($message, $status, $details),
            408, 504 => throw new TimeoutException($message, $status, $details),
            429 => throw new RateLimitException($message, $status, $details),
            default => throw new TailprintException($message, $status, $details),
        };
    }
}
