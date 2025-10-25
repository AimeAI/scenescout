'use client'

import { cn } from '@/lib/utils'

interface EventListItemSkeletonProps {
  className?: string
}

export function EventListItemSkeleton({ className }: EventListItemSkeletonProps = {}) {
  return (
    <div className={cn("bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 flex gap-4", className)} role="status" aria-label="Loading event">
      {/* Image skeleton */}
      <div className="w-28 h-28 bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse flex-shrink-0" />

      <div className="flex-1 space-y-3">
        {/* Title */}
        <div className="h-5 bg-gray-700 rounded animate-pulse w-3/4" />

        {/* Date and location */}
        <div className="space-y-2">
          <div className="h-3.5 bg-gray-700/70 rounded animate-pulse w-2/5" />
          <div className="h-3.5 bg-gray-700/70 rounded animate-pulse w-3/5" />
        </div>

        {/* Price */}
        <div className="h-4 bg-gray-700/70 rounded animate-pulse w-1/4" />
      </div>
    </div>
  )
}

export function EventListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventListItemSkeleton key={i} />
      ))}
    </div>
  )
}
