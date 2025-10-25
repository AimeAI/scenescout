'use client'

import { cn } from '@/lib/utils'

interface SwipeCardSkeletonProps {
  className?: string
}

export function SwipeCardSkeleton({ className }: SwipeCardSkeletonProps = {}) {
  return (
    <div className={cn("absolute top-0 left-0 w-full h-full", className)} role="status" aria-label="Loading event">
      <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl h-full flex flex-col">
        {/* Image skeleton */}
        <div className="flex-1 relative bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
        </div>

        {/* Content skeleton */}
        <div className="p-6 space-y-4 bg-gray-900">
          {/* Title */}
          <div className="h-8 bg-gray-800 rounded animate-pulse w-5/6" />

          {/* Date and venue */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-800/70 rounded animate-pulse w-3/5" />
            <div className="h-4 bg-gray-800/70 rounded animate-pulse w-4/5" />
          </div>

          {/* Price */}
          <div className="h-6 bg-gray-800/70 rounded animate-pulse w-2/5" />

          {/* Description */}
          <div className="space-y-2 pt-2">
            <div className="h-3.5 bg-gray-800/50 rounded animate-pulse w-full" />
            <div className="h-3.5 bg-gray-800/50 rounded animate-pulse w-11/12" />
            <div className="h-3.5 bg-gray-800/50 rounded animate-pulse w-4/5" />
          </div>
        </div>
      </div>
    </div>
  )
}
