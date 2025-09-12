import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date utilities
export const dateUtils = {
  // Format date for display
  formatDate: (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      ...options
    })
  },

  // Format date and time
  formatDateTime: (date: string | Date, time?: string) => {
    const d = new Date(date)
    let formatted = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    if (time) {
      const timeFormatted = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      formatted += ` at ${timeFormatted}`
    }

    return formatted
  },

  // Get relative time (e.g., "2 hours ago")
  getRelativeTime: (date: string | Date) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return dateUtils.formatDate(date)
  },

  // Check if date is today
  isToday: (date: string | Date) => {
    const today = new Date()
    const checkDate = new Date(date)
    return today.toDateString() === checkDate.toDateString()
  },

  // Check if date is in the future
  isFuture: (date: string | Date) => {
    const now = new Date()
    const checkDate = new Date(date)
    return checkDate > now
  }
}

// String utilities
export const stringUtils = {
  // Convert string to slug
  slugify: (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  },

  // Truncate string with ellipsis
  truncate: (str: string, length: number) => {
    if (str.length <= length) return str
    return str.slice(0, length).trim() + '...'
  },

  // Capitalize first letter
  capitalize: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  },

  // Convert camelCase to Title Case
  camelToTitle: (str: string) => {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (match) => match.toUpperCase())
      .trim()
  },

  // Generate random string
  randomString: (length: number) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

// Number utilities
export const numberUtils = {
  // Format currency
  formatCurrency: (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount)
  },

  // Format large numbers (1000 -> 1K)
  formatLargeNumber: (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    }
    return num.toString()
  },

  // Clamp number between min and max
  clamp: (num: number, min: number, max: number) => {
    return Math.min(Math.max(num, min), max)
  }
}

// URL utilities
export const urlUtils = {
  // Build URL with query params
  buildUrl: (base: string, params: Record<string, string | number | boolean | undefined>) => {
    const url = new URL(base, window.location.origin)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
    
    return url.toString()
  },

  // Get query param from current URL
  getQueryParam: (param: string) => {
    if (typeof window === 'undefined') return null
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get(param)
  },

  // Check if URL is valid
  isValidUrl: (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}

// Color utilities
export const colorUtils = {
  // Generate random color
  randomColor: () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`
  },

  // Generate avatar background color from string
  getAvatarColor: (str: string) => {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#22c55e', '#10b981', '#14b8a6',
      '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
      '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ]
    
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    return colors[Math.abs(hash) % colors.length]
  }
}

// Local storage utilities
export const storageUtils = {
  // Set item in localStorage
  setItem: (key: string, value: any) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  },

  // Get item from localStorage
  getItem: <T>(key: string, defaultValue?: T): T | null => {
    if (typeof window === 'undefined') return defaultValue || null
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue || null
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return defaultValue || null
    }
  },

  // Remove item from localStorage
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch (error) {
      console.error('Error removing from localStorage:', error)
    }
  },

  // Clear all localStorage
  clear: () => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.clear()
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }
}

// Validation utilities
export const validationUtils = {
  // Validate email
  isValidEmail: (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Validate phone number (basic)
  isValidPhone: (phone: string) => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  },

  // Validate URL
  isValidUrl: urlUtils.isValidUrl,

  // Validate password strength
  getPasswordStrength: (password: string) => {
    let strength = 0
    
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    
    if (strength < 2) return 'weak'
    if (strength < 4) return 'medium'
    return 'strong'
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}