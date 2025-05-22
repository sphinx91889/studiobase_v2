/*
  # Create bookings2 table for webhook data

  1. New Table
    - bookings2: Stores booking data from webhooks
    - All relevant fields for appointment details
    - Proper constraints and foreign keys
    - RLS policies for security

  2. Security
    - Enable RLS
    - Add policies for studio owners and users
    - Add indexes for performance
*/

-- Create the bookings2 table
CREATE TABLE public.bookings2 (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text,
  email text,
  phone text,
  appointment_start_date text,
  appointment_start_time text,
  appointment_end_date text,
  appointment_end_time text,
  cancellation_link text,
  reschedule_link text,
  add_to_google_calendar text,
  add_to_ical_outlook text,
  appointment_title text,
  webhookurl text,
  executionmode text DEFAULT 'pending',
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  headers text,
  params text,
  query text,
  body jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.bookings2 ENABLE ROW LEVEL SECURITY;

-- Add constraints
ALTER TABLE public.bookings2
ADD CONSTRAINT bookings2_status_check
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'failed', 'rescheduled'));

ALTER TABLE public.bookings2
ADD CONSTRAINT bookings2_execution_mode_check
CHECK (executionmode IN ('pending', 'processing', 'completed', 'failed', 'test'));

-- Create indexes
CREATE INDEX idx_bookings2_room_id ON public.bookings2(room_id);
CREATE INDEX idx_bookings2_user_id ON public.bookings2(user_id);
CREATE INDEX idx_bookings2_created_at ON public.bookings2(created_at);

-- Create policies
CREATE POLICY "Anyone can view bookings"
ON public.bookings2
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Studio owners can manage bookings"
ON public.bookings2
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    JOIN studios ON rooms.studio_id = studios.id
    WHERE rooms.id = bookings2.room_id
    AND studios.organization_id = auth.uid()
  )
);
