/*
  # Create bookings2 table for webhook data

  1. New Table
    - bookings2: Stores webhook booking data with appropriate types
    - All webhook-related fields as text to match incoming data
    - Maintains relationship with rooms table
    - Includes status and execution mode constraints

  2. Security
    - Enables RLS
    - Adds policies for public viewing and studio owner management
*/

-- Create the bookings2 table
CREATE TABLE public.bookings2 (
  id text PRIMARY KEY,
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
  webhookUrl text,
  executionMode text DEFAULT 'pending',
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  headers text,
  params text,
  query text,
  body jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bookings2 ENABLE ROW LEVEL SECURITY;

-- Add constraints
ALTER TABLE public.bookings2
ADD CONSTRAINT bookings2_status_check
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'failed', 'rescheduled'));

ALTER TABLE public.bookings2
ADD CONSTRAINT bookings2_execution_mode_check
CHECK (executionMode IN ('pending', 'processing', 'completed', 'failed', 'test'));

-- Create policies
CREATE POLICY "Bookings are viewable by everyone"
ON public.bookings2
FOR SELECT
TO public
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
