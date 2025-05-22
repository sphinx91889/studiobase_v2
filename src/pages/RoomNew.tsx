import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Music, Upload, X, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadStudioPhoto } from '../lib/storage';
import { z } from 'zod';
import type { RoomType } from '../types/database';

const roomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  description: z.string().optional(),
  room_type_id: z.string().uuid('Please select a room type'),
  hourly_rate: z.number().min(0, 'Hourly rate must be positive'),
  minimum_hours: z.number().int().min(1, 'Minimum booking must be at least 1 hour'),
  photos: z.array(z.string()).optional(),
  booking_link: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  equipment: z.record(z.any()).optional(),
  specifications: z.record(z.any()).optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

const defaultEquipment = {
  'audio-interface': false,
  'microphones': false,
  'monitors': false,
  'headphones': false,
  'instruments': false,
  'mixing-console': false,
};

const defaultSpecifications = {
  'soundproof': false,
  'acoustic-treatment': false,
  'climate-control': false,
  'natural-light': false,
  'recording-booth': false,
};

export function RoomNew() {
  const { id: studioId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [equipment, setEquipment] = useState(defaultEquipment);
  const [specifications, setSpecifications] = useState(defaultSpecifications);

  useEffect(() => {
    async function loadRoomTypes() {
      const { data } = await supabase
        .from('room_types')
        .select('*')
        .order('name');
      setRoomTypes(data || []);
    }

    loadRoomTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const roomData: RoomFormData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      room_type_id: formData.get('room_type_id') as string,
      hourly_rate: Number(formData.get('hourly_rate')),
      minimum_hours: Number(formData.get('minimum_hours')),
      photos,
      booking_link: formData.get('booking_link') as string,
      equipment,
      specifications,
    };

    try {
      const validatedData = roomSchema.parse(roomData);

      const { error: roomError } = await supabase
        .from('rooms')
        .insert([{
          ...validatedData,
          studio_id: studioId,
        }]);

      if (roomError) throw roomError;

      navigate(`/studios/${studioId}/manage`);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Add New Room</h1>
        <p className="text-xl text-gray-600">
          Create a new recording room in your studio
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-sm p-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Room Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="room_type_id" className="block text-sm font-medium text-gray-700">
              Room Type
            </label>
            <select
              id="room_type_id"
              name="room_type_id"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a room type</option>
              {roomTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hourly_rate" className="block text-sm font-medium text-gray-700">
                Hourly Rate ($)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  id="hourly_rate"
                  name="hourly_rate"
                  min="0"
                  step="0.01"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="minimum_hours" className="block text-sm font-medium text-gray-700">
                Minimum Hours
              </label>
              <input
                type="number"
                id="minimum_hours"
                name="minimum_hours"
                min="1"
                defaultValue="1"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="booking_link" className="block text-sm font-medium text-gray-700">
              External Booking Link <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              type="url"
              id="booking_link"
              name="booking_link"
              placeholder="https://..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              If provided, this link will be used instead of the default booking flow
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos
          </label>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {photos.map((url, index) => (
                <div key={index} className="relative group">
                  <img
                    src={url}
                    alt={`Room photo ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handlePhotoRemove(index)}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    
                    setError(null);
                    try {
                      const url = await uploadStudioPhoto(file);
                      setPhotos(prev => [...prev, url]);
                    } catch (err) {
                      setError('Error uploading photo. Please try again.');
                      console.error(err);
                    }
                  };
                  
                  input.click();
                } catch (err) {
                  setError('Error initiating file upload. Please try again.');
                  console.error(err);
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Equipment
          </label>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(equipment).map(([key, value]) => (
              <label
                key={key}
                className="inline-flex items-center"
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setEquipment({
                    ...equipment,
                    [key]: e.target.checked,
                  })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Specifications
          </label>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(specifications).map(([key, value]) => (
              <label
                key={key}
                className="inline-flex items-center"
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setSpecifications({
                    ...specifications,
                    [key]: e.target.checked,
                  })}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(`/studios/${studioId}/manage`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Music className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Creating...
              </>
            ) : (
              'Create Room'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
