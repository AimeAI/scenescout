import { Footer } from '@/components/layout/Footer'

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
