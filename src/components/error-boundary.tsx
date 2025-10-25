'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { captureException } from '@/lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Send to Sentry with component stack
    captureException(error, {
      component: 'ErrorBoundary',
      errorInfo: errorInfo.componentStack,
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKeys !== this.props.resetKeys) {
      this.setState({ hasError: false, error: null })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <DefaultErrorFallback
          error={this.state.error}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

interface FallbackProps {
  error: Error | null
  onReset: () => void
}

function DefaultErrorFallback({ error, onReset }: FallbackProps) {
  const errorMessage = error?.message || 'An unexpected error occurred'
  const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network')
  const isDataError = errorMessage.includes('undefined') || errorMessage.includes('null')

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
      <div className="mb-6">
        <svg
          className="w-16 h-16 text-red-500 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-white mb-4">
        {isNetworkError ? 'Connection Error' :
         isDataError ? 'Data Error' :
         'Something Went Wrong'}
      </h2>

      <p className="text-gray-400 mb-6 max-w-md">
        {isNetworkError ?
          "We're having trouble connecting to our servers. Please check your internet connection and try again." :
         isDataError ?
          "We encountered an issue loading this content. This might be due to incomplete data." :
          "We've encountered an unexpected error. Don't worry, we're working on it."}
      </p>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mb-6 text-left max-w-2xl w-full">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-300 mb-2">
            Error Details (Development Only)
          </summary>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm text-red-400">
            {error.stack || error.message}
          </pre>
        </details>
      )}

      <div className="flex gap-4">
        <button
          onClick={onReset}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  )
}

// Specialized error boundaries for different use cases

export function EventCardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400 mb-2">Unable to load this event</p>
          <p className="text-sm text-gray-500">Please try refreshing the page</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function CategoryRailErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-2">Unable to load events for this category</p>
          <p className="text-sm text-gray-500">Please try again later</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function SearchErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">Search encountered an error</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Reset Search
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function MapErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-gray-800 rounded-lg p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
          <svg
            className="w-12 h-12 text-gray-600 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-gray-400 mb-2">Unable to load map</p>
          <p className="text-sm text-gray-500">Map features are temporarily unavailable</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function APIErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
          <p className="text-red-400 mb-2">API Connection Error</p>
          <p className="text-sm text-gray-400">We're having trouble connecting to our services</p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
