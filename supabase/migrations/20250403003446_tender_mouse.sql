/*
  # Add user assignment for specific calendar bookings

  1. Changes
    - Add user_id column to bookings2 table
    - Add function to automatically assign user based on calendar name
    - Add trigger to run the function on insert or update
    
  2. Security
    - Maintains existing RLS policies
    - Only affects bookings with specific calendar name
*/

-- Add user_id column if it doesn't exist
ALTER TABLE public.bookings2
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Create function to assign user based on calendar name
CREATE OR REPLACE FUNCTION assign_booking_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the booking is for Renegade Studio 2HR Block
  IF NEW.body->>'calendarName' = 'Renegade Studio 2HR Block - A Room w/ Engineer' THEN
    -- Assign to specific user
    NEW.user_id = (
      SELECT id FROM auth.users
      WHERE email = 'info@rivieregroup.org'
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on insert or update
DROP TRIGGER IF EXISTS assign_booking_user_trigger ON public.bookings2;
CREATE TRIGGER assign_booking_user_trigger
  BEFORE INSERT OR UPDATE ON public.bookings2
  FOR EACH ROW
  EXECUTE FUNCTION assign_booking_user();
