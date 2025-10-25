'use client'

export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-6">
        <div className="h-5 w-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
      </div>

      {/* Hero Image */}
      <div className="w-full h-[400px] bg-gradient-to-br from-gray-700 to-gray-800 animate-pulse" />

      {/* Content */}
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-10 w-[85%] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
          <div className="h-6 w-[60%] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <div className="h-12 w-[200px] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
          <div className="h-12 w-[120px] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
          <div className="h-12 w-[100px] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
              <div className="h-5 w-[80%] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="space-y-3">
          <div className="h-6 w-[150px] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
          <div className="h-4 w-full bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
          <div className="h-4 w-[95%] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
          <div className="h-4 w-[90%] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
          <div className="h-4 w-[85%] bg-gradient-to-br from-gray-700 to-gray-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  )
}
