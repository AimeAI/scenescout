import * as Sentry from "@sentry/react";

export const initSentry = () => {
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
      tracesSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
