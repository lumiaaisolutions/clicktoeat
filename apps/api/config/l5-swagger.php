<?php

return [
    'default' => 'default',

    'documentations' => [
        'default' => [
            'api' => [
                'title' => 'ClickEat API',
            ],
            'routes' => [
                'api' => 'api/documentation',
            ],
            'paths' => [
                'use_absolute_path'     => true,
                'docs_json'             => 'api-docs.json',
                'docs_yaml'             => 'api-docs.yaml',
                'format_to_use_for_docs' => env('L5_FORMAT_TO_USE_FOR_DOCS', 'json'),
                'annotations' => [
                    base_path('app'),
                ],
            ],
        ],
    ],

    'defaults' => [
        'routes' => [
            'docs'     => 'docs',
            'oauth2_callback' => 'api/oauth2-callback',
            'middleware' => [
                'api'             => [],
                'asset'           => [],
                'docs'            => [],
                'oauth2_callback' => [],
            ],
            'group_options'      => [],
        ],

        'paths' => [
            'docs'             => storage_path('api-docs'),
            'views'            => base_path('resources/views/vendor/l5-swagger'),
            'base'             => env('L5_SWAGGER_BASE_PATH'),
            'swagger_ui_assets_path' => env('L5_SWAGGER_UI_ASSETS_PATH', 'vendor/swagger-api/swagger-ui/dist/'),
            'excludes'         => [],
        ],

        'scanOptions' => [
            'default_processors_configuration' => [],
            'analyser'  => null,
            'analysis'  => null,
            'processors' => [],
            'pattern'   => null,
            'exclude'   => [],
            'open_api_spec_version' => env('L5_SWAGGER_OPEN_API_SPEC_VERSION', '3.0.0'),
        ],

        'securityDefinitions' => [
            'securitySchemes' => [
                'sanctum' => [
                    'type'         => 'http',
                    'description'  => 'Pass the Sanctum bearer token returned by /auth/login.',
                    'scheme'       => 'bearer',
                    'bearerFormat' => 'JWT',
                ],
            ],
            'security' => [
                ['sanctum' => []],
            ],
        ],

        'generate_always'      => env('L5_SWAGGER_GENERATE_ALWAYS', false),
        'generate_yaml_copy'   => env('L5_SWAGGER_GENERATE_YAML_COPY', false),
        'proxy'                => false,
        'additional_config_url' => null,
        'operations_sort'      => env('L5_SWAGGER_OPERATIONS_SORT', null),
        'validator_url'        => null,
        'ui' => [
            'display' => [
                'doc_expansion' => env('L5_SWAGGER_UI_DOC_EXPANSION', 'list'),
                'filter'        => env('L5_SWAGGER_UI_FILTERS', true),
            ],
            'authorization' => [
                'persist_authorization' => env('L5_SWAGGER_UI_PERSIST_AUTHORIZATION', false),
            ],
        ],
        'constants' => [
            'L5_SWAGGER_CONST_HOST' => env('L5_SWAGGER_CONST_HOST', 'http://localhost:8080/api/v1'),
        ],
    ],
];
