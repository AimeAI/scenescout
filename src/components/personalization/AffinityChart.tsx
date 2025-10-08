'use client'

interface AffinityChartProps {
  affinity: any
  categories: Array<{ id: string; title: string; emoji: string }>
}

export function AffinityChart({ affinity, categories }: AffinityChartProps) {
  if (!affinity) return null

  // Sort categories by affinity score
  const sortedCategories = Object.entries(affinity.categories)
    .map(([id, score]) => ({
      id,
      score: score as number,
      category: categories.find(c => c.id === id)
    }))
    .filter(item => item.category && item.score > 0)
    .sort((a, b) => b.score - a.score)

  const getColorClass = (score: number) => {
    if (score > 0.3) return 'from-purple-600 to-pink-600'
    if (score > 0.15) return 'from-blue-500 to-cyan-500'
    return 'from-gray-500 to-gray-600'
  }

  const getStrength = (score: number) => {
    if (score > 0.3) return 'Strong'
    if (score > 0.15) return 'Medium'
    return 'Emerging'
  }

  return (
    <div className="space-y-4">
      {sortedCategories.length === 0 ? (
        <div className="text-center text-white/50 py-8">
          No category preferences yet. Start exploring!
        </div>
      ) : (
        sortedCategories.map((item, index) => (
          <div key={item.id} className="group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.category?.emoji}</span>
                <span className="font-semibold text-white">{item.category?.title}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                  {getStrength(item.score)}
                </span>
              </div>
              <span className="text-lg font-bold text-white">
                {(item.score * 100).toFixed(0)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getColorClass(item.score)} transition-all duration-1000 ease-out`}
                style={{
                  width: `${item.score * 100}%`,
                  animation: `slideIn 0.8s ease-out ${index * 0.1}s both`
                }}
              />
            </div>
          </div>
        ))
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            width: 0%;
          }
        }
      `}</style>
    </div>
  )
}
