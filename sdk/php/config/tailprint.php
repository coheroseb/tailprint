<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Tailprint API Key
    |--------------------------------------------------------------------------
    |
    | Your Tailprint secret API key (e.g. "sec_live_..."). Get 100 free renders
    | per month at https://tailprint.com.
    |
    */
    'api_key' => env('TAILPRINT_API_KEY', ''),

    /*
    |--------------------------------------------------------------------------
    | Tailprint Base URL
    |--------------------------------------------------------------------------
    |
    | The base URL of the Tailprint API. Override only if you run a dedicated
    | self-hosted Tailprint cluster.
    |
    */
    'base_url' => env('TAILPRINT_BASE_URL', 'https://tailprint.com'),

    /*
    |--------------------------------------------------------------------------
    | Request Timeout (Seconds)
    |--------------------------------------------------------------------------
    |
    | Maximum time in seconds to wait for synchronous PDF rendering operations.
    |
    */
    'timeout' => (int) env('TAILPRINT_TIMEOUT', 30),
];
