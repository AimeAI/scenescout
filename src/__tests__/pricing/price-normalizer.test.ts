/**
 * Unit tests for price normalizer - Provider-only rules (Phase 1)
 *
 * Test Matrix:
 * 1. Provider says FREE (is_free=true or price_min=0)
 * 2. Provider gives exact price (price_min > 0, no max)
 * 3. Provider gives price range (price_min < price_max)
 * 4. No provider data → CTA fallback
 * 5. Currency handling (provider-supplied only)
 */

import { normalizePrice, NormalizedPrice } from '@/lib/pricing/price-normalizer'

describe('normalizePrice - Provider-Only Rules', () => {
  describe('FREE events', () => {
    it('should return FREE when is_free === true', () => {
      const event = {
        is_free: true,
        price_currency: 'USD'
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('FREE')
      expect(result.displayType).toBe('free')
      expect(result.min).toBe(0)
      expect(result.max).toBe(0)
      expect(result.currency).toBe('USD')
      expect(result.isFree).toBe(true)
      expect(result.isPaid).toBe(false)
      expect(result.isTrusted).toBe(true)
      expect(result.source).toBe('provider')
      expect(result.badge.variant).toBe('free')
      expect(result.badge.color).toBe('green')
      expect(result.badge.size).toBe('lg')
    })

    it('should return FREE when price_min === 0', () => {
      const event = {
        price_min: 0,
        price_currency: 'CAD'
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('FREE')
      expect(result.isFree).toBe(true)
      expect(result.currency).toBe('CAD')
    })

    it('should return FREE without currency if provider doesn\'t supply it', () => {
      const event = {
        is_free: true
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('FREE')
      expect(result.currency).toBeUndefined()
    })
  })

  describe('Exact prices', () => {
    it('should return exact price with currency', () => {
      const event = {
        price_min: 25,
        price_currency: 'USD'
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('$25')
      expect(result.displayType).toBe('exact')
      expect(result.min).toBe(25)
      expect(result.max).toBe(25)
      expect(result.currency).toBe('USD')
      expect(result.isFree).toBe(false)
      expect(result.isPaid).toBe(true)
      expect(result.isTrusted).toBe(true)
      expect(result.badge.variant).toBe('verified')
      expect(result.badge.color).toBe('blue')
    })

    it('should return exact price without currency if not provided', () => {
      const event = {
        price_min: 50
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('$50')
      expect(result.min).toBe(50)
      expect(result.currency).toBeUndefined()
    })

    it('should use price field as fallback for price_min', () => {
      const event = {
        price: 30,
        price_currency: 'EUR'
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('$30')
      expect(result.min).toBe(30)
      expect(result.currency).toBe('EUR')
    })
  })

  describe('Price ranges', () => {
    it('should return price range when min < max', () => {
      const event = {
        price_min: 20,
        price_max: 50,
        price_currency: 'CAD'
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('$20-50')
      expect(result.displayType).toBe('range')
      expect(result.min).toBe(20)
      expect(result.max).toBe(50)
      expect(result.currency).toBe('CAD')
      expect(result.isTrusted).toBe(true)
    })

    it('should NOT create range when min === max', () => {
      const event = {
        price_min: 25,
        price_max: 25
      }

      const result = normalizePrice(event)

      expect(result.displayType).toBe('exact')
      expect(result.label).toBe('$25')
    })
  })

  describe('CTA fallback (no provider data)', () => {
    it('should return CTA when no price fields present', () => {
      const event = {
        title: 'Some Event',
        description: 'Event description'
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('CTA')
      expect(result.displayType).toBe('cta')
      expect(result.min).toBeUndefined()
      expect(result.max).toBeUndefined()
      expect(result.currency).toBeUndefined()
      expect(result.isFree).toBe(false)
      expect(result.isPaid).toBe(true)
      expect(result.isUnknown).toBe(true)
      expect(result.isTrusted).toBe(false)
      expect(result.source).toBe('unknown')
      expect(result.badge.variant).toBe('generic')
      expect(result.badge.color).toBe('purple')
    })

    it('should NOT parse dollar amounts from description', () => {
      const event = {
        description: 'Tickets are $25 at the door'
      }

      const result = normalizePrice(event)

      // Should NOT extract $25 from description
      expect(result.displayType).toBe('cta')
      expect(result.min).toBeUndefined()
      expect(result.source).toBe('unknown')
    })

    it('should NOT parse "free" from description', () => {
      const event = {
        description: 'Free drinks included with admission'
      }

      const result = normalizePrice(event)

      // Should NOT interpret "free" in description as free event
      expect(result.isFree).toBe(false)
      expect(result.displayType).toBe('cta')
    })
  })

  describe('Edge cases', () => {
    it('should handle null/undefined event', () => {
      const result = normalizePrice(null)

      expect(result.displayType).toBe('cta')
      expect(result.isUnknown).toBe(true)
    })

    it('should handle empty event object', () => {
      const result = normalizePrice({})

      expect(result.displayType).toBe('cta')
    })

    it('should ignore invalid price_min (negative)', () => {
      const event = {
        price_min: -10
      }

      const result = normalizePrice(event)

      expect(result.displayType).toBe('cta')
      expect(result.min).toBeUndefined()
    })

    it('should ignore invalid price_min (NaN)', () => {
      const event = {
        price_min: 'not a number' as any
      }

      const result = normalizePrice(event)

      expect(result.displayType).toBe('cta')
    })

    it('should handle decimal prices correctly', () => {
      const event = {
        price_min: 24.99,
        price_currency: 'USD'
      }

      const result = normalizePrice(event)

      expect(result.label).toBe('$24.99')
      expect(result.min).toBe(24.99)
    })
  })

  describe('Provider source validation', () => {
    it('should mark provider data as trusted', () => {
      const event = {
        price_min: 40,
        source: 'ticketmaster'
      }

      const result = normalizePrice(event)

      expect(result.isTrusted).toBe(true)
      expect(result.source).toBe('provider')
    })

    it('should mark missing data as unknown', () => {
      const event = {
        title: 'Event'
      }

      const result = normalizePrice(event)

      expect(result.isTrusted).toBe(false)
      expect(result.source).toBe('unknown')
    })
  })
})
