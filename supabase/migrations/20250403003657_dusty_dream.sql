/*
  # Fix booking user assignment

  1. Changes
    - Update trigger function to handle JSON parsing more robustly
    - Add better error handling for JSON extraction
    - Improve calendar name matching logic
    
  2. Security
    - Maintains existing security model
    - Uses SECURITY DEFINER to ensure proper access
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS assign_booking_user_trigger ON public.bookings2;
DROP FUNCTION IF EXISTS assign_booking_user();

-- Create improved function to assign user based on calendar name
CREATE OR REPLACE FUNCTION assign_booking_user()
RETURNS TRIGGER AS $$
DECLARE
  calendar_name text;
BEGIN
  -- Extract calendar name from body, handling potential NULL or invalid JSON
  IF NEW.body IS NOT NULL AND NEW.body ? 'calendar' AND NEW.body->'calendar' ? 'calendarName' THEN
    calendar_name := NEW.body->'calendar'->>'calendarName';
  ELSE
    calendar_name := NULL;
  END IF;

  -- Debug log
  RAISE NOTICE 'Processing booking with calendar name: %', calendar_name;

  -- Check if the booking is for Renegade Studio
  IF calendar_name = 'Renegade Studio 2HR Block - A Room w/ Engineer' THEN
    -- Assign to specific user
    NEW.user_id := (
      SELECT id FROM auth.users
      WHERE email = 'info@rivieregroup.org'
      LIMIT 1
    );
    
    -- Debug log
    RAISE NOTICE 'Assigned booking to user_id: %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run on insert or update
CREATE TRIGGER assign_booking_user_trigger
  BEFORE INSERT OR UPDATE ON public.bookings2
  FOR EACH ROW
  EXECUTE FUNCTION assign_booking_user();

-- Reprocess existing bookings
DO $$
BEGIN
  -- Update all existing bookings to trigger the function
  UPDATE public.bookings2 SET updated_at = NOW();
END $$;
