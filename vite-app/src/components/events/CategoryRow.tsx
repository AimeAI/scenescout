import { useNavigate } from 'react-router-dom'
import { useUserLocation } from '@/hooks/useUserLocation'
import { useLocationEvents } from '@/hooks/useEvents'
import { EventCard } from '@/components/events/EventCard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { EventCategory } from '@/services/events.service'

interface CategoryRowProps {
  category: EventCategory
  title: string
  icon?: string
}

export function CategoryRow({ category, title, icon }: CategoryRowProps) {
  const navigate = useNavigate()
  const userLocation = useUserLocation()
  
  // Use a more robust query that doesn't fail when cityId is missing
  const { data: events, isLoading, error } = useLocationEvents(
    userLocation.cityId || undefined, 
    { 
      category, 
      limit: 10 
    }
  )

  if (error) {
    return (
      <div className="p-4">
        <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
        <p className="text-white/60">Failed to load events</p>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          {icon && <span className="text-2xl">{icon}</span>}
          <span>{title}</span>
        </h2>
        
        <button className="text-white/60 hover:text-white transition-colors">
          See all
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : events?.length ? (
        <div className="flex space-x-6 overflow-x-auto scrollbar-hide pb-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              className="flex-shrink-0 w-80"
              onClick={() => navigate(`/event/${event.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-white/60">
          <p>No events found in this category</p>
        </div>
      )}
    </section>
  )
}