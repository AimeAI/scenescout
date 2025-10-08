import { useState, useCallback } from 'react'

export type SwipeDirection = 'left' | 'right'

interface UseSwipeGestureProps {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

export function useSwipeGesture({ onSwipeLeft, onSwipeRight }: UseSwipeGestureProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (direction === 'left') {
      onSwipeLeft?.()
    } else if (direction === 'right') {
      onSwipeRight?.()
    }
  }, [onSwipeLeft, onSwipeRight])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  return {
    isDragging,
    handleSwipe,
    handleDragStart,
    handleDragEnd
  }
}
