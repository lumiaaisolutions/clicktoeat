<?php

return [
    /*
     * Disk por default usado por Storage::disk() sin argumento.
     * - 'public' = filesystem local (default histórico, sigue funcionando).
     * - 's3'     = object storage S3-compatible (R2, B2, AWS S3) — requiere instalar
     *              league/flysystem-aws-s3-v3 y configurar S3_* en .env.
     */
    'default' => env('FILESYSTEM_DISK', 'public'),

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root'   => storage_path('app/private'),
            'serve'  => true,
            'throw'  => false,
        ],

        'public' => [
            'driver'     => 'local',
            'root'       => public_path('storage'),
            'url'        => env('APP_URL', 'http://localhost').'/storage',
            'visibility' => 'public',
            'throw'      => false,
        ],

        /*
         * S3-compatible (R2 / B2 / AWS S3). Configurar en .env:
         *
         *   FILESYSTEM_DISK=s3
         *   S3_ACCESS_KEY=<key>
         *   S3_SECRET_KEY=<secret>
         *   S3_REGION=auto                   # R2: "auto" · B2: "us-west-002" etc · AWS: "us-east-1"
         *   S3_BUCKET=clicktoeat-uploads
         *   S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
         *   S3_PUBLIC_URL=https://uploads.clicktoeat.lumiaaisolutions.com
         *   S3_PATH_STYLE=false              # R2: false · B2: true
         *
         * Ver: docs/runbook/migrar-uploads-a-s3-b2.md
         */
        's3' => [
            'driver'                  => 's3',
            'key'                     => env('S3_ACCESS_KEY'),
            'secret'                  => env('S3_SECRET_KEY'),
            'region'                  => env('S3_REGION', 'auto'),
            'bucket'                  => env('S3_BUCKET'),
            'endpoint'                => env('S3_ENDPOINT'),
            'use_path_style_endpoint' => (bool) env('S3_PATH_STYLE', false),
            'url'                     => env('S3_PUBLIC_URL'),
            'visibility'              => 'public',
            'throw'                   => false,
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],
];
