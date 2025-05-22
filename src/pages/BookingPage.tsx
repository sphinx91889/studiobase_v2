import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Music, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatTimezone } from '../lib/utils';
import { SelectHours } from '../components/BookingWizard/Steps/SelectHours';
import { SelectTime } from '../components/BookingWizard/Steps/SelectTime';
import { ReviewBooking } from '../components/BookingWizard/Steps/ReviewBooking';

interface Room {
  id: string;
  name: string;
  description: string;
  hourly_rate: number;
  minimum_hours: number;
  photos: string[];
  timezone: string;
  room_type: {
    name: string;
  } | null;
}

type BookingStep = 'hours' | 'time' | 'review';

export function BookingPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<BookingStep>('hours');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [hours, setHours] = useState<number>(2);
  const [processing, setProcessing] = useState(false);
  const [userTimezone, setUserTimezone] = useState<string>('');
  
  const totalAmount = useMemo(() => {
    if (!room) return 0;
    return Number(room.hourly_rate) * hours;
  }, [room, hours]);

  // Get user's timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(timezone);
  }, []);

  useEffect(() => {
    async function loadRoom() {
      if (!roomId) return;
      
      // Redirect to login if not authenticated
      if (!user) {
        navigate('/login', { state: { from: location } });
        return;
      }

      try {
        const { data, error: roomError } = await supabase
          .from('rooms')
          .select(`
            *,
            room_type:room_types(name)
          `)
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        
        // Ensure timezone is set to a valid value
        if (!data.timezone) {
          data.timezone = 'America/New_York'; // Default timezone if not set
        }
        
        setRoom(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room');
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [roomId, user, navigate, location]);

  const handleInitializePayment = async () => {
    if (!room) return;
    setProcessing(true);
    setError(null);
    
    try {
      // Calculate end time based on start time and hours
      const startDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);
      const endTime = endDateTime.toTimeString().split(' ')[0].substring(0, 5); // Format as HH:MM
			const timezone = room.timezone;

			console.log("TIMEZONE", timezone);

      // Check if slot is still available
      const { data: isAvailable, error: availabilityError } = await supabase
        .rpc('check_time_slot_availability', {
          p_booking_date: selectedDate,
          p_end_time: endTime,
          p_room_id: room.id,
          p_start_time: selectedTime,
					p_timezone: timezone,
        });

      if (availabilityError) throw availabilityError;

      if (!isAvailable) {
        throw new Error('This time slot is no longer available. Please select a different time.');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: room.id,
          date: selectedDate,
          startTime: selectedTime,
          hours,
          amount: totalAmount,
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.user_metadata?.full_name,
					timezone: timezone
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.sessionUrl) {
        // Redirect to Stripe Checkout
				localStorage.setItem('studio_id', data.studioOwnerId);
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment');
    } finally {
      setProcessing(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'hours':
        return (
          <SelectHours
            minimumHours={room?.minimum_hours || 1}
            hourlyRate={Number(room?.hourly_rate || 0)}
            selectedHours={hours}
            onHoursChange={setHours}
            onNext={() => setCurrentStep('time')}
          />
        );

      case 'time':
        return (
          <SelectTime
            roomId={room?.id || ''}
            roomTimezone={room?.timezone || 'America/New_York'}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onDateChange={setSelectedDate}
            onTimeChange={setSelectedTime}
            onBack={() => setCurrentStep('hours')}
            onNext={() => setCurrentStep('review')}
          />
        );

      case 'review':
        return (
          <ReviewBooking
            roomName={room?.name || ''}
            roomType={room?.room_type?.name || ''}
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            hours={hours}
            hourlyRate={Number(room?.hourly_rate || 0)}
            onBack={() => setCurrentStep('time')}
            onConfirm={handleInitializePayment}
            processing={processing}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading room details...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="text-center py-12">
        <Music className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-red-600">{error || 'Room not found'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Book {room.name}</h1>
        <p className="text-xl text-gray-600">
          {room.room_type?.name} - {formatPrice(Number(room.hourly_rate))}/hour
        </p>
      </header>

      {/* Timezone information */}
      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>Studio uses timezone:</strong> {formatTimezone(room.timezone || 'America/New_York')}</p>
            <p><strong>Your timezone is currently:</strong> {formatTimezone(userTimezone || 'UTC')}</p>
            {(room.timezone || 'America/New_York') !== userTimezone && (
              <p className="text-blue-800 font-medium">
                You can toggle between timezones in the booking step.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        {renderStep()}
      </div>
    </div>
  );
}
