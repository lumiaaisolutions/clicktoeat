import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

// SEV-9 — scrubber compartido. El runtime edge tiene menos surface, pero
// igual queremos garantizar no enviar Authorization/Cookie.
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
  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}
