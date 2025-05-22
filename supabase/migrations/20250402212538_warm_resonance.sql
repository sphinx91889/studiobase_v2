/*
  # Initial Schema for StudioBase Platform

  1. New Tables
    - organizations
      - Represents studio companies/brands that can have multiple locations
    - studios
      - Physical studio locations with address and contact info
    - rooms
      - Individual bookable spaces within studios
    - room_types
      - Categories for rooms (recording, mixing, podcast, etc.)
    - bookings
      - Reservation records with status and payment info
    - profiles
      - Extended user profile information
    - availability
      - Studio room availability slots

  2. Security
    - Enable RLS on all tables
    - Policies for:
      - Public read access to studios and rooms
      - Owner-only write access to studios
      - Authenticated user booking access
      - Profile management
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  logo_url text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Studios table
CREATE TABLE studios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  country text NOT NULL,
  postal_code text NOT NULL,
  latitude numeric,
  longitude numeric,
  phone text,
  email text,
  photos text[],
  amenities jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE studios ENABLE ROW LEVEL SECURITY;

-- Room types
CREATE TABLE room_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

-- Insert default room types
INSERT INTO room_types (name, description) VALUES
  ('Recording Studio', 'Professional recording space for music production'),
  ('Mixing Room', 'Dedicated space for audio mixing and mastering'),
  ('Podcast Studio', 'Setup for podcast recording and production'),
  ('Rehearsal Space', 'Room for band practice and rehearsals'),
  ('Production Suite', 'Full suite for music production and editing');

-- Rooms table
CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  studio_id uuid REFERENCES studios(id) ON DELETE CASCADE,
  room_type_id uuid REFERENCES room_types(id),
  name text NOT NULL,
  description text,
  hourly_rate numeric NOT NULL,
  minimum_hours integer DEFAULT 1,
  photos text[],
  equipment jsonb,
  specifications jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  bio text,
  genres text[],
  preferred_location jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Bookings table
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount numeric NOT NULL,
  stripe_payment_intent_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Availability table
CREATE TABLE availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizations
CREATE POLICY "Organizations are viewable by everyone"
  ON organizations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Organizations are editable by owners"
  ON organizations FOR ALL
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM studios
      WHERE id IN (
        SELECT studio_id FROM rooms
        WHERE id IN (
          SELECT room_id FROM bookings
          WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Studios
CREATE POLICY "Studios are viewable by everyone"
  ON studios FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Studios are editable by organization owners"
  ON studios FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE id IN (
        SELECT organization_id FROM studios
        WHERE id IN (
          SELECT studio_id FROM rooms
          WHERE id IN (
            SELECT room_id FROM bookings
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- Rooms
CREATE POLICY "Rooms are viewable by everyone"
  ON rooms FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Rooms are editable by studio owners"
  ON rooms FOR ALL
  TO authenticated
  USING (
    studio_id IN (
      SELECT id FROM studios
      WHERE organization_id IN (
        SELECT id FROM organizations
        WHERE id IN (
          SELECT organization_id FROM studios
          WHERE id IN (
            SELECT studio_id FROM rooms
            WHERE id IN (
              SELECT room_id FROM bookings
              WHERE user_id = auth.uid()
            )
          )
        )
      )
    )
  );

-- Room Types
CREATE POLICY "Room types are viewable by everyone"
  ON room_types FOR SELECT
  TO public
  USING (true);

-- Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Bookings
CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Availability
CREATE POLICY "Availability is viewable by everyone"
  ON availability FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Availability is editable by studio owners"
  ON availability FOR ALL
  TO authenticated
  USING (
    room_id IN (
      SELECT id FROM rooms
      WHERE studio_id IN (
        SELECT id FROM studios
        WHERE organization_id IN (
          SELECT id FROM organizations
          WHERE id IN (
            SELECT organization_id FROM studios
            WHERE id IN (
              SELECT studio_id FROM rooms
              WHERE id IN (
                SELECT room_id FROM bookings
                WHERE user_id = auth.uid()
              )
            )
          )
        )
      )
    )
  );

-- Functions

-- Function to check room availability
CREATE OR REPLACE FUNCTION check_room_availability(
  room_id uuid,
  start_time timestamptz,
  end_time timestamptz
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.room_id = check_room_availability.room_id
    AND status != 'cancelled'
    AND (
      (start_time, end_time) OVERLAPS (bookings.start_time, bookings.end_time)
    )
  );
END;
$$;
