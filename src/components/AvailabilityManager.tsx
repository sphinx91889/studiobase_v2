import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityManagerProps {
  roomId: string;
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => 
  `${i.toString().padStart(2, '0')}:00`
);

export function AvailabilityManager({ roomId }: AvailabilityManagerProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load availability data
  const loadAvailability = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('availability')
        .select('*')
        .eq('room_id', roomId)
        .order('day_of_week');

      if (fetchError) throw fetchError;

      // If no data exists, create default records
      if (!data || data.length === 0) {
        const { data: defaultData, error: defaultError } = await supabase
          .rpc('ensure_room_availability', {
            p_room_id: roomId
          });

        if (defaultError) throw defaultError;
        setAvailabilities(defaultData || []);
      } else {
        setAvailabilities(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (roomId) {
      loadAvailability();
    }
  }, [roomId]);

  const handleTimeChange = async (
    dayIndex: number,
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    try {
      setSaving(true);
      setError(null);

      const availability = availabilities.find(a => a.day_of_week === dayIndex);
      if (!availability) return;

      // Create updated record
      const updatedAvailability = {
        ...availability,
        [field]: value
      };

      // Update database
      const { error: updateError } = await supabase
        .from('availability')
        .update({
          start_time: updatedAvailability.start_time,
          end_time: updatedAvailability.end_time,
          is_available: updatedAvailability.is_available
        })
        .eq('id', availability.id);

      if (updateError) throw updateError;

      // Update local state
      setAvailabilities(prev => 
        prev.map(a => a.id === availability.id ? updatedAvailability : a)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update time');
      // Reload data on error
      await loadAvailability();
    } finally {
      setSaving(false);
    }
  };

  const handleAvailabilityToggle = async (dayIndex: number) => {
    try {
      setSaving(true);
      setError(null);

      const availability = availabilities.find(a => a.day_of_week === dayIndex);
      if (!availability) return;

      // Create updated record
      const updatedAvailability = {
        ...availability,
        is_available: !availability.is_available
      };

      // Update database
      const { error: updateError } = await supabase
        .from('availability')
        .update({
          is_available: updatedAvailability.is_available
        })
        .eq('id', availability.id);

      if (updateError) throw updateError;

      // Update local state
      setAvailabilities(prev => 
        prev.map(a => a.id === availability.id ? updatedAvailability : a)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
      // Reload data on error
      await loadAvailability();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Room Availability
        </h3>
        {saving && (
          <span className="text-sm text-gray-500">Saving changes...</span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {DAYS.map((day, dayIndex) => {
          const dayAvailability = availabilities.find(a => a.day_of_week === dayIndex);
          if (!dayAvailability) return null;

          return (
            <div key={day} className="flex items-center space-x-4">
              <div className="w-32">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={dayAvailability.is_available}
                    onChange={() => handleAvailabilityToggle(dayIndex)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{day}</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 flex-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <select
                  value={dayAvailability.start_time}
                  onChange={(e) => handleTimeChange(dayIndex, 'start_time', e.target.value)}
                  disabled={!dayAvailability.is_available}
                  className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {TIME_SLOTS.map(time => (
                    <option 
                      key={time} 
                      value={time}
                      disabled={time >= dayAvailability.end_time}
                    >
                      {time}
                    </option>
                  ))}
                </select>

                <span className="text-gray-500">to</span>

                <select
                  value={dayAvailability.end_time}
                  onChange={(e) => handleTimeChange(dayIndex, 'end_time', e.target.value)}
                  disabled={!dayAvailability.is_available}
                  className="block w-32 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {TIME_SLOTS.map(time => (
                    <option 
                      key={time} 
                      value={time}
                      disabled={time <= dayAvailability.start_time}
                    >
                      {time}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
