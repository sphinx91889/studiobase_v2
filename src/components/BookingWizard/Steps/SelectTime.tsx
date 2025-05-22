import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { addDays, format, parse, isBefore, startOfDay } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { formatTimezone, formatTimeSlot, convertAndFormatTimeSlot, convertTimeToUserTimezone } from '../../../lib/utils';

interface AvailableSlot {
  time_slot: string;
  is_available: boolean;
}

interface SelectTimeProps {
  roomId: string;
  roomTimezone: string;
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function SelectTime({ 
  roomId,
  roomTimezone,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  onBack,
  onNext
}: SelectTimeProps) {
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [showUserTimezone, setShowUserTimezone] = useState(false);
  const [timezoneMismatchWarning, setTimezoneMismatchWarning] = useState<string | null>(null);
  
  // Get user's timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
    // Only show user timezone toggle if different from room timezone
    setShowUserTimezone(timezone !== roomTimezone);
  }, [roomTimezone]);

  // Calculate available dates, excluding today if timezone mismatch would make same-day bookings invalid
  const dates = useMemo(() => {
    // Ensure we have valid timezone values before proceeding
    const validUserTimezone = userTimezone || 'UTC';
    const validRoomTimezone = roomTimezone || 'UTC';
    
    try {
      const now = new Date();
      
      // Safely create dates in respective timezones
      let userDate, studioDate;
      
      try {
        // Try to get the date in user's timezone
        userDate = new Date(now.toLocaleString('en-US', { timeZone: validUserTimezone }));
      } catch (err) {
        console.error(`Invalid user timezone: ${validUserTimezone}`, err);
        userDate = new Date(); // Fallback to local time
      }
      
      try {
        // Try to get the date in studio's timezone
        studioDate = new Date(now.toLocaleString('en-US', { timeZone: validRoomTimezone }));
      } catch (err) {
        console.error(`Invalid room timezone: ${validRoomTimezone}`, err);
        studioDate = new Date(); // Fallback to local time
      }
      
      // Check if there's a date mismatch between timezones
      const userDay = userDate.getDate();
      const studioDay = studioDate.getDate();
      const dateMismatch = userDay !== studioDay;
      
      // If user is ahead of studio (e.g., user is in Asia, studio in US), 
      // or if it's late in the day in user's timezone, start from tomorrow
      const startOffset = dateMismatch && userDay > studioDay ? 1 : 0;
      
      // If it's already late in the day (e.g., after 5PM), suggest starting from tomorrow
      const userHour = userDate.getHours();
      const lateInDay = userHour >= 17; // 5PM
      
      // POLICY CHANGE: Always start from tomorrow for consistency
      // This ensures we never allow same-day bookings, regardless of timezone
      const finalOffset = 1; // Always start from tomorrow
      
      setTimezoneMismatchWarning(
        "Same-day bookings are not available. Please select a future date."
      );
      
      return Array.from(
        { length: 14 }, 
        (_, i) => format(addDays(new Date(), i + finalOffset), 'yyyy-MM-dd')
      );
    } catch (err) {
      console.error("Error calculating available dates:", err);
      // Fallback to next 14 days if there's an error
      return Array.from(
        { length: 14 }, 
        (_, i) => format(addDays(new Date(), i + 1), 'yyyy-MM-dd')
      );
    }
  }, [userTimezone, roomTimezone]);

  // Initialize selectedDate with first available date if not provided
  useEffect(() => {
    if (!selectedDate || !dates.includes(selectedDate)) {
      onDateChange(dates[0]);
    }
  }, [selectedDate, onDateChange, dates]);

  const loadAvailableSlots = async (date: string) => {
    if (!date) {
      console.warn('No date selected, skipping loadAvailableSlots');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: slots, error: slotsError } = await supabase
        .rpc('get_available_time_slots', {
          p_room_id: roomId,
          p_booking_date: date,
        });

      if (slotsError) throw slotsError;

      // Filter to only include available slots with valid time_slot values
      const filteredSlots = (slots || []).filter(slot => {
        if (!slot.is_available || !slot.time_slot || !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(slot.time_slot)) {
          return false;
        }
        
        return true;
      });
      
      setAvailableSlots(filteredSlots);
    } catch (err) {
      console.error('Error loading available slots:', err);
      setError('Failed to load available time slots');
    } finally {
      setLoading(false);
    }
  };

  // Load available slots when date changes
  useEffect(() => {
    loadAvailableSlots(selectedDate);
  }, [selectedDate, roomId, roomTimezone, userTimezone]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Select Date & Time</h2>
        <p className="mt-2 text-gray-600">
          Choose when you'd like to start your session
        </p>
      </div>

      {/* Timezone information */}
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Studio uses</strong> {formatTimezone(roomTimezone || 'UTC')}</p>
            <p><strong>Your timezone is currently:</strong> {formatTimezone(userTimezone || 'UTC')}</p>
            {roomTimezone !== userTimezone && (
              <div className="mt-2">
                <p className="text-blue-800 font-medium mb-2">
                  Times are shown in {showUserTimezone ? 'your local' : 'the studio\'s'} timezone.
                </p>
                <button 
                  onClick={() => setShowUserTimezone(!showUserTimezone)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium py-1 px-2 rounded transition-colors"
                >
                  Switch to {showUserTimezone ? 'studio' : 'your'} timezone
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking policy warning */}
      {timezoneMismatchWarning && (
        <div className="bg-amber-50 p-4 rounded-md">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              {timezoneMismatchWarning}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Date</span>
            <div className="mt-1 relative rounded-md shadow-sm">
              <select
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="block w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-right"
              >
                {dates.map(date => (
                  <option key={date} value={date}>
                    {format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d')}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div>
            <span className="text-sm font-medium text-gray-700">Available Times</span>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {loading ? (
                <p className="col-span-full text-center text-gray-500 py-4">
                  Loading available times...
                </p>
              ) : error ? (
                <p className="col-span-full text-center text-red-500 py-4">
                  {error}
                </p>
              ) : availableSlots.length === 0 ? (
                <p className="col-span-full text-center text-gray-500 py-4">
                  No available time slots for this date
                </p>
              ) : (
                availableSlots.map((slot) => (
                  <button
                    key={slot.time_slot}
                    onClick={() => onTimeChange(slot.time_slot)}
                    className={`
                      flex items-center justify-center px-3 py-2 border rounded-md text-sm font-medium
                      ${slot.time_slot === selectedTime
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                      }
                      transition-colors duration-200
                    `}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {showUserTimezone && roomTimezone !== userTimezone
                      ? convertAndFormatTimeSlot(slot.time_slot, selectedDate, roomTimezone || 'UTC', userTimezone || 'UTC')
                      : formatTimeSlot(slot.time_slot)}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          
          <button
            onClick={onNext}
            disabled={!selectedDate || !selectedTime}
            className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Review Booking
          </button>
        </div>
      </div>
    </div>
  );
}
