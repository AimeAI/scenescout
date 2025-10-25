'use client'

import { cn } from '@/lib/utils'

interface EventCardSkeletonProps {
  className?: string
}

export function EventCardSkeleton({ className }: EventCardSkeletonProps = {}) {
  return (
    <div className={cn("bg-gray-800 rounded-lg overflow-hidden", className)} role="status" aria-label="Loading event">
      {/* Image skeleton */}
      <div className="relative h-40 bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse" />

      {/* Event Info */}
      <div className="p-3 space-y-2">
        {/* Title skeleton */}
        <div className="h-4 bg-gray-700 rounded animate-pulse w-4/5" />
        <div className="h-4 bg-gray-700 rounded animate-pulse w-3/5" />

        {/* Venue skeleton */}
        <div className="h-3 bg-gray-700/70 rounded animate-pulse w-2/3" />

        {/* Price and time skeleton */}
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 bg-gray-700/70 rounded animate-pulse w-16" />
          <div className="h-4 bg-gray-700/70 rounded animate-pulse w-12" />
        </div>
      </div>
    </div>
  )
}

export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}
