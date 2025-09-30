'use client'

import { normalizePrice, NormalizedPrice } from '@/lib/pricing/price-normalizer'

interface PriceBadgeProps {
  event: any
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

const FALLBACK_LABELS = {
  tickets: 'Tickets Available →',
  paid: 'Paid',
  see_pricing: 'See Pricing →'
} as const

type FallbackLabelType = keyof typeof FALLBACK_LABELS

export function PriceBadge({
  event,
  size = 'md',
  showTooltip = true,
  className = ''
}: PriceBadgeProps) {
  // Check if engagement pricing is enabled
  const isEngagementPricingEnabled =
    process.env.NEXT_PUBLIC_FEATURE_ENGAGEMENT_PRICING === 'true'

  // Get fallback label from env (A/B test)
  const fallbackLabelKey = (
    process.env.NEXT_PUBLIC_PRICE_FALLBACK_LABEL || 'tickets'
  ) as FallbackLabelType
  const fallbackLabel = FALLBACK_LABELS[fallbackLabelKey] || FALLBACK_LABELS.tickets

  // Normalize price using strict provider-only rules
  const price = normalizePrice(event)

  // Legacy mode: Use raw fields directly
  if (!isEngagementPricingEnabled) {
    const isFree = !event.price_min || event.price_min === 0
    return (
      <span
        className={`text-xs font-medium px-2 py-1 rounded ${
          isFree ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
        } ${className}`}
        aria-label={isFree ? 'Free event' : `Price: $${Math.round(event.price_min)}`}
      >
        {isFree ? 'FREE' : `$${Math.round(event.price_min)}`}
      </span>
    )
  }

  // Engagement pricing mode
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const sizeClass = sizeClasses[size]

  // FREE events (only if provider says so)
  if (price.isFree) {
    const badgeElement = (
      <span
        className={`
          ${sizeClass}
          bg-green-600 text-white rounded-full font-bold
          ${size === 'lg' ? 'animate-pulse' : ''}
          ${className}
        `}
        aria-label="Free event"
        role="status"
      >
        FREE
      </span>
    )

    // Desktop tooltip
    if (showTooltip && typeof window !== 'undefined' && window.innerWidth > 768) {
      return (
        <span className="relative group">
          {badgeElement}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {price.source === 'provider' ? 'Verified free event' : 'Free admission'}
          </span>
        </span>
      )
    }

    return badgeElement
  }

  // Verified provider prices (exact or range)
  if (price.isTrusted && price.min !== undefined) {
    const priceText = price.max && price.max !== price.min
      ? `$${price.min}-${price.max}`
      : `$${price.min}`

    const tooltipText = price.source === 'provider'
      ? `Verified price${price.currency ? ` (${price.currency})` : ''}`
      : `Price from event provider`

    const badgeElement = (
      <div className={`flex items-center gap-1 ${className}`}>
        <span
          className={`
            ${sizeClass}
            bg-blue-600 text-white rounded font-medium
          `}
          aria-label={`Price: ${priceText}${price.currency ? ` ${price.currency}` : ''}`}
        >
          {priceText}
        </span>
        <svg
          className="w-3 h-3 text-green-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    )

    // Desktop tooltip
    if (showTooltip && typeof window !== 'undefined' && window.innerWidth > 768) {
      return (
        <span className="relative group">
          {badgeElement}
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {tooltipText}
          </span>
        </span>
      )
    }

    return badgeElement
  }

  // Fallback: No provider data (CTA label)
  const badgeElement = (
    <span
      className={`
        ${sizeClass}
        bg-purple-600 text-white rounded font-medium
        ${className}
      `}
      aria-label="Pricing information available on event page"
    >
      {fallbackLabel}
    </span>
  )

  // Desktop tooltip for fallback
  if (showTooltip && typeof window !== 'undefined' && window.innerWidth > 768) {
    return (
      <span className="relative group">
        {badgeElement}
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Check event page for pricing details
        </span>
      </span>
    )
  }

  return badgeElement
}
