import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Music, Upload, X, DollarSign, Save, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadStudioPhoto } from '../lib/storage';
import { AvailabilityDisplay, AvailabilityDisplayRef } from '../components/AvailabilityDisplay';
import { useAuth } from '../contexts/AuthContext';
import { z } from 'zod';
import type { Room, RoomType } from '../types/database';

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

export function RoomEdit() {
  const { id: studioId, roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [equipment, setEquipment] = useState(defaultEquipment);
  const [specifications, setSpecifications] = useState(defaultSpecifications);
  const availabilityRef = useRef<AvailabilityDisplayRef>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Form state to avoid querySelector issues
  const [formValues, setFormValues] = useState({
    name: '',
    description: '',
    room_type_id: '',
    hourly_rate: 0,
    minimum_hours: 1,
    booking_link: ''
  });

  useEffect(() => {
    async function loadData() {
      if (!studioId || !roomId) return;
      if (!user) return;

      try {
        // First ensure availability records exist
        const { error: availabilityError } = await supabase
          .rpc('ensure_room_availability', {
            p_room_id: roomId
          });

        if (availabilityError) {
          console.error('Error ensuring availability:', availabilityError);
        }

        // Load room types
        const { data: roomTypesData } = await supabase
          .from('room_types')
          .select('*')
          .order('name');
        setRoomTypes(roomTypesData || []);

        // Load room details
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError) throw roomError;
        
        setRoom(roomData);
        setPhotos(roomData.photos || []);
        setEquipment({
          ...defaultEquipment,
          ...(roomData.equipment || {})
        });
        setSpecifications({
          ...defaultSpecifications,
          ...(roomData.specifications || {})
        });
        
        // Initialize form values
        setFormValues({
          name: roomData.name || '',
          description: roomData.description || '',
          room_type_id: roomData.room_type_id || '',
          hourly_rate: roomData.hourly_rate || 0,
          minimum_hours: roomData.minimum_hours || 1,
          booking_link: roomData.booking_link || ''
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load room');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [studioId, roomId, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // First save all availability times
      if (availabilityRef.current) {
        const availabilitySaved = await availabilityRef.current.handleSaveAllTimes();
        if (!availabilitySaved) {
          throw new Error('Failed to save availability times');
        }
      }

      // Use the form state values instead of querying the DOM
      const roomData: RoomFormData = {
        name: formValues.name,
        description: formValues.description,
        room_type_id: formValues.room_type_id,
        hourly_rate: formValues.hourly_rate,
        minimum_hours: formValues.minimum_hours,
        photos,
        booking_link: formValues.booking_link,
        equipment,
        specifications,
      };

      const validatedData = roomSchema.parse(roomData);

      const { error: roomError } = await supabase
        .from('rooms')
        .update(validatedData)
        .eq('id', roomId);

      if (roomError) throw roomError;

      navigate(`/studios/${studioId}/manage`);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to update room');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoRemove = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: name === 'hourly_rate' || name === 'minimum_hours' ? Number(value) : value
    }));
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
      <button
        onClick={() => navigate(`/studios/${studioId}/manage`)}
        className="inline-flex items-center text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back to Studio
      </button>

      <header className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">Edit Room</h1>
        <p className="text-xl text-gray-600">
          Update your recording room details
        </p>
      </header>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-sm p-6">
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
              value={formValues.name}
              onChange={handleInputChange}
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
              value={formValues.room_type_id}
              onChange={handleInputChange}
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
              value={formValues.description}
              onChange={handleInputChange}
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
                  value={formValues.hourly_rate}
                  onChange={handleInputChange}
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
                value={formValues.minimum_hours}
                onChange={handleInputChange}
                min="1"
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
              value={formValues.booking_link}
              onChange={handleInputChange}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Availability
          </label>
          <AvailabilityDisplay ref={availabilityRef} roomId={roomId} />
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
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Save className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
