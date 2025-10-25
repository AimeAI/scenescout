'use client'

import { cn } from '@/lib/utils'

interface NetflixCarouselSkeletonProps {
  className?: string
  cardCount?: number
}

export function NetflixCarouselSkeleton({ className, cardCount = 6 }: NetflixCarouselSkeletonProps = {}) {
  return (
    <div className={cn("space-y-3 mb-8", className)} role="status" aria-label="Loading category">
      {/* Category title skeleton */}
      <div className="px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-7 bg-gray-800 rounded animate-pulse w-48" />
        </div>
        <div className="h-5 bg-gray-800/70 rounded animate-pulse w-16" />
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Scrollable Content */}
        <div className="overflow-hidden">
          <div className="flex space-x-4 px-6 lg:px-12 py-2">
            {Array.from({ length: cardCount }).map((_, i) => (
              <NetflixEventCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Gradient Fade Edges */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent pointer-events-none z-5" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent pointer-events-none z-5" />
      </div>
    </div>
  )
}

export function NetflixEventCardSkeleton({ className }: { className?: string } = {}) {
  return (
    <div className={cn("flex-shrink-0 w-64 h-36 aspect-video bg-gray-900 rounded-lg overflow-hidden relative", className)}>
      {/* Background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Category Badge Skeleton */}
      <div className="absolute top-3 left-3">
        <div className="h-5 w-16 bg-black/60 rounded-full animate-pulse" />
      </div>

      {/* Content Skeleton */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        <div className="space-y-1">
          {/* Title */}
          <div className="h-4 bg-white/20 rounded animate-pulse w-4/5" />

          {/* Metadata */}
          <div className="flex items-center space-x-3">
            <div className="h-3 bg-white/15 rounded animate-pulse w-20" />
            <div className="h-3 bg-white/15 rounded animate-pulse w-16" />
            <div className="h-3 bg-white/15 rounded animate-pulse w-12" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function NetflixCarouselSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-8">
      {Array.from({ length: count }).map((_, i) => (
        <NetflixCarouselSkeleton key={i} />
      ))}
    </div>
  )
}
