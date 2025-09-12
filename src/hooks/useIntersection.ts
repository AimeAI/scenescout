import { useEffect, useState, useRef } from 'react'

interface UseIntersectionOptions {
  threshold?: number | number[]
  rootMargin?: string
  root?: Element | null
}

export function useIntersection(
  elementRef: React.RefObject<Element>,
  options: UseIntersectionOptions = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (!elementRef.current) return

    observerRef.current = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting)
    }, {
      threshold: options.threshold || 0,
      rootMargin: options.rootMargin || '0px',
      root: options.root || null,
    })

    observerRef.current.observe(elementRef.current)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [elementRef, options.threshold, options.rootMargin, options.root])

  return isIntersecting
}