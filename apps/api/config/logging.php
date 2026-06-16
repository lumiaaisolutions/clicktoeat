<?php

use Monolog\Handler\NullHandler;
use Monolog\Handler\StreamHandler;
use Monolog\Processor\PsrLogMessageProcessor;

return [
    'default' => env('LOG_CHANNEL', 'stack'),
    'deprecations' => [
        'channel' => env('LOG_DEPRECATIONS_CHANNEL', 'null'),
        'trace'   => env('LOG_DEPRECATIONS_TRACE', false),
    ],
    'channels' => [
        'stack' => [
            'driver'           => 'stack',
            'channels'         => explode(',', (string) env('LOG_STACK', 'single')),
            'ignore_exceptions' => false,
        ],
        'single' => [
            'driver' => 'single',
            'path'   => storage_path('logs/laravel.log'),
            'level'  => env('LOG_LEVEL', 'debug'),
            'replace_placeholders' => true,
            // Formatter JSON cuando LOG_JSON=true — útil para shipear a
            // Sentry/Loki/Datadog. Si está vacío, usa el formato por defecto.
            'formatter' => env('LOG_JSON') ? \Monolog\Formatter\JsonFormatter::class : null,
        ],
        'daily' => [
            'driver' => 'daily',
            'path'   => storage_path('logs/laravel.log'),
            'level'  => env('LOG_LEVEL', 'debug'),
            'days'   => 14,
            'replace_placeholders' => true,
            'formatter' => env('LOG_JSON') ? \Monolog\Formatter\JsonFormatter::class : null,
        ],
        // Canal dedicado JSON — útil cuando quieres mantener single en texto
        // y enviar a un agente shipper aparte. Activar con LOG_STACK=single,jsonlog
        'jsonlog' => [
            'driver'    => 'daily',
            'path'      => storage_path('logs/json.log'),
            'level'     => env('LOG_LEVEL', 'info'),
            'days'      => 14,
            'formatter' => \Monolog\Formatter\JsonFormatter::class,
        ],
        'stderr' => [
            'driver'  => 'monolog',
            'level'   => env('LOG_LEVEL', 'debug'),
            'handler' => StreamHandler::class,
            'formatter' => env('LOG_STDERR_FORMATTER'),
            'with' => ['stream' => 'php://stderr'],
            'processors' => [PsrLogMessageProcessor::class],
        ],
        'null' => [
            'driver'  => 'monolog',
            'handler' => NullHandler::class,
        ],
    ],
];
