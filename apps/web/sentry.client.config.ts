import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// SEV-9 — redactar PII en mensajes (email, teléfono) y limpiar headers
// sensibles antes de enviar a Sentry.
function scrubEvent(event: Sentry.ErrorEvent | Sentry.TransactionEvent) {
  const headers = event.request?.headers as Record<string, string> | undefined;
  if (headers) {
    delete headers.Authorization;
    delete headers.authorization;
    delete headers.Cookie;
    delete headers.cookie;
  }
  if (event.request && 'data' in event.request) {
    delete (event.request as { data?: unknown }).data;
  }
  if (event.message) {
    event.message = event.message
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
      .replace(/\+?\d[\d\s().-]{7,}\d/g, '<phone>');
  }
  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'development',
    tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    sendDefaultPii: false,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: true,
        networkDetailAllowUrls: [],
      }),
    ],
    beforeSend: scrubEvent,
  });
}
