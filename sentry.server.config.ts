import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Set environment
  environment: process.env.NODE_ENV,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Integrations
  integrations: [
    Sentry.httpIntegration({
      tracing: true,
    }),
    Sentry.extraErrorDataIntegration({
      depth: 5,
    }),
  ],

  // Performance Monitoring
  beforeSend(event, hint) {
    // Sanitize sensitive data
    if (event.request) {
      delete event.request.cookies;

      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      // Sanitize query parameters that might contain sensitive data
      if (event.request.query_string) {
        const sensitiveParams = ['token', 'api_key', 'password', 'secret'];
        let queryString = event.request.query_string;

        sensitiveParams.forEach(param => {
          const regex = new RegExp(`(${param}=)[^&]*`, 'gi');
          queryString = queryString.replace(regex, '$1[REDACTED]');
        });

        event.request.query_string = queryString;
      }
    }

    // Sanitize environment variables
    if (event.contexts?.runtime?.env) {
      const sensitiveKeys = ['DATABASE_URL', 'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD'];
      Object.keys(event.contexts.runtime.env).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.includes(sensitive))) {
          event.contexts.runtime.env[key] = '[REDACTED]';
        }
      });
    }

    return event;
  },

  // Add custom tags
  initialScope: {
    tags: {
      runtime: 'server',
    },
  },

  // Ignore specific errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],

  // Enable debug mode in development
  debug: process.env.NODE_ENV === "development",
});
