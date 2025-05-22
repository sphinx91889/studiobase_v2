import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Clock, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface Availability {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface AvailabilityDisplayProps {
  roomId: string;
}

export interface AvailabilityDisplayRef {
  handleSaveAllTimes: () => Promise<boolean>;
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

export const AvailabilityDisplay = forwardRef<AvailabilityDisplayRef, AvailabilityDisplayProps>(
  ({ roomId }, ref) => {
    const [availabilities, setAvailabilities] = useState<Availability[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingTimes, setEditingTimes] = useState<{
      [key: number]: {
      start: string;
      end: string;
      };
    }>({});

    // Expose the handleSaveAllTimes method to parent component
    useImperativeHandle(ref, () => ({
      handleSaveAllTimes: async () => {
        try {
          setSaving(true);
          setError(null);
          
          // Create an array of promises for each day's update
          const updatePromises = availabilities.map(async (availability) => {
            const dayIndex = availability.day_of_week;
            const editingTime = editingTimes[dayIndex];
            
            // Skip if no editing time exists for this day
            if (!editingTime) return true;
            
            // Only update if the time has changed
            if (editingTime.start === availability.start_time && 
                editingTime.end === availability.end_time) {
              return true;
            }
            
            const { error: updateError } = await supabase
              .rpc('update_day_availability', {
                p_room_id: roomId,
                p_day_of_week: dayIndex,
                p_start_time: editingTime.start,
                p_end_time: editingTime.end,
                p_is_available: availability.is_available
              });
              
            if (updateError) throw updateError;
            return true;
          });
          
          // Wait for all updates to complete
          await Promise.all(updatePromises);
          
          // Reload availability after updates
          const { data, error: fetchError } = await supabase
            .from('availability')
            .select('*')
            .eq('room_id', roomId)
            .order('day_of_week');
            
          if (fetchError) throw fetchError;
          setAvailabilities(data || []);
          
          return true;
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to update availability times');
          return false;
        } finally {
          setSaving(false);
        }
      }
    }));

    const handleAvailabilityToggle = async (dayIndex: number) => {
      try {
        setSaving(true);
        setError(null);

        const dayAvailability = availabilities.find(a => a.day_of_week === dayIndex);
        if (!dayAvailability) return;

        const { error: updateError } = await supabase
          .rpc('update_day_availability', {
            p_room_id: roomId,
            p_day_of_week: dayIndex,
            p_start_time: dayAvailability.start_time,
            p_end_time: dayAvailability.end_time,
            p_is_available: !dayAvailability.is_available
          });

        if (updateError) throw updateError;

        // Reload availability after update
        const { data, error: fetchError } = await supabase
          .from('availability')
          .select('*')
          .eq('room_id', roomId)
          .order('day_of_week');

        if (fetchError) throw fetchError;
        setAvailabilities(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update availability');
      } finally {
        setSaving(false);
      }
    };

    useEffect(() => {
      async function loadAvailability() {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (!session || sessionError) {
            throw new Error('Session expired or not found');
          }

          const { data, error: fetchError } = await supabase
            .from('availability')
            .select('*')
            .eq('room_id', roomId)
            .order('day_of_week');

          if (fetchError) throw fetchError;
          setAvailabilities(data || []);
          
          // Initialize editing state with current values
          const initialEditingTimes = data?.reduce((acc, curr) => ({
            ...acc,
            [curr.day_of_week]: {
              start: curr.start_time,
              end: curr.end_time
            }
          }), {});
          setEditingTimes(initialEditingTimes || {});
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load availability');
        } finally {
          setLoading(false);
        }
      }

      loadAvailability();
    }, [roomId]);

    const handleSaveTime = async (dayIndex: number) => {
      const editingTime = editingTimes[dayIndex];
      if (!editingTime) return;
      
      try {
        setSaving(true);
        setError(null);

        const { error: updateError } = await supabase
          .rpc('update_day_availability', {
            p_room_id: roomId,
            p_day_of_week: dayIndex,
            p_start_time: editingTime.start,
            p_end_time: editingTime.end,
            p_is_available: true
          });

        if (updateError) throw updateError;

        // Reload availability after update
        const { data, error: fetchError } = await supabase
          .from('availability')
          .select('*')
          .eq('room_id', roomId)
          .order('day_of_week');

        if (fetchError) throw fetchError;
        setAvailabilities(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update availability');
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

    if (error) {
      return (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Room Availability
        </h3>

        <div className="divide-y divide-gray-200">
          {DAYS.map((day, dayIndex) => {
            const dayAvailability = availabilities.find(a => a.day_of_week === dayIndex);
            if (!dayAvailability) return null;

            return (
              <div key={day} className="py-3 flex items-center justify-between">
                <div className="flex items-center">
                  <label className="inline-flex items-center w-32">
                    <input
                      type="checkbox"
                      checked={dayAvailability.is_available}
                      onChange={() => handleAvailabilityToggle(dayIndex)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{day}</span>
                  </label>
                  {dayAvailability.is_available ? (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400 mr-2" />
                      <input
                        type="time"
                        value={editingTimes[dayIndex]?.start || dayAvailability.start_time}
                        onChange={(e) => setEditingTimes(prev => ({
                          ...prev,
                          [dayIndex]: {
                            ...prev[dayIndex],
                            start: e.target.value
                          }
                        }))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                      <span className="mx-2">to</span>
                      <input
                        type="time"
                        value={editingTimes[dayIndex]?.end || dayAvailability.end_time}
                        onChange={(e) => setEditingTimes(prev => ({
                          ...prev,
                          [dayIndex]: {
                            ...prev[dayIndex],
                            end: e.target.value
                          }
                        }))}
                        className="w-32 px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        onClick={() => handleSaveTime(dayIndex)}
                        disabled={saving}
                        className="ml-2 p-1 text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Closed</span>
                  )}
                </div>
                <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                  dayAvailability.is_available 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {dayAvailability.is_available ? 'Available' : 'Unavailable'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

function formatTime(time: string) {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}
