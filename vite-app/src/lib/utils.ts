import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export function formatTime(timeString: string) {
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export function formatPrice(priceMin?: number, priceMax?: number, isFree?: boolean, currency = 'USD') {
  if (isFree) return 'Free'
  if (!priceMin) return 'Price varies'
  if (priceMin === priceMax || !priceMax) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(priceMin)
  }
  return `${new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(priceMin)} - ${new Intl.NumberFormat('en-US', {
    style: 'currency', 
    currency
  }).format(priceMax)}`
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function truncate(text: string, length = 100) {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function getEventCategoryIcon(category: string) {
  const icons = {
    music: '🎵',
    sports: '⚽',
    arts: '🎨',
    food: '🍽️',
    tech: '💻',
    social: '👥',
    business: '💼',
    education: '📚',
    family: '👨‍👩‍👧‍👦',
    other: '🎉'
  }
  return icons[category as keyof typeof icons] || icons.other
}

export function getEventCategoryColor(category: string) {
  const colors = {
    music: 'bg-purple-500',
    sports: 'bg-green-500',
    arts: 'bg-orange-500',
    food: 'bg-red-500',
    tech: 'bg-blue-500',
    social: 'bg-yellow-500',
    business: 'bg-indigo-500',
    education: 'bg-teal-500',
    family: 'bg-pink-500',
    other: 'bg-gray-500'
  }
  return colors[category as keyof typeof colors] || colors.other
}