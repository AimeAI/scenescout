import { isWithinHours } from '@/lib/datetime'

export function applyChipFilters(events: any[], chip: { tonight?: boolean; now?: boolean; near?: boolean; free?: boolean }, opts: { tz: string; todayStartIsoUtc: string; todayEndIsoUtc: string; userLat?: number; userLng?: number; maxWalkMin?: number }) {
  let list = [...events]

  if (chip.free) {
    list = list.filter(e => (e.price === 0 || e.price_min === 0) || /free/i.test(e.priceLabel || e.price_label || ''))
  }

  if (chip.now) {
    // Show events starting within next 3 hours
    const nowTime = Date.now()
    const threeHoursLater = nowTime + (3 * 60 * 60 * 1000)

    list = list.filter(e => {
      // Support multiple date field formats from different APIs
      const dateStr = e.event_date || e.date || e.startUtc || e.start_date
      if (!dateStr) return false

      const eventTime = new Date(dateStr).getTime()
      return eventTime >= nowTime && eventTime <= threeHoursLater
    })
  } else if (chip.tonight) {
    // Show events happening tonight (6 PM today - 4 AM tomorrow)
    const now = new Date()
    const tonightStart = new Date(now)
    tonightStart.setHours(18, 0, 0, 0) // 6 PM today

    const tonightEnd = new Date(now)
    tonightEnd.setDate(tonightEnd.getDate() + 1)
    tonightEnd.setHours(4, 0, 0, 0) // 4 AM tomorrow

    // If it's before 6 PM, show tonight's events
    // If it's after midnight, show events from previous evening that are still ongoing
    if (now.getHours() < 6) {
      // It's early morning (12 AM - 6 AM), show events from yesterday evening
      tonightStart.setDate(tonightStart.getDate() - 1)
      tonightEnd.setHours(6, 0, 0, 0) // Until 6 AM today
    }

    list = list.filter(e => {
      // Support multiple date field formats from different APIs
      const dateStr = e.event_date || e.date || e.startUtc || e.start_date
      if (!dateStr) return false

      const eventDate = new Date(dateStr)
      const eventStart = eventDate.getTime()

      // Default 4 hour duration if no end time specified
      const endStr = e.end_date || e.endUtc
      const eventEnd = endStr ? new Date(endStr).getTime() : eventStart + (4 * 60 * 60 * 1000)

      // Event is happening tonight if it starts before tonight ends AND ends after tonight starts
      return eventStart <= tonightEnd.getTime() && eventEnd >= tonightStart.getTime()
    })
  }

  // near: only sort/filter if we have location
  if (chip.near && typeof opts.userLat === 'number' && typeof opts.userLng === 'number') {
    list = list
      .map(e => {
        const dKm = haversineKm(opts.userLat!, opts.userLng!, e.lat ?? e.latitude, e.lng ?? e.longitude)
        const walkMin = dKm * 12 // ~5 km/h => 12 min per km
        return { ...e, _walkMin: walkMin }
      })
      .filter(e => typeof e._walkMin === 'number' && e._walkMin <= (opts.maxWalkMin ?? 20))
      .sort((a, b) => (a._walkMin! - b._walkMin!))
  }

  return list
}

function haversineKm(lat1:number, lon1:number, lat2:number, lon2:number) {
  if ([lat1,lon1,lat2,lon2].some(v => typeof v !== 'number' || Number.isNaN(v))) return Number.POSITIVE_INFINITY
  const toRad = (x:number)=>x*Math.PI/180
  const R=6371, dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1)
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2
  return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}
