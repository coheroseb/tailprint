<?php

declare(strict_types=1);

namespace Tailprint\Tests;

use PHPUnit\Framework\TestCase;
use Tailprint\Exceptions\AuthenticationException;
use Tailprint\Exceptions\ValidationException;
use Tailprint\TailprintClient;

final class TailprintClientTest extends TestCase
{
    public function testRenderPdfWithHtmlReturnsBinaryPdf(): void
    {
        $captured = [];
        $client = new TailprintClient(
            apiKey: 'sec_live_test_123',
            baseUrl: 'https://tailprint.com',
            transport: function (string $method, string $url, array $headers, ?string $body) use (&$captured): array {
                $captured = compact('method', 'url', 'headers', 'body');
                return [
                    'status' => 200,
                    'headers' => ['content-type' => 'application/pdf'],
                    'body' => '%PDF-1.7-fake-bytes',
                ];
            }
        );

        $pdf = $client->renderPdf([
            'html' => '<h1 class="text-2xl font-bold">Invoice</h1>',
            'format' => 'A4',
        ]);

        self::assertSame('%PDF-1.7-fake-bytes', $pdf);
        self::assertSame('POST', $captured['method']);
        self::assertSame('https://tailprint.com/v1/render/pdf', $captured['url']);
        self::assertSame('Bearer sec_live_test_123', $captured['headers']['Authorization']);
    }

    public function testFluentHostedTemplateBuilder(): void
    {
        $capturedPayload = [];
        $client = new TailprintClient(
            apiKey: 'sec_live_test_123',
            transport: function (string $method, string $url, array $headers, ?string $body) use (&$capturedPayload): array {
                $capturedPayload = json_decode((string) $body, true);
                return [
                    'status' => 200,
                    'headers' => ['content-type' => 'application/pdf'],
                    'body' => '%PDF-1.7-invoice-modern',
                ];
            }
        );

        $bytes = $client
            ->template('invoice-modern', [
                'invoice_number' => 'INV-2026-001',
                'issue_date' => '2026-11-13',
                'seller' => ['name' => 'Tailprint ApS'],
                'buyer' => ['name' => 'Acme GmbH'],
                'items' => [['description' => 'Pro Plan', 'quantity' => 1, 'unit_price' => 49]],
            ])
            ->format('A4')
            ->smartPagination()
            ->bytes();

        self::assertSame('%PDF-1.7-invoice-modern', $bytes);
        self::assertSame('invoice-modern', $capturedPayload['template_id']);
        self::assertSame('INV-2026-001', $capturedPayload['data']['invoice_number']);
        self::assertSame('A4', $capturedPayload['format']);
        self::assertTrue($capturedPayload['smart_pagination']);
    }

    public function testListAndGetTemplates(): void
    {
        $client = new TailprintClient(
            apiKey: 'sec_live_test_123',
            transport: function (string $method, string $url): array {
                if ($url === 'https://tailprint.com/v1/templates') {
                    return [
                        'status' => 200,
                        'headers' => ['content-type' => 'application/json'],
                        'body' => json_encode([
                            'success' => true,
                            'count' => 1,
                            'templates' => [['id' => 'invoice-modern', 'name' => 'Modern Invoice']],
                        ]),
                    ];
                }
                return [
                    'status' => 200,
                    'headers' => ['content-type' => 'application/json'],
                    'body' => json_encode([
                        'success' => true,
                        'template' => ['id' => 'invoice-modern', 'example_data' => ['invoice_number' => 'INV-1']],
                    ]),
                ];
            }
        );

        $list = $client->listTemplates();
        self::assertCount(1, $list);
        self::assertSame('invoice-modern', $list[0]['id']);

        $detail = $client->getTemplate('invoice-modern');
        self::assertSame('invoice-modern', $detail['template']['id']);
    }

    public function testThrowsValidationExceptionOn400(): void
    {
        $client = new TailprintClient(
            apiKey: 'sec_live_test_123',
            transport: fn (): array => [
                'status' => 400,
                'headers' => ['content-type' => 'application/json'],
                'body' => json_encode([
                    'error' => 'Bad Request',
                    'message' => "Invalid data for template 'invoice-modern': seller.name: Required",
                    'issues' => [['field' => 'seller.name', 'message' => 'Required']],
                ]),
            ]
        );

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage("Invalid data for template 'invoice-modern': seller.name: Required");

        $client->renderTemplate('invoice-modern', ['invoice_number' => 'INV-1']);
    }

    public function testThrowsAuthenticationExceptionOn401(): void
    {
        $client = new TailprintClient(
            apiKey: 'invalid_key',
            transport: fn (): array => [
                'status' => 401,
                'headers' => ['content-type' => 'application/json'],
                'body' => json_encode(['message' => 'Invalid API Key']),
            ]
        );

        $this->expectException(AuthenticationException::class);
        $client->renderPdf(['html' => '<h1>Test</h1>']);
    }

    public function testVerifyWebhookSignature(): void
    {
        $payload = '{"job_id":"job_123","status":"completed"}';
        $secret = 'whsec_test_secret';
        $sig = 'sha256=' . hash_hmac('sha256', $payload, $secret);

        self::assertTrue(TailprintClient::verifyWebhookSignature($payload, $sig, $secret));
        self::assertFalse(TailprintClient::verifyWebhookSignature($payload, 'sha256=deadbeef', $secret));
    }
}
