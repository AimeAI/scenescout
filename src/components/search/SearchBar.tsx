'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

const MAX_QUERY_LENGTH = 100
const DANGEROUS_CHARS_REGEX = /[<>{}[\]\\]/g

/**
 * Sanitize search query on client side
 */
function sanitizeQuery(query: string): string {
  if (!query) return ''

  // Remove dangerous characters
  let sanitized = query.replace(DANGEROUS_CHARS_REGEX, '')

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Limit length
  sanitized = sanitized.slice(0, MAX_QUERY_LENGTH)

  return sanitized
}

export function SearchBar({ placeholder = 'Search events...' }: { placeholder?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [error, setError] = useState<string>('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQ(value)

    // Clear error when user types
    if (error) setError('')

    // Warn if approaching limit
    if (value.length > MAX_QUERY_LENGTH - 10) {
      setError(`Maximum ${MAX_QUERY_LENGTH} characters allowed`)
    }
  }

  function go() {
    const sanitized = sanitizeQuery(q)

    if (!sanitized) {
      setError('Please enter a search query')
      return
    }

    if (sanitized.length < 1) {
      setError('Search query too short')
      return
    }

    // Clear any errors
    setError('')

    router.push(`/search?q=${encodeURIComponent(sanitized)}`)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    go()
  }

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="w-full flex gap-2">
        <div className="flex-1 min-w-0">
          <input
            value={q}
            onChange={handleChange}
            placeholder={placeholder}
            maxLength={MAX_QUERY_LENGTH}
            className={`w-full rounded-md bg-zinc-900/60 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base outline-none ${
              error ? 'ring-2 ring-red-500' : ''
            }`}
            aria-label="Search events"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'search-error' : undefined}
          />
          {error && (
            <p id="search-error" className="mt-1 text-xs sm:text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="flex-shrink-0 rounded-md bg-indigo-600 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[60px] sm:min-w-[80px]"
          disabled={q.length > MAX_QUERY_LENGTH}
          aria-label="Search"
        >
          <span className="hidden sm:inline">Search</span>
          <span className="sm:hidden">Go</span>
        </button>
      </form>
      <p className="mt-1 text-xs text-zinc-500">
        {q.length}/{MAX_QUERY_LENGTH} characters
      </p>
    </div>
  )
}
