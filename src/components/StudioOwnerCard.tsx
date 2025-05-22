import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Music, ExternalLink } from 'lucide-react';
import type { Studio } from '../types/database';

interface StudioOwnerCardProps {
  studio: Studio;
}

export function StudioOwnerCard({ studio }: StudioOwnerCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-w-16 aspect-h-9 bg-gray-200">
        {studio.photos?.[0] ? (
          <img
            src={studio.photos[0]}
            alt={studio.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-900">{studio.name}</h3>
        <div className="flex items-center text-sm text-gray-500 mt-1">
          <MapPin className="w-4 h-4 mr-1" />
          <span>{studio.city}, {studio.state}</span>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <Link
            to={`/studios/${studio.id}/manage`}
            className="inline-flex items-center text-indigo-600 hover:text-indigo-700 text-sm font-medium mr-4"
          >
            <Building2 className="w-4 h-4 mr-1" />
            Manage Studio
          </Link>
          <Link
            to={`/studios/${studio.id}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-700 text-sm font-medium"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            View Studio
          </Link>
        </div>
      </div>
    </div>
  );
}
