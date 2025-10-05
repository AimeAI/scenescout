import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata, Viewport } from 'next'
import { QueryProvider } from '@/providers/QueryProvider'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { NotificationTestButton } from '@/components/NotificationTestButton'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SceneScout - Discover Urban Culture & Events',
  description: 'Discover the best events, venues, and cultural experiences in cities worldwide with our Netflix-style interface.',
  keywords: ['events', 'culture', 'cities', 'venues', 'nightlife', 'entertainment', 'streaming', 'discovery'],
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
        <ServiceWorkerRegistration />
        <QueryProvider>
          {children}
        </QueryProvider>
        {process.env.NODE_ENV === 'development' && <NotificationTestButton />}
      </body>
    </html>
  )
}