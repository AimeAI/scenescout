import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Add custom tags
  initialScope: {
    tags: {
      runtime: 'edge',
    },
  },

  // Performance Monitoring
  beforeSend(event, hint) {
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

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
});
