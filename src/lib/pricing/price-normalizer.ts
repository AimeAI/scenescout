/**
 * Price normalization for SceneScout - Engagement-First Pricing Strategy
 *
 * STRICT RULES (Phase 1):
 * 1. Provider-native fields ONLY - no text parsing for dollar amounts
 * 2. FREE only if provider says is_free === true OR price_min === 0
 * 3. Show exact prices ($X or $X-$Y) ONLY when provider gives structured data
 * 4. Otherwise → fallback CTA label (controlled by NEXT_PUBLIC_PRICE_FALLBACK_LABEL)
 * 5. Currency from provider only - no defaults
 */

export interface NormalizedPrice {
  // Display layer
  label: string
  displayType: 'free' | 'exact' | 'range' | 'cta'

  // Data layer (only when provider-native)
  min?: number
  max?: number
  currency?: string  // Only if provider supplies it

  // Trust signals
  source: 'provider' | 'unknown'
  isTrusted: boolean

  // Classification
  isFree: boolean
  isPaid: boolean
  isUnknown: boolean

  // Badge configuration for UI
  badge: {
    variant: 'free' | 'verified' | 'generic'
    color: 'green' | 'blue' | 'purple'
    size: 'sm' | 'md' | 'lg'
  }
}

/**
 * Normalize event pricing using STRICT provider-only rules
 *
 * @param event - Event object with optional price fields
 * @returns Normalized price structure
 */
export function normalizePrice(event: any): NormalizedPrice {
  // Handle null/undefined event
  if (!event || typeof event !== 'object') {
    return {
      label: 'CTA',
      displayType: 'cta',
      currency: undefined,
      source: 'unknown',
      isTrusted: false,
      isFree: false,
      isPaid: true,
      isUnknown: true,
      badge: {
        variant: 'generic',
        color: 'purple',
        size: 'sm'
      }
    }
  }

  // Check if we have ANY provider-supplied price data
  const hasProviderPrice =
    typeof event.price_min === 'number' ||
    typeof event.price_max === 'number' ||
    typeof event.price === 'number' ||
    event.is_free === true

  // CASE 1: Provider says it's FREE
  if (hasProviderPrice && (event.is_free === true || event.price_min === 0)) {
    return {
      label: 'FREE',
      displayType: 'free',
      min: 0,
      max: 0,
      currency: event.price_currency || undefined,  // Only if provider supplies
      source: 'provider',
      isTrusted: true,
      isFree: true,
      isPaid: false,
      isUnknown: false,
      badge: {
        variant: 'free',
        color: 'green',
        size: 'lg'  // FREE badges are prominent
      }
    }
  }

  // CASE 2: Provider gives structured price data
  if (hasProviderPrice) {
    const min = event.price_min ?? event.price
    const max = event.price_max ?? event.price

    // Validate we have numeric data
    if (typeof min === 'number' && min > 0) {
      const currency = event.price_currency || undefined

      // Price range
      if (typeof max === 'number' && max > min) {
        return {
          label: `$${min}-${max}`,
          displayType: 'range',
          min,
          max,
          currency,
          source: 'provider',
          isTrusted: true,
          isFree: false,
          isPaid: true,
          isUnknown: false,
          badge: {
            variant: 'verified',
            color: 'blue',
            size: 'md'
          }
        }
      }

      // Exact price
      return {
        label: `$${min}`,
        displayType: 'exact',
        min,
        max: min,
        currency,
        source: 'provider',
        isTrusted: true,
        isFree: false,
        isPaid: true,
        isUnknown: false,
        badge: {
          variant: 'verified',
          color: 'blue',
          size: 'md'
        }
      }
    }
  }

  // CASE 3: No provider data → CTA fallback
  // Label is controlled by PriceBadge component via NEXT_PUBLIC_PRICE_FALLBACK_LABEL
  return {
    label: 'CTA',  // Placeholder - PriceBadge will use env flag
    displayType: 'cta',
    currency: undefined,  // No currency without provider data
    source: 'unknown',
    isTrusted: false,
    isFree: false,
    isPaid: true,  // Assume paid when unknown
    isUnknown: true,
    badge: {
      variant: 'generic',
      color: 'purple',
      size: 'sm'
    }
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use normalizePrice() instead
 */
export function getLegacyPriceLabel(event: any): string {
  if (!event.price_min || event.price_min === 0) {
    return 'FREE'
  }
  return `$${Math.round(event.price_min)}`
}
