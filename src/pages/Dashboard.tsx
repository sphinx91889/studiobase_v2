import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { StudioOwnerCard } from '../components/StudioOwnerCard'; 
import { Building2, Plus, Calendar, Clock, MapPin, DollarSign } from 'lucide-react';
import { formatDate, formatTime, formatPrice } from '../lib/utils';

interface Booking {
  id: string;
  room: {
    id: string;
    name: string;
    studio: {
      id: string;
      name: string;
      city: string;
      state: string;
    };
  };
  booking_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  status: string;
  amount_total: number;
}
import type { Studio } from '../types/database';

export function Dashboard() {
  const { user } = useAuth();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStudioOwner, setIsStudioOwner] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session || sessionError) {
          throw new Error('Session expired or not found');
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_studio_owner')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        setIsStudioOwner(profile?.is_studio_owner || false);
      } catch (err) {
        if (err.message === 'Session expired or not found') {
          setUser(null);
          navigate('/login');
          return;
        }
        console.error('Error loading profile:', err);
      }
    }

    async function loadStudios() {
      if (!user) return;

      try { 
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!session || sessionError) {
          throw new Error('Session expired or not found');
        }

        const { data, error: studiosError } = await supabase
          .from('studios')
          .select(`
            id,
            organization_id,
            name,
            description,
            city,
            state,
            photos
          `)
          .eq('created_by', user.id);

        if (studiosError) throw studiosError;
        setStudios(data || []);

      } catch (err) {
        if (err.message === 'Session expired or not found') {
          setUser(null);
          navigate('/login');
          return;
        }
        console.error('Error loading studios:', err);
      } finally {
        setLoading(false);
      }
    }

    async function loadBookings() {
      if (!user) return;
      setLoading(true);

      const { data: bookings } = await supabase
        .from('successful_bookings')
        .select(`
          id,
          room:rooms (
            id,
            name,
            studio:studios (
              id,
              name,
              city,
              state
            )
          ),
          booking_date,
          start_time,
          hours,
          end_time,
          status,
          amount_total
        `)
        .eq('customer_email', user.email)
        .order('booking_date', { ascending: false });
      
      setLoading(false);
      setBookings(bookings || []);
    }

    loadProfile();
    loadStudios();
    loadBookings();
  }, [user, isStudioOwner]);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        {isStudioOwner ? (
          <p className="text-xl text-gray-600">
            {studios.length === 0 
              ? "Get started by adding your first recording studio"
              : "Manage your recording studios"
            }
          </p>
        ) : (
          <p className="text-xl text-gray-600">
            Manage your bookings and preferences
          </p>
        )}
      </header>

      {isStudioOwner ? (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">Your Studios</h2>
            <Link
              to="/studios/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Studio
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading your studios...</p>
            </div>
          ) : studios.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No studios yet</h3>
              <p className="mt-2 text-gray-600">
                Get started by adding your first recording studio
              </p>
              <Link
                to="/studios/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Studio
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {studios.map((studio) => (
                <StudioOwnerCard key={studio.id} studio={studio} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">Your Bookings</h2>
            <Link
              to="/studios"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Book Studio
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-600">Loading your bookings...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings yet</h3>
              <p className="mt-2 text-gray-600">
                Book your first studio session to get started
              </p>
              <Link
                to="/studios"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Book Studio
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {booking.room.name} at {booking.room.studio.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <MapPin className="w-4 h-4 mr-1" />
                        {booking.room.studio.city}, {booking.room.studio.state}
                      </div>
                    </div>
                    <div className="mt-4 sm:mt-0">
                      <span className={`
                        px-3 py-1 text-sm font-medium rounded-full
                        ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                        ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                      `}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center space-x-6 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                     {booking.booking_date}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      {booking.start_time} - {booking.end_time.replace(':00:00', ':00')}
                     <span className="ml-2 text-gray-500">
                       ({booking.hours} {booking.hours === 1 ? 'hour' : 'hours'})
                     </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {formatPrice(booking.amount_total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
