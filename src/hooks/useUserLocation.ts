'use client'

import { useState, useEffect } from 'react'

export interface UserLocation {
  latitude: number
  longitude: number
  accuracy?: number
  city?: string
  region?: string
  country?: string
}

export interface LocationState {
  location: UserLocation | null
  loading: boolean
  error: string | null
  permission: 'granted' | 'denied' | 'prompt' | 'unknown'
}

export function useUserLocation() {
  const [state, setState] = useState<LocationState>({
    location: null,
    loading: false,
    error: null,
    permission: 'unknown'
  })

  const requestLocation = async () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        permission: 'denied'
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Check permission status
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5 * 60 * 1000 // 5 minutes
          }
        )
      })

      const { latitude, longitude, accuracy } = position.coords

      // Try to get city/region information
      let city, region, country
      try {
        const response = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        )
        if (response.ok) {
          const data = await response.json()
          city = data.city || data.locality
          region = data.principalSubdivision
          country = data.countryName
        }
      } catch (geocodeError) {
        console.warn('Failed to get location details:', geocodeError)
      }

      const userLocation: UserLocation = {
        latitude,
        longitude,
        accuracy,
        city,
        region,
        country
      }

      setState({
        location: userLocation,
        loading: false,
        error: null,
        permission: permission.state
      })

      // Save to localStorage for future use
      localStorage.setItem('userLocation', JSON.stringify(userLocation))

    } catch (error: any) {
      let errorMessage = 'Failed to get location'
      
      if (error.code === 1) {
        errorMessage = 'Location access denied'
      } else if (error.code === 2) {
        errorMessage = 'Location unavailable'
      } else if (error.code === 3) {
        errorMessage = 'Location request timed out'
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        permission: error.code === 1 ? 'denied' : 'unknown'
      }))
    }
  }

  const loadSavedLocation = () => {
    try {
      const saved = localStorage.getItem('userLocation')
      if (saved) {
        const location = JSON.parse(saved)
        setState(prev => ({
          ...prev,
          location,
          permission: 'granted'
        }))
        return true
      }
    } catch (error) {
      console.warn('Failed to load saved location:', error)
    }
    return false
  }

  const clearLocation = () => {
    localStorage.removeItem('userLocation')
    setState({
      location: null,
      loading: false,
      error: null,
      permission: 'unknown'
    })
  }

  useEffect(() => {
    // Try to load saved location first
    const hasSaved = loadSavedLocation()
    
    // If no saved location, automatically request location
    if (!hasSaved) {
      requestLocation()
    }
  }, [])

  return {
    ...state,
    requestLocation,
    clearLocation,
    refresh: requestLocation
  }
}

// Location override for "Use Downtown" feature
const LOCATION_OVERRIDE_KEY = 'locationOverride';
const DOWNTOWN_TORONTO = { lat: 43.6532, lng: -79.3832 };

export function setLocationOverride(coords: { lat: number; lng: number }) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCATION_OVERRIDE_KEY, JSON.stringify(coords));
  }
}

export function getLocationOverride(): { lat: number; lng: number } | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem(LOCATION_OVERRIDE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearLocationOverride() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCATION_OVERRIDE_KEY);
  }
}

export function useDowntownToronto() {
  setLocationOverride(DOWNTOWN_TORONTO);
}

// Standalone helpers for non-hook usage
export async function getUserLocation(): Promise<{lat:number; lng:number}> {
  // Check for override first
  const override = getLocationOverride();
  if (override) {
    return override;
  }

  const saved = localStorage.getItem('userLocation');
  if (saved) {
    const loc = JSON.parse(saved);
    return { lat: loc.latitude, lng: loc.longitude };
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        localStorage.setItem('userLocation', JSON.stringify({ latitude: loc.lat, longitude: loc.lng }));
        resolve(loc);
      },
      () => reject(new Error('Location denied')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}

export async function requestLocation(): Promise<{lat:number; lng:number}> {
  return getUserLocation();
}

/**
 * Get current effective location (override > permission > null)
 */
export function getCurrentLocation(): { lat: number; lng: number } | null {
  if (typeof window === 'undefined') return null;

  // Check override first
  const override = getLocationOverride();
  if (override) return override;

  // Check saved permission location
  const saved = localStorage.getItem('userLocation');
  if (saved) {
    try {
      const loc = JSON.parse(saved);
      return { lat: loc.latitude, lng: loc.longitude };
    } catch {
      return null;
    }
  }

  return null;
}

export function isLocationReady(): boolean {
  return getCurrentLocation() !== null;
}