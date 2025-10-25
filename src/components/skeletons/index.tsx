'use client'

// Export all skeleton components from a centralized location
export { EventCardSkeleton, EventCardSkeletonGrid } from './EventCardSkeleton'
export { NetflixCarouselSkeleton, NetflixEventCardSkeleton, NetflixCarouselSkeletonList } from './NetflixCarouselSkeleton'
export { EventListItemSkeleton, EventListSkeleton } from './EventListSkeleton'
export { SwipeCardSkeleton } from './SwipeCardSkeleton'
export { EventDetailSkeleton } from './EventDetailSkeleton'

// Re-export with semantic names for common use cases
export { EventCardSkeletonGrid as SearchResultsSkeleton } from './EventCardSkeleton'
export { NetflixCarouselSkeletonList as DiscoveryPageSkeleton } from './NetflixCarouselSkeleton'
export { NetflixCarouselSkeleton as CategoryRailSkeleton } from './NetflixCarouselSkeleton'
