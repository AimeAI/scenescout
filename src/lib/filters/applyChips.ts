import { isWithinHours } from '@/lib/datetime'

export function applyChipFilters(events: any[], chip: { tonight?: boolean; now?: boolean; near?: boolean; free?: boolean }, opts: { tz: string; todayStartIsoUtc: string; todayEndIsoUtc: string; userLat?: number; userLng?: number; maxWalkMin?: number }) {
  let list = [...events]

  if (chip.free) {
    list = list.filter(e => (e.price === 0 || e.price_min === 0) || /free/i.test(e.priceLabel || e.price_label || ''))
  }

  if (chip.now) {
    list = list.filter(e => isWithinHours(e.startUtc || e.start_date, e.tz || opts.tz, 3))
  } else if (chip.tonight) {
    const start = new Date(opts.todayStartIsoUtc).getTime()
    const end = new Date(opts.todayEndIsoUtc).getTime()
    list = list.filter(e => {
      const t = new Date(e.startUtc || e.start_date).getTime()
      return t >= start && t <= end
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
