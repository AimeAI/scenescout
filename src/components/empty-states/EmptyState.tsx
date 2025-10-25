'use client'

import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

export interface EmptyStateProps {
  icon?: LucideIcon
  emoji?: string
  title: string
  description: string | ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  suggestions?: string[]
  className?: string
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  secondaryAction,
  suggestions,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      {/* Icon or Emoji */}
      <div className="mb-6">
        {Icon ? (
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Icon className="w-10 h-10 text-purple-400" strokeWidth={1.5} />
          </div>
        ) : emoji ? (
          <div className="text-7xl mb-4 filter grayscale-[20%] opacity-80">
            {emoji}
          </div>
        ) : null}
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-white mb-3">
        {title}
      </h3>

      {/* Description */}
      <div className="text-gray-400 max-w-md mb-6 leading-relaxed">
        {typeof description === 'string' ? (
          <p>{description}</p>
        ) : (
          description
        )}
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6 max-w-md">
          <p className="text-sm font-medium text-white/80 mb-2">Try this:</p>
          <ul className="text-sm text-gray-400 text-left space-y-1">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-purple-400 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || 'default'}
            size="lg"
            className="min-w-[160px]"
          >
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button
            onClick={secondaryAction.onClick}
            variant={secondaryAction.variant || 'outline'}
            size="lg"
            className="min-w-[160px]"
          >
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  )
}
