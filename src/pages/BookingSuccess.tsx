import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Calendar, Clock, Mail, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/utils';

interface StripeSession {
  id: string;
  payment_status: string;
  customer_details: {
    email: string;
    name: string;
  };
  amount_total: number;
  metadata: {
    roomId: string;
    date: string;
    startTime: string;
    endTime: string;
    hours: string;
  };
}

export function BookingSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingBooking, setSavingBooking] = useState(false);
  const [session, setSession] = useState<StripeSession | null>(null);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    async function loadSession() {
      setSavingBooking(true);

			const studioOwnerId = localStorage.getItem('studio_id');

      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-session`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, studioOwnerId }),
        });

        const data = await response.json();
        if (data.error || !data.session) throw new Error(data.error || 'Session not found');

        const sessionData = data.session;
        setSession(sessionData);

        // Try to insert booking
        const { data: insertedBooking, error: bookingError } = await supabase
          .from('successful_bookings')
          .insert({
            room_id: sessionData.metadata.roomId,
            stripe_session_id: sessionData.id,
            customer_email: sessionData.customer_details.email,
            customer_name: sessionData.customer_details.name || sessionData.metadata.userName,
            amount_total: sessionData.amount_total,
            booking_date: sessionData.metadata.date,
            start_time: sessionData.metadata.startTime,
            end_time: sessionData.metadata.endTime,
            hours: parseInt(sessionData.metadata.hours),
            status: 'completed'
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        setBooking(insertedBooking);
      } catch (err: any) {
        if (err.code === '23505') {
          // Duplicate booking: retrieve existing
          const { data: existingBooking, error: fetchError } = await supabase
            .from('successful_bookings')
            .select('*')
            .eq('stripe_session_id', sessionId)
            .single();

          if (fetchError || !existingBooking) {
            console.error('Error fetching existing booking:', fetchError);
            setError('Failed to load existing booking.');
          } else {
            setBooking(existingBooking);
          }
        } else if (err.code === 'PGRST116') {
          setError('Unexpected number of rows returned from the database.');
        } else {
          console.error('Unexpected error:', err);
          setError('Failed to save booking.');
        }
      } finally {
				localStorage.removeItem("studio_id")
        setSavingBooking(false);
        setLoading(false);
      }
    }

    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-red-600 p-4 bg-red-50 rounded-lg">
            {error || 'Session not found'}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="text-3xl font-bold text-gray-900">
          {booking ? 'Booking Confirmed!' : 'Processing Booking...'}
        </h1>
        <div className="space-y-6 text-left bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm font-medium text-gray-900">Date</div>
              <div className="text-gray-600">
              {session.metadata.date} at {session.metadata.startTime}-{session.metadata.endTime}
              </div>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm font-medium text-gray-900">Duration</div>
              <div className="text-gray-600">
              {session.metadata.hours} hour{Number(session.metadata.hours) > 1 ? 's' : ''}
              </div>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <DollarSign className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm font-medium text-gray-900">Amount Paid</div>
              <div className="text-gray-600">
                {formatPrice(session.amount_total / 100)}
              </div>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <div className="text-sm font-medium text-gray-900">Confirmation sent to</div>
              <div className="text-gray-600">{session.customer_details.email}</div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            View My Bookings
          </button>
        </div>
      </div>
    </div>
  );
}
