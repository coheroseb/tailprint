<?php

declare(strict_types=1);

namespace Tailprint;

use RuntimeException;

/**
 * Fluent PDF builder for PHP and Laravel applications.
 *
 * Example:
 *   Tailprint::template('invoice-modern', $data)->format('A4')->download('invoice.pdf');
 *   Tailprint::view('pdfs.invoice', ['order' => $order])->stream('invoice.pdf');
 */
class PendingPdf
{
    private TailprintClient $client;

    /** @var array<string, mixed> */
    private array $payload = [];

    /**
     * @param array<string, mixed> $initialPayload
     */
    public function __construct(TailprintClient $client, array $initialPayload = [])
    {
        $this->client = $client;
        $this->payload = $initialPayload;
    }

    public function format(string $format = 'A4'): self
    {
        $this->payload['format'] = $format;
        return $this;
    }

    public function landscape(bool $landscape = true): self
    {
        $this->payload['landscape'] = $landscape;
        return $this;
    }

    public function margins(
        string $top = '20mm',
        string $right = '15mm',
        string $bottom = '20mm',
        string $left = '15mm'
    ): self {
        $this->payload['margin'] = [
            'top' => $top,
            'right' => $right,
            'bottom' => $bottom,
            'left' => $left,
        ];
        return $this;
    }

    public function headerHtml(string $html): self
    {
        $this->payload['display_header_footer'] = true;
        $this->payload['header_html'] = $html;
        return $this;
    }

    public function footerHtml(string $html): self
    {
        $this->payload['display_header_footer'] = true;
        $this->payload['footer_html'] = $html;
        return $this;
    }

    public function smartPagination(bool $enabled = true): self
    {
        $this->payload['smart_pagination'] = $enabled;
        return $this;
    }

    public function password(string $userPassword, ?string $ownerPassword = null): self
    {
        $this->payload['password'] = $userPassword;
        if ($ownerPassword !== null) {
            $this->payload['owner_password'] = $ownerPassword;
        }
        return $this;
    }

    public function noStore(bool $noStore = true): self
    {
        $this->payload['no_store'] = $noStore;
        return $this;
    }

    public function idempotencyKey(string $key): self
    {
        $this->payload['idempotency_key'] = $key;
        return $this;
    }

    /**
     * Enable Cryptographic Proof-of-Origin (HMAC-SHA256 signature) and optional visual verification seal.
     */
    public function sign(bool $verifySeal = false): self
    {
        $this->payload['sign'] = true;
        $this->payload['verify_seal'] = $verifySeal;
        return $this;
    }

    /**
     * Embed arbitrary structured JSON data inside the Dual-Brain PDF container for 0ms zero-OCR extraction.
     *
     * @param array<string, mixed> $data
     */
    public function embedData(array $data): self
    {
        $this->payload['ai_ready'] = true;
        $this->payload['embed_data'] = $data;
        return $this;
    }

    /**
     * Render and return raw PDF binary string.
     */
    public function bytes(): string
    {
        $payload = $this->payload;
        unset($payload['store'], $payload['async']);
        /** @var string $bytes */
        $bytes = $this->client->renderPdf($payload);
        return $bytes;
    }

    /**
     * Render and return Base64-encoded PDF string.
     */
    public function base64(): string
    {
        return base64_encode($this->bytes());
    }

    /**
     * Render and save the PDF to a local file path (or Laravel Storage disk if specified).
     */
    public function save(string $path, ?string $disk = null): bool
    {
        $bytes = $this->bytes();

        if ($disk !== null && class_exists(\Illuminate\Support\Facades\Storage::class)) {
            return (bool) \Illuminate\Support\Facades\Storage::disk($disk)->put($path, $bytes);
        }

        return file_put_contents($path, $bytes) !== false;
    }

    /**
     * Return an HTTP download response (attachment).
     * Works natively with Laravel / Symfony HttpFoundation Response when available.
     *
     * @return mixed
     */
    public function download(string $filename = 'document.pdf')
    {
        return $this->toHttpResponse($filename, 'attachment');
    }

    /**
     * Return an inline HTTP response to display the PDF directly in the browser.
     *
     * @return mixed
     */
    public function stream(string $filename = 'document.pdf')
    {
        return $this->toHttpResponse($filename, 'inline');
    }

    /**
     * @return mixed
     */
    private function toHttpResponse(string $filename, string $disposition)
    {
        $bytes = $this->bytes();
        $safeFilename = str_replace(['"', "\r", "\n"], '', $filename);
        $headers = [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf('%s; filename="%s"', $disposition, $safeFilename),
            'Content-Length' => (string) strlen($bytes),
        ];

        if (function_exists('response')) {
            return response($bytes, 200, $headers);
        }

        if (class_exists(\Illuminate\Http\Response::class)) {
            return new \Illuminate\Http\Response($bytes, 200, $headers);
        }

        throw new RuntimeException(
            'Laravel Response helper is not available. Use ->bytes() or ->save() in non-Laravel environments.'
        );
    }
}
