'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUserLocation, requestLocation } from '@/hooks/useUserLocation';
import { calculateDistanceKm, walkingTimeLabel } from '@/lib/location/distance';
import { fetchEventsNearbyStartingSoon } from '@/lib/events/nearMeNow';
import { EventCard } from '@/components/events/EventCard';

export default function NearMePage() {
  const router = useRouter();
  const [loc, setLoc] = useState<{lat:number; lng:number} | null>(null);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeWindowHrs, setTimeWindowHrs] = useState(3);
  const [maxDistanceKm, setMaxDistanceKm] = useState(2);

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  useEffect(() => {
    setLoadingLoc(true);
    getUserLocation()
      .then((p) => setLoc(p))
      .catch(() => setLoc(null))
      .finally(() => setLoadingLoc(false));
  }, []);

  const loadEvents = async (position: {lat:number; lng:number}) => {
    setLoadingEvents(true);
    setError(null);
    try {
      const data = await fetchEventsNearbyStartingSoon(position, { timeWindowHrs });
      const sorted = data
        .map((e:any) => {
          const vLat = e.venue?.lat ?? e.venue_lat;
          const vLng = e.venue?.lng ?? e.venue_lng;
          const d = vLat && vLng
            ? calculateDistanceKm(position.lat, position.lng, vLat, vLng)
            : Number.POSITIVE_INFINITY;
          return { ...e, _distanceKm: d };
        })
        .filter((e:any) => e._distanceKm <= maxDistanceKm)
        .sort((a:any,b:any) => (a._distanceKm ?? 1e9) - (b._distanceKm ?? 1e9));
      setEvents(sorted);
    } catch (err:any) {
      setError(err?.message || 'Failed to load nearby events.');
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    if (loc) loadEvents(loc);
  }, [loc, timeWindowHrs, maxDistanceKm]);

  const requestLoc = async () => {
    setLoadingLoc(true);
    try {
      const p = await requestLocation();
      setLoc(p);
    } finally {
      setLoadingLoc(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <button onClick={handleBack} className="mb-4 text-sm text-gray-300 hover:text-white">{'< Back'}</button>

      <h1 className="text-2xl md:text-3xl font-semibold mb-2">📍 Near Me Today</h1>
      <p className="text-sm text-gray-400 mb-6">Events starting soon within walking distance.</p>

      {!loc && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-lg font-medium mb-2">Enable Location</h2>
          <p className="text-sm text-gray-400 mb-4">Allow location to discover events near you.</p>
          <button
            onClick={requestLoc}
            disabled={loadingLoc}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
          >
            {loadingLoc ? 'Requesting…' : 'Enable Location'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-5">
        <FilterChip active={timeWindowHrs===1} onClick={()=>setTimeWindowHrs(1)}>Next Hour</FilterChip>
        <FilterChip active={timeWindowHrs===3} onClick={()=>setTimeWindowHrs(3)}>Next 3 Hours</FilterChip>
        <FilterChip active={timeWindowHrs===8} onClick={()=>setTimeWindowHrs(8)}>Tonight</FilterChip>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-400">Max walk</label>
          <select
            value={maxDistanceKm}
            onChange={(e)=>setMaxDistanceKm(Number(e.target.value))}
            className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-sm"
          >
            <option value={0.5}>~5 min</option>
            <option value={1}>~10 min</option>
            <option value={2}>~20 min</option>
            <option value={3}>~30 min</option>
          </select>
        </div>
      </div>

      {loadingEvents && <p className="text-sm text-gray-400">Loading nearby events…</p>}
      {error && <p className="text-sm text-rose-400">{error}</p>}

      {loc && events.length === 0 && !loadingEvents && (
        <div className="text-sm text-gray-400">No events match your filters. Try expanding time or distance.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((e:any)=>(
          <div key={e.id} className="relative">
            <EventCard event={e} />
            {typeof e._distanceKm==='number' && (
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {e._distanceKm.toFixed(1)} km • {walkingTimeLabel(e._distanceKm)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip(props:{active?:boolean; onClick:()=>void; children:any}) {
  return (
    <button
      onClick={props.onClick}
      className={`px-3 py-1 rounded-full text-sm border ${props.active ? 'bg-white text-black border-white' : 'border-white/15 text-gray-200 hover:bg-white/10'}`}
    >
      {props.children}
    </button>
  );
}
