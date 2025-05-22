import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Music, Star, Clock, DollarSign, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/utils';
import type { Studio, Room } from '../types/database';

interface StudioWithDetails extends Studio {
  organization: {
    name: string;
    logo_url: string | null;
  } | null;
  rooms: Array<Room & {
    room_type: { name: string } | null;
  }>;
}

export function StudioDetails() {
  const { id } = useParams();
  const [studio, setStudio] = useState<StudioWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  useEffect(() => {
    async function loadStudio() {
      if (!id) return;

      try {
        const { data, error: studioError } = await supabase
          .from('studios')
          .select(`
            *,
            organization:organizations(name, logo_url),
            rooms(
              *,
              room_type:room_types(name)
            )
          `)
          .eq('id', id)
          .single();

        if (studioError) throw studioError;
        setStudio(data);
        if (data?.rooms?.[0]) {
          setSelectedRoom(data.rooms[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load studio');
      } finally {
        setLoading(false);
      }
    }

    loadStudio();
  }, [id]);

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

  const selectedRoomDetails = studio.rooms.find(room => room.id === selectedRoom);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="relative h-96 rounded-xl overflow-hidden bg-gray-100">
        {studio.photos?.[0] ? (
          <img
            src={studio.photos[0].replace(/\.(heic|heif)$/i, '.jpg')}
            alt={studio.name}
            className="w-full h-full object-cover bg-gray-100"
            onError={(e) => {
              // Try the JPEG version if original fails
              const target = e.target as HTMLImageElement;
              if (!target.src.endsWith('.jpg')) {
                target.src = target.src.replace(/\.(heic|heif)$/i, '.jpg');
              } else {
                // If JPEG also fails, show placeholder
                target.onerror = null;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0zIDN2MThoMTgiLz48cGF0aCBkPSJNMjEgM3YxOEgzIi8+PC9zdmc+';
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-24 h-24 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex items-center space-x-4">
            {studio.organization?.logo_url && (
              <img
                src={studio.organization.logo_url}
                alt={studio.organization.name}
                className="w-12 h-12 rounded-full bg-white"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold">{studio.name}</h1>
              {studio.organization?.name && (
                <p className="text-lg opacity-90">{studio.organization.name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">About this Studio</h2>
            <p className="text-gray-600">{studio.description}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">Location</h3>
                  <p className="text-gray-600">
                    {studio.address}<br />
                    {studio.city}, {studio.state} {studio.postal_code}<br />
                    {studio.country}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {studio.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">{studio.phone}</span>
                  </div>
                )}
                {studio.email && (
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600">{studio.email}</span>
                  </div>
                )}
              </div>
            </div>

            {studio.amenities && Object.keys(studio.amenities).length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Amenities</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(studio.amenities).map(([key, value]) => (
                    value && (
                      <div key={key} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                        <span className="text-gray-600">
                          {key.split('-').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">Recording Rooms</h2>
              <div className="flex items-center text-sm">
                <Star className="w-5 h-5 text-yellow-400 mr-1" />
                <span className="font-medium">4.9</span>
                <span className="text-gray-500 ml-1">(128 reviews)</span>
              </div>
            </div>

            <div className="grid gap-6">
              {studio.rooms.map((room) => (
                <div
                  key={room.id}
                  className={`
                    relative p-4 rounded-lg border-2 transition-colors cursor-pointer
                    ${selectedRoom === room.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  onClick={() => setSelectedRoom(room.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden">
                      {room.photos?.[0] ? (
                        <img
                          src={room.photos[0]}
                          alt={room.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900">{room.name}</h3>
                      <p className="text-sm text-gray-500">{room.room_type?.name}</p>
                      <div className="mt-2 flex items-center text-sm">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="font-medium text-gray-900">
                          {formatPrice(Number(room.hourly_rate))}
                        </span>
                        <span className="text-gray-500">/hour</span>
                        <span className="mx-2">•</span>
                        <Clock className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-gray-500">
                          {room.minimum_hours} hour min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            {selectedRoomDetails && (
              <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedRoomDetails.name}
                  </h3>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-bold text-gray-900">
                      {formatPrice(Number(selectedRoomDetails.hourly_rate))}
                    </span>
                    <span className="text-gray-500 ml-1">/hour</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedRoomDetails.description}
                  </p>
                </div>

                {selectedRoomDetails.equipment && 
                 Object.keys(selectedRoomDetails.equipment).length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Equipment</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(selectedRoomDetails.equipment).map(([key, value]) => (
                        value && (
                          <div key={key} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-indigo-600 rounded-full" />
                            <span className="text-sm text-gray-600">
                              {key.split('-').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                              ).join(' ')}
                            </span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  to={selectedRoomDetails.booking_link || `/booking/${selectedRoomDetails.id}`}
                  target={selectedRoomDetails.booking_link ? "_blank" : undefined}
                  rel={selectedRoomDetails.booking_link ? "noopener noreferrer" : undefined}
                  className="block w-full py-3 px-4 text-center font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                >
                  Book Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
