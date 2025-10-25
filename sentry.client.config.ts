import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay
  replaysSessionSampleRate: 0.01, // 1% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
  ],

  // Performance Monitoring - Web Vitals
  beforeSend(event, hint) {
    // Filter out known browser extension errors
    const error = hint.originalException;
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      if (
        error.message.includes('chrome-extension://') ||
        error.message.includes('moz-extension://') ||
        error.message.includes('safari-extension://')
      ) {
        return null;
      }
    }

    // Sanitize sensitive data
    if (event.request) {
      delete event.request.cookies;

      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
    }

    return event;
  },

  // Add custom tags
  initialScope: {
    tags: {
      runtime: 'client',
    },
  },

  // Ignore specific errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension',
    'moz-extension',
    'safari-extension',
    // Network errors that are expected
    'Network request failed',
    'NetworkError',
    // Common browser issues
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  // Denyurls - ignore errors from these URLs
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
  ],

  // Enable debug mode only when explicitly requested
  debug: false, // Set to true only for debugging Sentry itself
});
