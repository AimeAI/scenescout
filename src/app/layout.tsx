import './globals.css'
import { Inter } from 'next/font/google'
import { Metadata, Viewport } from 'next'
import { QueryProvider } from '@/providers/QueryProvider'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { NotificationTestButton } from '@/components/NotificationTestButton'
import { Toaster } from 'react-hot-toast'

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
        <Toaster
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
        />
      </body>
    </html>
  )
}