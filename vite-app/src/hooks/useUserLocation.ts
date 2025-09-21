import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
  cityId: string | null;
  loading: boolean;
  error: string | null;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation>({
    latitude: 0,
    longitude: 0,
    city: '',
    cityId: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    
    const getUserLocation = async () => {
      if (!mounted) return;
      console.log('🌍 Starting location detection...');
      try {
        // Try to get from localStorage first
        const cached = localStorage.getItem('userLocation');
        if (cached) {
          const parsed = JSON.parse(cached);
          // Check if cache is less than 24 hours old
          if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            if (mounted) {
              setLocation({
                ...parsed,
                loading: false,
                error: null
              });
            }
            return;
          }
        }

        // Get current position
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });
        });

        const { latitude, longitude } = position.coords;
        console.log('📍 Got coordinates:', latitude, longitude);

        // Reverse geocode to get city name
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
          console.error('Google Places API key missing');
          throw new Error('API key not configured');
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
        );
        
        if (!response.ok) {
          throw new Error('Geocoding failed');
        }

        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          const cityComponent = result.address_components.find(
            (comp: any) => comp.types.includes('locality')
          );
          const cityName = cityComponent?.long_name || 'Unknown City';

          // Check if city exists in database
          const { data: cityData, error: cityError } = await supabase
            .from('cities')
            .select('id')
            .ilike('name', `%${cityName}%`)
            .maybeSingle();
          
          if (cityError) {
            console.warn('City lookup error:', cityError);
          }

          const locationData = {
            latitude,
            longitude,
            city: cityName,
            cityId: cityData?.id || null,
            timestamp: Date.now()
          };

          // Cache location
          localStorage.setItem('userLocation', JSON.stringify(locationData));

          if (mounted) {
            setLocation({
              ...locationData,
              loading: false,
              error: null
            });
          }
        }
      } catch (error) {
        console.error('Location error:', error);
        
        // Fallback to IP-based location
        try {
          console.log('🌐 Trying IP-based location...');
          const ipResponse = await fetch('https://ipapi.co/json/');
          const ipData = await ipResponse.json();
          
          console.log('📍 IP location:', ipData.city, ipData.country);
          
          // Check if city exists in database
          const { data: cityData } = await supabase
            .from('cities')
            .select('id')
            .ilike('name', `%${ipData.city || 'Toronto'}%`)
            .maybeSingle();
          
          const locationData = {
            latitude: ipData.latitude || 43.6532,
            longitude: ipData.longitude || -79.3832,
            city: ipData.city || 'Toronto',
            cityId: cityData?.id || null,
            timestamp: Date.now()
          };

          localStorage.setItem('userLocation', JSON.stringify(locationData));

          if (mounted) {
            setLocation({
              ...locationData,
              loading: false,
              error: null
            });
          }
        } catch (ipError) {
          console.error('IP location failed:', ipError);
          
          // Final fallback to Toronto
          const { data: torontoCity } = await supabase
            .from('cities')
            .select('id')
            .ilike('name', '%Toronto%')
            .maybeSingle();
            
          if (mounted) {
            setLocation({
              latitude: 43.6532,
              longitude: -79.3832,
              city: 'Toronto',
              cityId: torontoCity?.id || null,
              loading: false,
              error: 'Using default location'
            });
          }
        }
      }
    };

    getUserLocation();
    
    return () => {
      mounted = false;
    };
  }, []);

  return location;
}