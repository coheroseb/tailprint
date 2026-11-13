<?php

declare(strict_types=1);

namespace Tailprint\Laravel;

use Illuminate\Support\ServiceProvider;
use Tailprint\TailprintClient;

/**
 * Laravel ServiceProvider for Tailprint.
 * Auto-discovered via composer.json `extra.laravel.providers`.
 */
class TailprintServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../../config/tailprint.php', 'tailprint');

        $this->app->singleton(TailprintClient::class, function ($app): TailprintClient {
            /** @var array<string, mixed> $config */
            $config = $app['config']->get('tailprint', []);

            return new TailprintClient(
                apiKey: isset($config['api_key']) ? (string) $config['api_key'] : null,
                baseUrl: isset($config['base_url']) ? (string) $config['base_url'] : 'https://tailprint.com',
                timeout: isset($config['timeout']) ? (float) $config['timeout'] : 30.0
            );
        });

        $this->app->alias(TailprintClient::class, 'tailprint');
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../../config/tailprint.php' => $this->app->configPath('tailprint.php'),
            ], 'tailprint-config');
        }
    }
}
