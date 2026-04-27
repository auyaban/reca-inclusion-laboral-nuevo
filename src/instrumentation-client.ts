import * as Sentry from "@sentry/nextjs";
import { filterKnownClientSentryNoiseEvent } from "@/lib/observability/sentryNoiseFilter";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: true,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration(),
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  enableLogs: true,
  beforeSend(event) {
    return filterKnownClientSentryNoiseEvent(event);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
