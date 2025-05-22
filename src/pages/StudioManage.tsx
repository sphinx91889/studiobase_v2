import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Plus, Pencil, Trash2, Music, Calendar, Settings, ArrowLeft, Clock, Mail, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatDate } from '../lib/utils';
import type { Studio, Room } from '../types/database';

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string;
  appointment_start_date: string;
  appointment_start_time: string;
  appointment_end_date: string;
  appointment_end_time: string;
  status: string;
  room_id: string;
  body: any;
  created_at: string;
}

export function StudioManage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'rooms' | 'bookings'>('details');

  useEffect(() => {
    async function loadStudio() {
      if (!id || !user) return;

      try {
        const { data: studioData, error: studioError } = await supabase
          .from('studios')
          .select(`
            *,
            organization:organizations(name, logo_url)
          `)
          .eq('id', id)
          .single();

        if (studioError) throw studioError;
        setStudio(studioData);

        const { data: roomsData, error: roomsError } = await supabase
          .from('rooms')
          .select(`
            *,
            room_type:room_types(name)
          `)
          .eq('studio_id', id)
          .order('name');

        if (roomsError) throw roomsError;
        setRooms(roomsData);

        // Load successful bookings for this studio's rooms
        const { data: successfulBookings, error: bookingsError } = await supabase
          .from('successful_bookings')
          .select(`
            *,
            room:rooms (
              id,
              name
            )
          `)
          .in('room_id', roomsData.map(room => room.id))
          .order('created_at', { ascending: false });

        if (bookingsError) throw bookingsError;
        setBookings(successfulBookings || []);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load studio');
      } finally {
        setLoading(false);
      }
    }

    loadStudio();
  }, [id, user]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading studio details...</p>
      </div>
    );
  }

  if (error || !studio) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-4 text-red-600">{error || 'Studio not found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="h-48 bg-gray-200 relative">
          {studio.photos?.[0] ? (
            <img
              src={studio.photos[0]}
              alt={studio.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Music className="w-16 h-16 text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h1 className="text-4xl font-bold">{studio.name}</h1>
            <p className="text-lg mt-2 text-gray-100">
              Manage your recording studio
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/studios/${id}/settings`)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <Settings className="w-4 h-4 mr-2" />
          Studio Settings
        </button>
      </div>

      <nav className="border-b border-gray-200">
        <div className="-mb-px flex space-x-8">
          {[
            { id: 'details', label: 'Details', icon: Building2 },
            { id: 'rooms', label: 'Rooms', icon: Music },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className={`
                w-5 h-5 mr-2
                ${activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}
              `} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {activeTab === 'details' && (
        <div className="bg-white shadow rounded-lg p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {studio.address}<br />
                {studio.city}, {studio.state} {studio.postal_code}<br />
                {studio.country}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contact</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {studio.email && <div>{studio.email}</div>}
                {studio.phone && <div>{studio.phone}</div>}
              </dd>
            </div>
            {studio.description && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{studio.description}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recording Rooms</h2>
            <button
              onClick={() => navigate(`/studios/${id}/rooms/new`)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </button>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
              <Music className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No rooms yet</h3>
              <p className="mt-2 text-gray-600">
                Get started by adding your first recording room
              </p>
              <button
                onClick={() => navigate(`/studios/${id}/rooms/new`)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Room
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-white rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                    {room.photos?.[0] ? (
                      <img
                        src={room.photos[0]}
                        alt={room.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                    <p className="text-sm text-gray-500">{room.room_type?.name}</p>
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-gray-900">
                        {formatPrice(Number(room.hourly_rate))}
                      </span>
                      <span className="text-gray-500">/hour</span>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/studios/${id}/rooms/${room.id}/edit`)}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Are you sure you want to delete this room?')) return;
                          const { error } = await supabase
                            .from('rooms')
                            .delete()
                            .eq('id', room.id);
                          if (error) {
                            alert('Failed to delete room');
                            return;
                          }
                          setRooms(rooms.filter(r => r.id !== room.id));
                        }}
                        className="inline-flex items-center p-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Recent Bookings</h2>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border-2 border-dashed border-gray-300">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No bookings yet</h3>
              <p className="mt-2 text-gray-600">
                Bookings will appear here when customers make reservations
              </p>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Room
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.customer_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{booking.room?.name || 'Unknown Room'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Clock className="w-4 h-4 mr-1 text-gray-400" />
                            <div>
                              <div>{booking.booking_date}</div>
                              <div className="text-gray-500">
                                {booking.start_time} - {booking.end_time}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full
                            ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : ''}
                            ${booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : ''}
                            ${booking.status === 'completed' ? 'bg-blue-100 text-blue-800' : ''}
                          `}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <a
                              href={`mailto:${booking.customer_email}`}
                              className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                            >
                              <Mail className="w-4 h-4 mr-1" />
                              {booking.customer_email}
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
