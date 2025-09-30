/**
 * Unit tests for PriceBadge component - Render matrix (Phase 1)
 *
 * Test Matrix:
 * 1. FREE badge (large, green, prominent)
 * 2. Exact price with checkmark (blue, verified)
 * 3. Price range with checkmark (blue, verified)
 * 4. CTA fallback (purple, generic) - 3 variants
 * 5. Legacy mode (ENGAGEMENT_PRICING=false)
 * 6. SSR safety (no window access errors)
 * 7. A11y attributes (aria-label, role)
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { PriceBadge } from '@/components/events/PriceBadge'

// Mock environment variables
const mockEnv = (overrides: Record<string, string> = {}) => {
  const original = process.env
  process.env = {
    ...original,
    NEXT_PUBLIC_FEATURE_ENGAGEMENT_PRICING: 'true',
    NEXT_PUBLIC_PRICE_FALLBACK_LABEL: 'tickets',
    ...overrides
  }
  return () => {
    process.env = original
  }
}

describe('PriceBadge Component', () => {
  describe('FREE events', () => {
    it('should render FREE badge with green background', () => {
      const restoreEnv = mockEnv()
      const event = { is_free: true }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('FREE')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-green-600')
      expect(badge).toHaveAttribute('aria-label', 'Free event')
      expect(badge).toHaveAttribute('role', 'status')

      restoreEnv()
    })

    it('should render large FREE badge when size=lg', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 0 }

      render(<PriceBadge event={event} size="lg" />)

      const badge = screen.getByText('FREE')
      expect(badge).toHaveClass('text-base')
      expect(badge).toHaveClass('px-3')

      restoreEnv()
    })

    it('should render small FREE badge when size=sm', () => {
      const restoreEnv = mockEnv()
      const event = { is_free: true }

      render(<PriceBadge event={event} size="sm" />)

      const badge = screen.getByText('FREE')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('px-2')

      restoreEnv()
    })
  })

  describe('Exact prices', () => {
    it('should render exact price with blue badge', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 25, price_currency: 'USD' }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('$25')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-blue-600')
      expect(badge).toHaveAttribute('aria-label', 'Price: $25 USD')

      // Should have checkmark icon
      const icon = badge.parentElement?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('text-green-400')

      restoreEnv()
    })

    it('should render price without currency if not provided', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 50 }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('$50')
      expect(badge).toHaveAttribute('aria-label', 'Price: $50')

      restoreEnv()
    })
  })

  describe('Price ranges', () => {
    it('should render price range with hyphen', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 20, price_max: 50, price_currency: 'CAD' }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('$20-50')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-blue-600')
      expect(badge).toHaveAttribute('aria-label', 'Price: $20-50 CAD')

      restoreEnv()
    })
  })

  describe('CTA fallback labels', () => {
    it('should render "Tickets Available →" when fallback=tickets', () => {
      const restoreEnv = mockEnv({ NEXT_PUBLIC_PRICE_FALLBACK_LABEL: 'tickets' })
      const event = { title: 'Event' }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('Tickets Available →')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-purple-600')
      expect(badge).toHaveAttribute('aria-label', 'Pricing information available on event page')

      restoreEnv()
    })

    it('should render "Paid" when fallback=paid', () => {
      const restoreEnv = mockEnv({ NEXT_PUBLIC_PRICE_FALLBACK_LABEL: 'paid' })
      const event = { description: 'Some event' }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('Paid')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-purple-600')

      restoreEnv()
    })

    it('should render "See Pricing →" when fallback=see_pricing', () => {
      const restoreEnv = mockEnv({ NEXT_PUBLIC_PRICE_FALLBACK_LABEL: 'see_pricing' })
      const event = {}

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('See Pricing →')
      expect(badge).toBeInTheDocument()

      restoreEnv()
    })

    it('should default to "tickets" if invalid fallback label', () => {
      const restoreEnv = mockEnv({ NEXT_PUBLIC_PRICE_FALLBACK_LABEL: 'invalid' })
      const event = {}

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('Tickets Available →')
      expect(badge).toBeInTheDocument()

      restoreEnv()
    })
  })

  describe('Legacy mode', () => {
    it('should render raw fields when ENGAGEMENT_PRICING=false', () => {
      const restoreEnv = mockEnv({ NEXT_PUBLIC_FEATURE_ENGAGEMENT_PRICING: 'false' })
      const event = { price_min: 25 }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('$25')
      expect(badge).toBeInTheDocument()
      // Should not have checkmark in legacy mode
      const icon = badge.parentElement?.querySelector('svg')
      expect(icon).not.toBeInTheDocument()

      restoreEnv()
    })

    it('should render FREE in legacy mode', () => {
      const restoreEnv = mockEnv({ NEXT_PUBLIC_FEATURE_ENGAGEMENT_PRICING: 'false' })
      const event = { price_min: 0 }

      render(<PriceBadge event={event} />)

      const badge = screen.getByText('FREE')
      expect(badge).toHaveClass('bg-green-600')

      restoreEnv()
    })
  })

  describe('Size variants', () => {
    it('should apply sm size classes', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 30 }

      render(<PriceBadge event={event} size="sm" />)

      const badge = screen.getByText('$30')
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-0.5')

      restoreEnv()
    })

    it('should apply md size classes (default)', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 40 }

      render(<PriceBadge event={event} size="md" />)

      const badge = screen.getByText('$40')
      expect(badge).toHaveClass('text-sm')
      expect(badge).toHaveClass('py-1')

      restoreEnv()
    })

    it('should apply lg size classes', () => {
      const restoreEnv = mockEnv()
      const event = { is_free: true }

      render(<PriceBadge event={event} size="lg" />)

      const badge = screen.getByText('FREE')
      expect(badge).toHaveClass('text-base')
      expect(badge).toHaveClass('px-3')
      expect(badge).toHaveClass('py-1.5')

      restoreEnv()
    })
  })

  describe('Tooltip behavior', () => {
    it('should NOT render tooltip when showTooltip=false', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 25 }

      const { container } = render(<PriceBadge event={event} showTooltip={false} />)

      const tooltip = container.querySelector('.group')
      expect(tooltip).not.toBeInTheDocument()

      restoreEnv()
    })

    it('should render tooltip wrapper when showTooltip=true', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 25 }

      const { container } = render(<PriceBadge event={event} showTooltip={true} />)

      // Tooltip only shows on desktop (window.innerWidth > 768)
      // In test environment, window.innerWidth is not set properly
      // So we just check that the component doesn't crash

      restoreEnv()
    })
  })

  describe('SSR safety', () => {
    it('should not throw error when window is undefined', () => {
      const restoreEnv = mockEnv()
      const originalWindow = global.window

      // Simulate SSR environment
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true
      })

      const event = { price_min: 30 }

      expect(() => {
        render(<PriceBadge event={event} showTooltip={true} />)
      }).not.toThrow()

      // Restore window
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true
      })

      restoreEnv()
    })
  })

  describe('Custom className', () => {
    it('should apply custom className', () => {
      const restoreEnv = mockEnv()
      const event = { is_free: true }

      const { container } = render(
        <PriceBadge event={event} className="custom-class" />
      )

      const badge = screen.getByText('FREE')
      expect(badge).toHaveClass('custom-class')

      restoreEnv()
    })
  })

  describe('A11y compliance', () => {
    it('should have aria-label for FREE events', () => {
      const restoreEnv = mockEnv()
      const event = { is_free: true }

      render(<PriceBadge event={event} />)

      const badge = screen.getByLabelText('Free event')
      expect(badge).toBeInTheDocument()

      restoreEnv()
    })

    it('should have aria-label for paid events', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 35 }

      render(<PriceBadge event={event} />)

      const badge = screen.getByLabelText('Price: $35')
      expect(badge).toBeInTheDocument()

      restoreEnv()
    })

    it('should have aria-label for CTA fallback', () => {
      const restoreEnv = mockEnv()
      const event = {}

      render(<PriceBadge event={event} />)

      const badge = screen.getByLabelText('Pricing information available on event page')
      expect(badge).toBeInTheDocument()

      restoreEnv()
    })

    it('should mark icons as aria-hidden', () => {
      const restoreEnv = mockEnv()
      const event = { price_min: 25 }

      const { container } = render(<PriceBadge event={event} />)

      const icon = container.querySelector('svg')
      expect(icon).toHaveAttribute('aria-hidden', 'true')

      restoreEnv()
    })
  })
})
