import React, { useState } from 'react';
import { MapPin, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Select } from '../ui/select';
import { supabase } from '../../lib/supabaseClient';

interface LocationSelectorProps {
  onLocationSelected: (city: string, cityId: string) => void;
}

export function LocationSelector({ onLocationSelected }: LocationSelectorProps) {
  const [selectedCity, setSelectedCity] = useState('');
  const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    loadCities();
  }, []);

  const loadCities = async () => {
    const { data } = await supabase
      .from('cities')
      .select('id, name')
      .order('name');
    
    if (data) {
      setCities(data);
    }
  };

  const handleSelectCity = () => {
    if (!selectedCity) return;
    
    const city = cities.find(c => c.id === selectedCity);
    if (city) {
      // Save to localStorage
      const locationData = {
        city: city.name,
        cityId: city.id,
        timestamp: Date.now()
      };
      localStorage.setItem('userLocation', JSON.stringify(locationData));
      
      onLocationSelected(city.name, city.id);
    }
  };

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <MapPin className="h-5 w-5 text-purple-400" />
        <h3 className="text-lg font-medium text-white">Select Your City</h3>
      </div>
      
      <div className="flex gap-2">
        <select
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="flex-1 bg-gray-800 text-white rounded-md px-3 py-2 border border-gray-700"
        >
          <option value="">Choose a city...</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
        
        <Button
          onClick={handleSelectCity}
          disabled={!selectedCity}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Check className="h-4 w-4 mr-1" />
          Set Location
        </Button>
      </div>
    </div>
  );
}