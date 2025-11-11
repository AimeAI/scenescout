'use client'

import { Toaster } from 'react-hot-toast'

export function ToasterProvider() {
  return (
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
  )
}
