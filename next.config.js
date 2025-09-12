/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
  async rewrites() {
    // Only add rewrites if Supabase URL is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('TODO')) {
      return [];
    }
    
    return [
      {
        source: '/api/img',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/img-proxy`,
      },
      {
        source: '/api/ics/:id',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ics/:id`,
      },
      {
        source: '/og/event',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/og-event`,
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = nextConfig;