/**
 * Next.js Instrumentation
 *
 * This file runs before the application starts and is used to initialize
 * monitoring and observability tools like Sentry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  err: Error & { digest?: string },
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | undefined };
  }
) => {
  // Only import Sentry in Node.js runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const Sentry = await import('@sentry/nextjs');

    Sentry.captureException(err, {
      contexts: {
        request: {
          url: request.path,
          method: request.method,
          headers: {
            // Don't send sensitive headers
            'user-agent': request.headers['user-agent'],
            'accept-language': request.headers['accept-language'],
          },
        },
      },
      tags: {
        runtime: 'nodejs',
        error_type: 'request_error',
      },
    });
  }
};
