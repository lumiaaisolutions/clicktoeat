# Runbook — Integrar Sentry (error reporting)

> Hoy ningún error de prod se reporta. Si la API crashea a las 3 AM, nadie se entera hasta que un cliente se queja. Sentry resuelve esto.

## Por qué Sentry

- **Stacktraces** completos con file/line + frames anteriores.
- **Agrupación** automática de errores idénticos.
- **Alertas** por email / Slack cuando algo nuevo aparece.
- **Tier gratis suficiente** para ClickToEat (~5k errores/mes).
- Funciona con Laravel y Next.js (cubre todo el stack).
- Alternativas evaluadas y descartadas: Bugsnag (más caro, sin tier libre razonable), Rollbar (UI menos pulida), self-hosted GlitchTip (overhead operativo no justificado).

## Pre-requisitos

- Cuenta gratis en https://sentry.io (link "Sign up").
- Crear **dos proyectos** dentro de la organización:
  - `clicktoeat-api` (platform: Laravel)
  - `clicktoeat-web` (platform: Next.js)
- De cada proyecto se obtiene un **DSN** (URL larga `https://<pubkey>@oXXXX.ingest.sentry.io/YYYY`).

## Backend (Laravel)

### 1. Instalar el paquete

```bash
ssh -i ~/.ssh/hostinger_clicktoeat -p 65002 u221820910@86.38.202.72
cd /home/u221820910/domains/clicktoeat-api.lumiaaisolutions.com/public_html
composer require sentry/sentry-laravel
```

### 2. Publicar config

```bash
php artisan sentry:publish --dsn=https://<pubkey>@oXXXX.ingest.sentry.io/YYYY
```

Esto agrega al `.env`:

```env
SENTRY_LARAVEL_DSN=https://<pubkey>@oXXXX.ingest.sentry.io/YYYY
SENTRY_TRACES_SAMPLE_RATE=0.1                # 10% de transacciones para performance monitoring
SENTRY_PROFILES_SAMPLE_RATE=0.0              # 0% profiling (caro)
SENTRY_SEND_DEFAULT_PII=false                # privacidad — NO enviar IP del cliente ni datos del request
```

Y publica `config/sentry.php`.

### 3. Verificar registro de exceptions

Sentry-laravel registra el handler automático vía service provider. **Verificar** que no haya conflicto con el `withExceptions(...)` de `bootstrap/app.php` — debe seguir capturando 401/422 custom, Sentry sólo recibe las que NO se manejaron.

Si quieres explicitar:

```php
->withExceptions(function (Exceptions $exceptions) {
    // ... handlers existentes ...

    // Sentry — captura cualquier exception no manejada arriba
    $exceptions->report(function (\Throwable $e) {
        if (app()->bound('sentry')) {
            app('sentry')->captureException($e);
        }
    });
})
```

### 4. Test de integración

```bash
php artisan sentry:test
```

Debería aparecer un error nuevo en el dashboard de Sentry en < 30 segundos.

### 5. Configurar scrubbers (privacidad)

`config/sentry.php` ya viene con redaction de campos comunes. Agregar específicos del proyecto:

```php
'before_send' => function (\Sentry\Event $event): ?\Sentry\Event {
    $request = $event->getRequest();

    // Redactar headers sensibles
    if (isset($request['headers']['Authorization'])) {
        $request['headers']['Authorization'] = '[Redacted]';
    }

    // Redactar campos de body que contengan PII
    foreach (['password', 'password_confirmation', 'current_password',
              'cliente_telefono', 'cliente_direccion'] as $field) {
        if (isset($request['data'][$field])) {
            $request['data'][$field] = '[Redacted]';
        }
    }

    $event->setRequest($request);
    return $event;
},
```

## Frontend (Next.js)

### 1. Instalar el SDK

```bash
cd apps/web
npm install @sentry/nextjs
```

### 2. Setup wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

Te pide:
- DSN del proyecto `clicktoeat-web`.
- Auth token (lo da Sentry — se usa sólo para upload de sourcemaps).
- Genera: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.mjs` envuelto en `withSentryConfig(...)`.

### 3. Variables en `.env.production`

El wizard pone los DSN en `.env.local`. Para prod, agregar a `apps/web/.env.production`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://<pubkey>@oXXXX.ingest.sentry.io/YYYY
SENTRY_ORG=lumiaaisolutions
SENTRY_PROJECT=clicktoeat-web
SENTRY_AUTH_TOKEN=<token-de-build-time>      # NO commitear — set en CI / hPanel env
```

`SENTRY_AUTH_TOKEN` sólo se usa en build (upload de sourcemaps). No va al cliente.

### 4. Scrubbers de PII en cliente

`sentry.client.config.ts`:

```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,            // session replays caros — desactivado
  replaysOnErrorSampleRate: 1.0,          // sólo cuando hay error
  beforeSend(event) {
    // No mandar tokens del localStorage
    if (event.contexts?.['app']) {
      delete event.contexts['app']['app_local_storage'];
    }
    return event;
  },
});
```

## Configurar alertas

Sentry → Project → **Alerts** → **Create Alert**:

| Condición | Acción |
|-----------|--------|
| Issue nueva (primera vez vista) | Slack `#alertas-clicktoeat` + email on-call |
| Issue regression (volvió tras resolver) | Slack + email |
| > 100 errores/h del mismo tipo | Slack + email |
| Performance: p95 > 3s en `/public/menu/{slug}` | Email semanal (no urgente) |

## CI integration

GitHub Actions: cuando se hace release, se debe subir el sourcemap del frontend para que Sentry resuelva stack-traces minificados.

Workflow extra (`.github/workflows/sentry-release.yml`) — pendiente, escribir cuando el deploy esté automatizado.

## Costo

- **Tier gratis**: 5k errors/mes, 10k performance units/mes, 50 replays. Suficiente para ClickToEat inicialmente.
- **Team plan**: $26/mes — 50k errors. Considerar cuando el volumen crezca.
- **Trace sampling al 10%** mantiene volume bajo en performance.

## Después de instalar — checklist

- [ ] DSN en `apps/api/.env` productivo (NO commiteado).
- [ ] DSN en `apps/web/.env.production` (committable — es `NEXT_PUBLIC_`).
- [ ] Test `php artisan sentry:test` recibido en dashboard.
- [ ] Test JS: tirar un error en una página → ver en dashboard.
- [ ] Alertas configuradas a Slack del equipo.
- [ ] Scrubbers de PII activos (verificar enviando un error con `cliente_telefono` y ver que llega como `[Redacted]`).
- [ ] Actualizar `docs/security/threat-model.md` — vector #15 "Logs con PII" se mitiga parcialmente.
- [ ] Actualizar `docs/issues/devops-faltante.md` — marcar Sentry como ✅.

## Limitación a recordar

Si la app **muere** (PHP crash sin chance de ejecutar el handler), Sentry no captura. Para eso → UptimeRobot externo + healthcheck a `/up`. Ver [`infra/deploy-hostinger.md`](../infra/deploy-hostinger.md#monitoreo-externo-recomendado-uptimerobot-u-otro).
