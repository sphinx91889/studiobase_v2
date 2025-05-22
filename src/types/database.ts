export interface Organization {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

export interface Studio {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  photos?: string[];
  amenities?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RoomType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Room {
  id: string;
  studio_id: string;
  room_type_id: string;
  name: string;
  description?: string;
  hourly_rate: number;
  minimum_hours: number;
  photos?: string[];
  equipment?: Record<string, any>;
  specifications?: Record<string, any>;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  genres?: string[];
  preferred_location?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  room_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_amount: number;
  stripe_payment_intent_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  room_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}
