import React, { useState } from 'react';
import { MapPin, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { useUserLocation } from '../../hooks/useUserLocation';

interface AutoDiscoveryProps {
  onDiscoveryComplete?: () => void;
}

export function AutoDiscovery({ onDiscoveryComplete }: AutoDiscoveryProps) {
  const userLocation = useUserLocation();
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryStatus, setDiscoveryStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [eventCount, setEventCount] = useState(0);

  const handleDiscoverEvents = async () => {
    if (!userLocation.city) return;

    setIsDiscovering(true);
    setDiscoveryStatus('running');

    try {
      // Simulate discovery process for now
      // In production, this would call a Supabase Edge Function
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, just indicate that discovery was attempted
      setEventCount(42); // Placeholder count
      setDiscoveryStatus('complete');
      onDiscoveryComplete?.();
    } catch (error) {
      console.error('Discovery failed:', error);
      setDiscoveryStatus('error');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Don't show if we already have events for this city
  if (userLocation.cityId) {
    return null;
  }

  // Don't show if still loading location
  if (userLocation.loading) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg p-6 mx-8 my-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-purple-400" />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            Welcome to {userLocation.city}! 🌟
          </h3>
          
          {discoveryStatus === 'idle' && (
            <>
              <p className="text-white/80 mb-4">
                We don't have events for {userLocation.city} yet, but we can discover them for you! 
                Our system will find restaurants, nightlife, sports, arts, and everything happening in your city.
              </p>
              <Button
                onClick={handleDiscoverEvents}
                disabled={isDiscovering}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Discover Events in {userLocation.city}
              </Button>
            </>
          )}

          {discoveryStatus === 'running' && (
            <div className="flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full"></div>
              <div>
                <p className="text-white/80">
                  🔍 Discovering events in {userLocation.city}...
                </p>
                <p className="text-sm text-white/60">
                  This may take a few moments as we search multiple sources
                </p>
              </div>
            </div>
          )}

          {discoveryStatus === 'complete' && (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
              <div>
                <p className="text-white/80 font-medium">
                  🎉 Discovery Complete!
                </p>
                <p className="text-sm text-white/60">
                  Found {eventCount} events in {userLocation.city}. Refresh the page to see them!
                </p>
              </div>
            </div>
          )}

          {discoveryStatus === 'error' && (
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
              <div>
                <p className="text-white/80 font-medium">
                  Discovery Failed
                </p>
                <p className="text-sm text-white/60">
                  Unable to discover events right now. Please try again later.
                </p>
                <Button
                  onClick={() => setDiscoveryStatus('idle')}
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-purple-400 hover:text-purple-300"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}