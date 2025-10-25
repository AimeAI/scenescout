'use client'

import { useState } from 'react'
import { EmptyState, EMPTY_STATE_VARIANTS } from '@/components/empty-states'
import { AppLayout } from '@/components/layout/AppLayout'

export default function EmptyStatesShowcase() {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)

  const variants = Object.keys(EMPTY_STATE_VARIANTS)

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Empty States Showcase</h1>
          <p className="text-gray-400 mb-8">
            Preview all empty state variants in the design system
          </p>

          {/* Variant Selector */}
          <div className="mb-8">
            <label className="text-sm text-gray-400 mb-2 block">Select Variant:</label>
            <div className="flex flex-wrap gap-2">
              {variants.map((variant) => (
                <button
                  key={variant}
                  onClick={() => setSelectedVariant(variant)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    selectedVariant === variant
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {variant}
                </button>
              ))}
              <button
                onClick={() => setSelectedVariant(null)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedVariant === null
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                Show All
              </button>
            </div>
          </div>

          {/* Single Variant View */}
          {selectedVariant && (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{selectedVariant}</h2>
                <code className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                  EMPTY_STATE_VARIANTS.{selectedVariant}
                </code>
              </div>
              <EmptyState
                {...EMPTY_STATE_VARIANTS[selectedVariant as keyof typeof EMPTY_STATE_VARIANTS]}
                action={{
                  label: 'Primary Action',
                  onClick: () => alert('Primary action clicked!')
                }}
                secondaryAction={{
                  label: 'Secondary Action',
                  onClick: () => alert('Secondary action clicked!'),
                  variant: 'outline'
                }}
              />
            </div>
          )}

          {/* All Variants Grid */}
          {!selectedVariant && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {variants.map((variant) => (
                <div
                  key={variant}
                  className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-purple-500/50 transition-colors"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-bold mb-1">{variant}</h3>
                    <code className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                      EMPTY_STATE_VARIANTS.{variant}
                    </code>
                  </div>
                  <EmptyState
                    {...EMPTY_STATE_VARIANTS[variant as keyof typeof EMPTY_STATE_VARIANTS]}
                    action={{
                      label: 'Action',
                      onClick: () => setSelectedVariant(variant)
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Code Examples */}
          <div className="mt-12 bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold mb-4">Usage Examples</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Basic usage:</p>
                <pre className="bg-black/50 p-4 rounded text-xs overflow-x-auto">
{`import { EmptyState, EMPTY_STATE_VARIANTS } from '@/components/empty-states'

<EmptyState
  {...EMPTY_STATE_VARIANTS.noSearchResults}
  action={{
    label: 'Browse Events',
    onClick: () => router.push('/')
  }}
/>`}
                </pre>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-2">With customization:</p>
                <pre className="bg-black/50 p-4 rounded text-xs overflow-x-auto">
{`import { getEmptyState } from '@/components/empty-states'

<EmptyState
  {...getEmptyState('noCategoryEvents', {
    title: 'Custom Title',
    description: 'Custom description'
  })}
  action={{
    label: 'Primary',
    onClick: handlePrimary
  }}
  secondaryAction={{
    label: 'Secondary',
    onClick: handleSecondary,
    variant: 'outline'
  }}
/>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
