/*
  # Fix bookings display and user assignment

  1. Changes
    - Drop existing policies
    - Add new policies for viewing bookings
    - Update user assignment trigger to handle nested JSON
    - Add index for better query performance
    
  2. Security
    - Maintains proper access control
    - Ensures users can see relevant bookings
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their assigned bookings" ON public.bookings2;
DROP POLICY IF EXISTS "Studio owners can manage bookings" ON public.bookings2;

-- Create new policies
CREATE POLICY "Users can view their assigned bookings"
ON public.bookings2
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM rooms
    JOIN studios ON rooms.studio_id = studios.id
    WHERE rooms.id = bookings2.room_id
    AND studios.organization_id = auth.uid()
  )
);

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

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS assign_booking_user_trigger ON public.bookings2;
DROP FUNCTION IF EXISTS assign_booking_user();

-- Create improved function to assign user based on calendar name
CREATE OR REPLACE FUNCTION assign_booking_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the booking is for Renegade Studio
  IF NEW.body IS NOT NULL AND 
     NEW.body->>'calendar' IS NOT NULL AND 
     NEW.body->'calendar'->>'calendarName' = 'Renegade Studio 2HR Block - A Room w/ Engineer' THEN
    -- Assign to specific user
    NEW.user_id := (
      SELECT id FROM auth.users
      WHERE email = 'info@rivieregroup.org'
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on insert or update
CREATE TRIGGER assign_booking_user_trigger
  BEFORE INSERT OR UPDATE ON public.bookings2
  FOR EACH ROW
  EXECUTE FUNCTION assign_booking_user();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_bookings2_user_id ON public.bookings2(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings2_room_id ON public.bookings2(room_id);
CREATE INDEX IF NOT EXISTS idx_bookings2_created_at ON public.bookings2(created_at);

-- Reprocess existing bookings
UPDATE public.bookings2 SET updated_at = NOW();
