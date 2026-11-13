<?php

declare(strict_types=1);

namespace Tailprint\Exceptions;

use RuntimeException;
use Throwable;

class TailprintException extends RuntimeException
{
    public readonly int $statusCode;

    /** @var array<string, mixed>|null */
    public readonly ?array $details;

    /**
     * @param array<string, mixed>|null $details
     */
    public function __construct(
        string $message,
        int $statusCode = 0,
        ?array $details = null,
        ?Throwable $previous = null
    ) {
        parent::__construct($message, $statusCode, $previous);
        $this->statusCode = $statusCode;
        $this->details = $details;
    }
}
