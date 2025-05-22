/*
  # Store Successful Bookings

  1. New Table
    - successful_bookings: Stores completed booking information
    - Links to rooms and includes all booking details
    - Stores Stripe session information
    
  2. Security
    - Enable RLS
    - Add policies for viewing and managing bookings
*/

CREATE TABLE public.successful_bookings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL,
  customer_email text NOT NULL,
  customer_name text,
  amount_total integer NOT NULL,
  booking_date text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  hours integer NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.successful_bookings ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_successful_bookings_room_id ON public.successful_bookings(room_id);
CREATE INDEX idx_successful_bookings_stripe_session_id ON public.successful_bookings(stripe_session_id);
CREATE INDEX idx_successful_bookings_created_at ON public.successful_bookings(created_at);

-- Create policies
CREATE POLICY "Users can view their bookings"
ON public.successful_bookings
FOR SELECT
TO authenticated
USING (
  customer_email = auth.jwt()->>'email' OR
  EXISTS (
    SELECT 1 FROM rooms
    JOIN studios ON rooms.studio_id = studios.id
    WHERE rooms.id = successful_bookings.room_id
    AND studios.organization_id = auth.uid()
  )
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION handle_successful_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_successful_booking_updated_at
  BEFORE UPDATE ON public.successful_bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_successful_booking_updated_at();
