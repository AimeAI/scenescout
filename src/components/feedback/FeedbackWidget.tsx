'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, MessageSquare, Bug, Lightbulb, MessageCircle, Send, Check } from 'lucide-react'
import { z } from 'zod'
import toast from 'react-hot-toast'

// Validation schema
const feedbackSchema = z.object({
  feedbackType: z.enum(['Bug Report', 'Feature Request', 'General Feedback'], {
    required_error: 'Please select a feedback type',
  }),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(500, 'Message must be less than 500 characters'),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal('')),
})

type FeedbackFormData = z.infer<typeof feedbackSchema>

interface FeedbackWidgetProps {
  excludePaths?: string[]
}

export function FeedbackWidget({ excludePaths = ['/login', '/admin'] }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [shouldShow, setShouldShow] = useState(true)
  const [formData, setFormData] = useState<FeedbackFormData>({
    feedbackType: 'General Feedback',
    message: '',
    email: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FeedbackFormData, string>>>({})

  // Check if current path should show widget
  useEffect(() => {
    const checkPath = () => {
      const currentPath = window.location.pathname
      const shouldHide = excludePaths.some(path => currentPath.startsWith(path))
      setShouldShow(!shouldHide)
    }

    checkPath()
    // Listen for route changes (for client-side navigation)
    window.addEventListener('popstate', checkPath)
    return () => window.removeEventListener('popstate', checkPath)
  }, [excludePaths])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    // Reset form after animation completes
    setTimeout(() => {
      setFormData({
        feedbackType: 'General Feedback',
        message: '',
        email: '',
      })
      setErrors({})
      setIsSuccess(false)
    }, 300)
  }, [])

  const validateForm = (): boolean => {
    try {
      feedbackSchema.parse(formData)
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof FeedbackFormData, string>> = {}
        error.errors.forEach(err => {
          const path = err.path[0] as keyof FeedbackFormData
          newErrors[path] = err.message
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      // For now, we'll skip screenshot functionality
      // In production, you could use html2canvas or similar library
      return null
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const screenshot = await captureScreenshot()

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          screenshot_url: screenshot,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      // Show success state
      setIsSuccess(true)
      toast.success('Thank you for your feedback!', {
        duration: 4000,
        icon: '🎉',
      })

      // Close modal after showing success
      setTimeout(() => {
        handleClose()
      }, 2000)
    } catch (error) {
      console.error('Feedback submission error:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit feedback. Please try again.',
        {
          duration: 5000,
        }
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'Bug Report':
        return <Bug className="w-5 h-5" />
      case 'Feature Request':
        return <Lightbulb className="w-5 h-5" />
      default:
        return <MessageCircle className="w-5 h-5" />
    }
  }

  if (!shouldShow) {
    return null
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[1025] w-[60px] h-[60px] rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 flex items-center justify-center group"
        aria-label="Open feedback form"
      >
        <MessageSquare className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute -top-2 -right-2 bg-red-500 text-xs font-bold px-2 py-0.5 rounded-full">
          Beta
        </span>
      </button>

      {/* Modal Backdrop & Content */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[1030] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={handleBackdropClick}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-white" />
                <h2 className="text-xl font-bold text-white">Beta Feedback</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                aria-label="Close feedback form"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Success State */}
              {isSuccess && (
                <div className="flex flex-col items-center justify-center py-8 animate-fadeIn">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                  <p className="text-gray-400 text-center">
                    Your feedback has been submitted successfully.
                  </p>
                </div>
              )}

              {/* Form Fields */}
              {!isSuccess && (
                <>
                  {/* Feedback Type */}
                  <div>
                    <label htmlFor="feedbackType" className="block text-sm font-medium text-gray-300 mb-2">
                      Feedback Type <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="feedbackType"
                        value={formData.feedbackType}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            feedbackType: e.target.value as FeedbackFormData['feedbackType'],
                          }))
                        }
                        className="w-full h-[44px] px-4 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none cursor-pointer"
                      >
                        <option value="Bug Report">Bug Report</option>
                        <option value="Feature Request">Feature Request</option>
                        <option value="General Feedback">General Feedback</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        {getIcon(formData.feedbackType)}
                      </div>
                    </div>
                    {errors.feedbackType && (
                      <p className="text-red-500 text-sm mt-1">{errors.feedbackType}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      value={formData.message}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          message: e.target.value,
                        }))
                      }
                      placeholder="Tell us what you think..."
                      maxLength={500}
                      rows={5}
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                    <div className="flex justify-between items-center mt-1">
                      {errors.message ? (
                        <p className="text-red-500 text-sm">{errors.message}</p>
                      ) : (
                        <p className="text-gray-500 text-sm">Minimum 10 characters</p>
                      )}
                      <p className="text-gray-500 text-sm">{formData.message.length}/500</p>
                    </div>
                  </div>

                  {/* Email (Optional) */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email (optional)
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="your@email.com"
                      className="w-full h-[44px] px-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      We'll only use this to follow up on your feedback
                    </p>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-[44px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Feedback
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
