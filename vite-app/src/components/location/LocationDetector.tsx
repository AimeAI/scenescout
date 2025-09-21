import React, { useEffect } from 'react';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { useUserLocation } from '../../hooks/useUserLocation';
import { Button } from '../ui/button';

interface LocationDetectorProps {
  onLocationDetected?: (city: string, lat: number, lng: number) => void;
}

export function LocationDetector({ onLocationDetected }: LocationDetectorProps) {
  const location = useUserLocation();

  useEffect(() => {
    if (!location.loading && location.city && onLocationDetected) {
      onLocationDetected(location.city, location.latitude, location.longitude);
    }
  }, [location, onLocationDetected]);

  if (location.loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Detecting your location...</span>
      </div>
    );
  }

  if (location.error) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-600">
        <AlertCircle className="h-4 w-4" />
        <span>Using default location: {location.city}</span>
      </div>
    );
  }

  const handleChangeLocation = () => {
    // Clear cache and reload
    localStorage.removeItem('userLocation');
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4 text-green-500" />
      <span className="text-sm font-medium">{location.city}</span>
      <Button
        onClick={handleChangeLocation}
        variant="ghost"
        size="sm"
        className="text-xs"
      >
        Change
      </Button>
    </div>
  );
}