<?php

declare(strict_types=1);

namespace Tailprint\Laravel\Facades;

use Illuminate\Support\Facades\Facade;
use Tailprint\PendingPdf;
use Tailprint\TailprintClient;

/**
 * @method static PendingPdf html(string $html)
 * @method static PendingPdf url(string $url)
 * @method static PendingPdf template(string $templateId, array<string, mixed> $data)
 * @method static PendingPdf view(string $view, array<string, mixed> $data = [])
 * @method static string|array<string, mixed> renderPdf(array<string, mixed> $options)
 * @method static string|array<string, mixed> renderTemplate(string $templateId, array<string, mixed> $data, array<string, mixed> $options = [])
 * @method static array<int, array<string, mixed>> listTemplates()
 * @method static array<string, mixed> getTemplate(string $templateId)
 * @method static array<string, mixed> createTemplate(array<string, mixed> $options)
 * @method static array<string, mixed> deleteTemplate(string $templateId)
 * @method static array<string, mixed> renderPdfAsync(array<string, mixed> $options)
 * @method static array<string, mixed> renderBatch(array<int, array<string, mixed>> $items, array<string, mixed> $options = [])
 * @method static array<string, mixed> getJob(string $jobId)
 * @method static array<string, mixed> waitForJob(string $jobId, float $pollInterval = 1.0, float $timeout = 60.0)
 * @method static string|array<string, mixed> generateEInvoice(array<string, mixed> $invoice, ?string $html = null, array<string, mixed> $options = [])
 * @method static array<string, mixed> validateEInvoice(string $pdf)
 * @method static string|array<string, mixed> mergePdfs(array<int, string> $pdfs, ?array<string, mixed> $metadata = null, bool $store = false)
 * @method static array<string, mixed> splitPdf(string $pdf, string $ranges, bool $store = true)
 * @method static string|array<string, mixed> stampPdf(string $pdf, array<string, mixed> $options = [])
 * @method static string|array<string, mixed> compressPdf(string $pdf, array<string, mixed> $options = [])
 * @method static string|array<string, mixed> fillPdfForm(string $pdf, array<string, string|bool> $fields, bool $flatten = true, bool $store = false)
 * @method static bool verifyWebhookSignature(string $payload, string $signatureHeader, string $secret)
 *
 * @see \Tailprint\TailprintClient
 */
class Tailprint extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return TailprintClient::class;
    }
}
