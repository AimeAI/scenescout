type Options = { timeWindowHrs:number };

export async function fetchEventsNearbyStartingSoon(
  loc:{lat:number; lng:number},
  opts:Options
){
  // Fetch a batch and filter client-side for now
  const now = new Date();
  const until = new Date(now.getTime() + opts.timeWindowHrs*60*60*1000);

  // Pull from existing combined endpoint
  const res = await fetch(`/api/search-events?limit=200&sort=date`);
  const data = await res.json();

  // Filter events by time window and venue location
  return (data?.events ?? []).filter((e:any)=>{
    const start = e.date ? new Date(e.date) : (e.event_date ? new Date(e.event_date) : null);
    if (!start) return false;
    const hasVenue = e.venue?.lat && e.venue?.lng;
    const hasVenueName = e.venue_lat && e.venue_lng;
    return start >= now && start <= until && (hasVenue || hasVenueName);
  });
}
