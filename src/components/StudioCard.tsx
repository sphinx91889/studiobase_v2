import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Music, Star } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import type { Studio } from '../types/database';

interface StudioCardProps {
  studio: Studio & {
    organization: { name: string; logo_url: string | null } | null;
    rooms: Array<{
      id: string;
      name: string;
      hourly_rate: number;
      room_type: { name: string } | null;
    }>;
  };
}

export function StudioCard({ studio }: StudioCardProps) {
  const lowestRate = Math.min(...studio.rooms.map(room => Number(room.hourly_rate)));
  
  return (
    <Link
      to={`/studios/${studio.id}`}
      className="group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="aspect-w-16 aspect-h-9 bg-gray-200">
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
            <Music className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {studio.name}
            </h3>
            <p className="text-sm text-gray-500">{studio.organization?.name}</p>
          </div>
          {studio.organization?.logo_url && (
            <img
              src={studio.organization.logo_url}
              alt={studio.organization.name}
              className="w-8 h-8 rounded-full"
            />
          )}
        </div>

        <div className="flex items-center text-sm text-gray-500">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{studio.city}, {studio.state}</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-sm">
            <span className="font-medium text-gray-900">
              {formatPrice(lowestRate)}
            </span>
            <span className="text-gray-500">/hour</span>
          </div>
          <div className="flex items-center text-sm">
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <span className="font-medium">4.8</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
