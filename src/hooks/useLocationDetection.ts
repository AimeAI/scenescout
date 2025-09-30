import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Location detection and management hook
 * Handles user location detection, storage, and preferences
 */

export interface UserLocation {
  city: string;
  state: string;
  stateCode: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: 'gps' | 'ip' | 'manual' | 'stored';
  accuracy?: number;
  timestamp: number;
}

export interface LocationPreferences {
  autoDetect: boolean;
  allowGPS: boolean;
  defaultLocation?: UserLocation;
  savedLocations: UserLocation[];
  currentLocation?: UserLocation;
}

const LOCATION_STORAGE_KEY = 'scenescout_location_prefs';
const LOCATION_CACHE_KEY = 'scenescout_current_location';
const LOCATION_CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

// Default location preferences
const DEFAULT_PREFERENCES: LocationPreferences = {
  autoDetect: true,
  allowGPS: true,
  savedLocations: [],
};

// Major cities for fallback
const MAJOR_CITIES: UserLocation[] = [
  {
    city: 'San Francisco',
    state: 'California',
    stateCode: 'CA',
    country: 'United States',
    countryCode: 'US',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    source: 'manual',
    timestamp: Date.now()
  },
  {
    city: 'New York',
    state: 'New York',
    stateCode: 'NY',
    country: 'United States',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.0060,
    timezone: 'America/New_York',
    source: 'manual',
    timestamp: Date.now()
  },
  {
    city: 'Los Angeles',
    state: 'California',
    stateCode: 'CA',
    country: 'United States',
    countryCode: 'US',
    latitude: 34.0522,
    longitude: -118.2437,
    timezone: 'America/Los_Angeles',
    source: 'manual',
    timestamp: Date.now()
  },
  {
    city: 'Chicago',
    state: 'Illinois',
    stateCode: 'IL',
    country: 'United States',
    countryCode: 'US',
    latitude: 41.8781,
    longitude: -87.6298,
    timezone: 'America/Chicago',
    source: 'manual',
    timestamp: Date.now()
  }
];

