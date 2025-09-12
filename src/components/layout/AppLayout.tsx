'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AppLayout({ children, className }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white relative">
      <Sidebar />
      
      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 ease-in-out",
        "lg:ml-64", // Default sidebar width
        "min-h-screen",
        className
      )}>
        <main className="relative">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout