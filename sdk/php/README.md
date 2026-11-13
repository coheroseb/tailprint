# Tailprint PHP & Laravel SDK

[![Latest Version on Packagist](https://img.shields.io/packagist/v/tailprint/tailprint.svg)](https://packagist.org/packages/tailprint/tailprint)
[![PHP Version](https://img.shields.io/packagist/php-v/tailprint/tailprint.svg)](https://packagist.org/packages/tailprint/tailprint)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Official PHP & Laravel SDK for **Tailprint** ([tailprint.com](https://tailprint.com)) — the developer-first Tailwind CSS HTML-to-PDF, Hosted Templates, and EU Factur-X / ZUGFeRD E-Invoicing engine.

- **Zero external dependencies:** Pure PHP 8.1+ using `ext-curl` and `ext-json`. No headless Chromium or Node.js required on your PHP servers.
- **First-class Laravel support:** Auto-discovered `TailprintServiceProvider`, `Tailprint` Facade, Blade `view()` rendering, and fluent `->download()` / `->stream()` HTTP responses.
- **Hosted Templates (`template_id` + `data`):** Send structured JSON and receive a finished, server-calculated invoice, receipt, certificate, or executive report PDF.
- **EU Factur-X / ZUGFeRD 2.2:** Generate and validate hybrid PDF/A-3 + EN 16931 XML electronic invoices.

---

## 📦 Installation

```bash
composer require tailprint/tailprint
```

Set your API key in `.env` (claim 100 free renders/month at [tailprint.com](https://tailprint.com)):

```env
TAILPRINT_API_KEY=sec_live_...
```

*(Optional for Laravel)* Publish the configuration file:

```bash
php artisan vendor:publish --tag=tailprint-config
```

---

## 🚀 Laravel Quickstart

### 1. Hosted Templates (JSON in, PDF out — no HTML required)

```php
use Tailprint\Laravel\Facades\Tailprint;

Route::get('/invoices/{invoice}/download', function (Invoice $invoice) {
    return Tailprint::template('invoice-modern', [
        'invoice_number' => $invoice->number,
        'issue_date'     => $invoice->issued_at->format('Y-m-d'),
        'due_date'       => $invoice->due_at->format('Y-m-d'),
        'currency'       => 'EUR',
        'seller'         => [
            'name'       => 'Tailprint ApS',
            'vat_number' => 'DK44198271',
            'email'      => 'billing@tailprint.com',
        ],
        'buyer'          => [
            'name'       => $invoice->customer_name,
            'email'      => $invoice->customer_email,
        ],
        'items'          => [
            ['description' => 'Tailprint Pro Subscription', 'quantity' => 1, 'unit_price' => 49.00],
        ],
        'tax_rate'       => 25,
    ])->download("invoice-{$invoice->number}.pdf");
});
```

### 2. Render a Laravel Blade View with Tailwind CSS

```php
use Tailprint\Laravel\Facades\Tailprint;

return Tailprint::view('pdfs.monthly-report', ['metrics' => $metrics])
    ->format('A4')
    ->smartPagination()
    ->stream('monthly-report.pdf');
```

### 3. Save Directly to a Laravel Storage Disk (S3, R2, local)

```php
Tailprint::template('receipt-minimal', $receiptData)
    ->save("receipts/{$order->id}.pdf", disk: 's3');
```

---

## 🛠️ Standalone PHP Usage

```php
<?php

require 'vendor/autoload.php';

use Tailprint\TailprintClient;

$tp = new TailprintClient(apiKey: getenv('TAILPRINT_API_KEY'));

// 1. Render Tailwind HTML to PDF bytes
$pdfBytes = $tp->renderPdf([
    'html' => '<div class="p-12 font-sans"><h1 class="text-3xl font-bold text-indigo-600">Hello from PHP</h1></div>',
    'format' => 'A4',
    'smart_pagination' => true,
]);

file_put_contents('hello.pdf', $pdfBytes);

// 2. Discover & render Hosted Templates
$templates = $tp->listTemplates(); // invoice-modern, receipt-minimal, certificate-classic, report-executive
$example   = $tp->getTemplate('invoice-modern');

$invoicePdf = $tp->renderTemplate('invoice-modern', $example['template']['example_data']);
file_put_contents('invoice.pdf', $invoicePdf);
```

---

## 🇪🇺 European Factur-X / ZUGFeRD 2.2 E-Invoicing

```php
$einvoicePdf = $tp->generateEInvoice([
    'invoice_number' => 'FX-2026-0091',
    'issue_date'     => '2026-11-13',
    'currency'       => 'EUR',
    'seller'         => [
        'name'         => 'Tailprint ApS',
        'vat_number'   => 'DK12345678',
        'country_code' => 'DK',
    ],
    'buyer'          => [
        'name'         => 'Siemens AG',
        'vat_number'   => 'DE987654321',
        'country_code' => 'DE',
    ],
    'line_items'     => [
        [
            'name'       => 'Enterprise Document Engine License',
            'quantity'   => 1,
            'unit_price' => 499.00,
            'tax_rate'   => 19.0,
        ],
    ],
]);

file_put_contents('factur-x-invoice.pdf', $einvoicePdf);
```

---

## ⚡ Async Jobs, Batch Rendering & PDF Operations

```php
// Concurrent Batch Rendering with Auto-Merge
$batch = $tp->renderBatch(
    items: [
        ['template_id' => 'receipt-minimal', 'data' => $receipt1, 'filename' => 'r1.pdf'],
        ['template_id' => 'receipt-minimal', 'data' => $receipt2, 'filename' => 'r2.pdf'],
    ],
    options: ['merge_output' => true, 'merged_filename' => 'all-receipts.pdf']
);

$completed = $tp->waitForJob($batch['job_id']);
echo "Download URL: " . $completed['merged_output']['download_url'];

// PDF Merge, Split, Stamp, Compress & Fill Forms
$mergedPdf  = $tp->mergePdfs([$pdf1, $pdf2]);
$stampedPdf = $tp->stampPdf($mergedPdf, ['watermark_text' => 'PAID', 'page_numbers' => true]);

// Webhook HMAC-SHA256 verification
$isValid = TailprintClient::verifyWebhookSignature(
    payload: file_get_contents('php://input'),
    signatureHeader: $_SERVER['HTTP_X_TAILPRINT_SIGNATURE'] ?? '',
    secret: getenv('TAILPRINT_WEBHOOK_SECRET')
);
```

---

## 📄 License

MIT License — see [https://tailprint.com](https://tailprint.com).