export function useLocationDetection() {
  const [preferences, setPreferences] = useState<LocationPreferences>(DEFAULT_PREFERENCES);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (err) {
        console.error('Failed to parse location preferences:', err);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  const savePreferences = useCallback((newPrefs: Partial<LocationPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(updated));
  }, [preferences]);

  // Get cached location if still valid
  const getCachedLocation = useCallback((): UserLocation | null => {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      try {
        const location: UserLocation = JSON.parse(cached);
        const age = Date.now() - location.timestamp;
        if (age < LOCATION_CACHE_DURATION) {
          return location;
        }
      } catch (err) {
        console.error('Failed to parse cached location:', err);
      }
    }
    return null;
  }, []);

  // Cache location
  const cacheLocation = useCallback((location: UserLocation) => {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
  }, []);

  // Get location via GPS
  const getGPSLocation = useCallback((): Promise<UserLocation> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude, accuracy } = position.coords;
            
            // Reverse geocoding to get city/state info
            const location = await reverseGeocode(latitude, longitude);
            const gpsLocation: UserLocation = {
              ...location,
              latitude,
              longitude,
              accuracy,
              source: 'gps',
              timestamp: Date.now()
            };
            
            resolve(gpsLocation);
          } catch (err) {
            reject(err);
          }
        },
        (error) => {
          reject(new Error(`GPS error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }, []);

  // Get location via IP geolocation
  const getIPLocation = useCallback(async (): Promise<UserLocation> => {
    try {
      // Try multiple IP geolocation services
      const services = [
        'https://ipapi.co/json/',
        'http://ip-api.com/json/?fields=country,countryCode,region,regionName,city,lat,lon,timezone',
        'https://geolocation-db.com/json/'
      ];

      for (const service of services) {
        try {
          const response = await fetch(service);
          if (!response.ok) continue;

          const data = await response.json();
          
          // Normalize response format
          const location: UserLocation = {
            city: data.city || data.region_name || 'Unknown',
            state: data.region_name || data.region || data.state_prov || 'Unknown',
            stateCode: data.region || data.state_prov || '',
            country: data.country_name || data.country || 'Unknown',
            countryCode: data.country_code || data.countryCode || '',
            latitude: parseFloat(data.latitude || data.lat || 0),
            longitude: parseFloat(data.longitude || data.lon || 0),
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            source: 'ip',
            timestamp: Date.now()
          };

          if (location.city !== 'Unknown' && location.latitude !== 0) {
            return location;
          }
        } catch (err) {
          console.warn(`IP geolocation service failed:`, err);
          continue;
        }
      }
      
      throw new Error('All IP geolocation services failed');
    } catch (err) {
      throw new Error(`IP geolocation failed: ${err}`);
    }
  }, []);

  // Reverse geocoding function
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<Omit<UserLocation, 'latitude' | 'longitude' | 'source' | 'timestamp'>> => {
    try {
      // Use Nominatim for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SceneScout/1.0 (contact@scenescout.com)'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      const address = data.address || {};

      return {
        city: address.city || address.town || address.village || 'Unknown',
        state: address.state || address.region || 'Unknown',
        stateCode: getStateCode(address.state || ''),
        country: address.country || 'Unknown',
        countryCode: address.country_code?.toUpperCase() || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch (err) {
      // Fallback to timezone-based approximation
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const parts = timezone.split('/');
      return {
        city: 'Unknown',
        state: parts[1] || 'Unknown',
        stateCode: '',
        country: parts[0] === 'America' ? 'United States' : 'Unknown',
        countryCode: parts[0] === 'America' ? 'US' : '',
        timezone
      };
    }
  }, []);

  // Auto-detect location
  const detectLocation = useCallback(async (forceRefresh = false): Promise<UserLocation> => {
    if (!forceRefresh) {
      const cached = getCachedLocation();
      if (cached) {
        return cached;
      }
    }

    setIsDetecting(true);
    setError(null);

    try {
      let location: UserLocation;

      // Try GPS first if allowed
      if (preferences.allowGPS) {
        try {
          location = await getGPSLocation();
          cacheLocation(location);
          savePreferences({ currentLocation: location });
          return location;
        } catch (gpsError) {
          console.warn('GPS detection failed, falling back to IP:', gpsError);
        }
      }

      // Fall back to IP geolocation
      try {
        location = await getIPLocation();
        cacheLocation(location);
        savePreferences({ currentLocation: location });
        return location;
      } catch (ipError) {
        console.warn('IP geolocation failed:', ipError);
      }

      // Final fallback to default location
      const defaultLocation = preferences.defaultLocation || MAJOR_CITIES[0];
      savePreferences({ currentLocation: defaultLocation });
      return defaultLocation;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Location detection failed';
      setError(errorMessage);
      
      // Return default location on error
      const defaultLocation = preferences.defaultLocation || MAJOR_CITIES[0];
      savePreferences({ currentLocation: defaultLocation });
      return defaultLocation;
    } finally {
      setIsDetecting(false);
    }
  }, [preferences, getCachedLocation, cacheLocation, savePreferences, getGPSLocation, getIPLocation]);

  // Manual location selection
  const setManualLocation = useCallback((location: Omit<UserLocation, 'source' | 'timestamp'>) => {
    const manualLocation: UserLocation = {
      ...location,
      source: 'manual',
      timestamp: Date.now()
    };
    
    cacheLocation(manualLocation);
    savePreferences({ currentLocation: manualLocation });
    
    return manualLocation;
  }, [cacheLocation, savePreferences]);

  // Save location for future use
  const saveLocation = useCallback((location: UserLocation, name?: string) => {
    const savedLocation = { ...location, name };
    const savedLocations = [...preferences.savedLocations];
    
    // Remove duplicate if exists
    const existingIndex = savedLocations.findIndex(
      loc => loc.city === location.city && loc.stateCode === location.stateCode
    );
    
    if (existingIndex >= 0) {
      savedLocations[existingIndex] = savedLocation;
    } else {
      savedLocations.push(savedLocation);
    }
    
    savePreferences({ savedLocations });
  }, [preferences.savedLocations, savePreferences]);

  // Get current location with auto-detection
  const { data: currentLocation, isLoading, refetch } = useQuery({
    queryKey: ['user-location'],
    queryFn: () => detectLocation(),
    enabled: preferences.autoDetect,
    staleTime: LOCATION_CACHE_DURATION,
    retry: 1,
  });

  return {
    // Current state
    currentLocation: currentLocation || preferences.currentLocation,
    preferences,
    isDetecting: isDetecting || isLoading,
    error,
    majorCities: MAJOR_CITIES,

    // Actions
    detectLocation,
    setManualLocation,
    saveLocation,
    savePreferences,
    refreshLocation: () => refetch(),
    clearCache: () => {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      queryClient.invalidateQueries({ queryKey: ['user-location'] });
    },

    // Utilities
    getCachedLocation,
    isLocationStale: (location: UserLocation) => 
      Date.now() - location.timestamp > LOCATION_CACHE_DURATION
  };
}

// Helper function to get state code from state name
function getStateCode(stateName: string): string {
  const stateCodes: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
  };

  return stateCodes[stateName] || '';
}