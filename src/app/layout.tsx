import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata, Viewport } from 'next'
import { QueryProvider } from '@/providers/QueryProvider'
import { PostHogProvider } from '@/providers/PostHogProvider'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { NotificationTestButton } from '@/components/NotificationTestButton'
// import { Toaster } from 'react-hot-toast'
import { ErrorBoundary } from '@/components/error-boundary'
import { Suspense } from 'react'
import { ClientProviders } from '@/components/ClientProviders'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Use font-display: swap for better performance
  preload: true,
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://scenescout.app'),
  title: {
    default: 'SceneScout - Discover Toronto Events, Concerts & Nightlife',
    template: '%s | SceneScout'
  },
  description: 'Discover the best events, concerts, comedy shows, art exhibitions, and nightlife in Toronto. Netflix-style event discovery with personalized recommendations.',
  keywords: [
    'toronto events',
    'concerts toronto',
    'comedy shows toronto',
    'nightlife toronto',
    'things to do toronto',
    'live music toronto',
    'art exhibitions toronto',
    'event discovery',
    'toronto entertainment',
    'event recommendations'
  ],
  authors: [{ name: 'SceneScout' }],
  creator: 'SceneScout',
  publisher: 'SceneScout',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_CA',
    url: '/',
    siteName: 'SceneScout',
    title: 'SceneScout - Discover Toronto Events & Nightlife',
    description: 'Find concerts, comedy shows, art exhibitions, and more happening in Toronto tonight',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SceneScout - Toronto Event Discovery',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SceneScout - Discover Toronto Events',
    description: 'Find concerts, comedy shows, art exhibitions, and more',
    images: ['/twitter-image.png'],
    creator: '@scenescout',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SceneScout',
    startupImage: [
      {
        url: '/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px)',
      },
    ],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
  alternates: {
    canonical: '/',
  },
  category: 'entertainment',
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} bg-black text-white antialiased`}>
        <PostHogProvider>
          <ServiceWorkerRegistration />
          <ErrorBoundary>
            <QueryProvider>
              {children}
              {/* <Toaster
                position="bottom-right"
                toastOptions={{
                  // Default options
                  duration: 3000,
                  style: {
                    background: '#1f2937',
                    color: '#fff',
                    borderRadius: '12px',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    boxShadow: '0 10px 40px rgba(139, 92, 246, 0.3)',
                  },
                  // Success toasts (purple gradient)
                  success: {
                    iconTheme: {
                      primary: '#a855f7',
                      secondary: '#fff',
                    },
                    style: {
                      background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                    },
                  },
                }}
              /> */}
            </QueryProvider>
          </ErrorBoundary>
          <ClientProviders />
          {process.env.NODE_ENV === 'development' && <NotificationTestButton />}
        </PostHogProvider>
      </body>
    </html>
  )
}