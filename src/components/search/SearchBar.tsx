'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export function SearchBar({ placeholder = 'Search events...' }: { placeholder?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')

  function go() {
    const query = q.trim()
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    go()
  }

  return (
    <form onSubmit={onSubmit} className="w-full flex gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md bg-zinc-900/60 px-4 py-3 outline-none"
        aria-label="Search events"
      />
      <button type="submit" className="rounded-md bg-indigo-600 px-4 py-3 text-white">
        Search
      </button>
    </form>
  )
}
