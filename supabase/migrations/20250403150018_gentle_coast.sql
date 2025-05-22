/*
  # Fix studio owner email retrieval

  1. Changes
    - Drop existing functions and trigger
    - Create new function that correctly follows relationship path through organizations
    - Add better error handling and logging
    - Update existing records
    
  2. Security
    - Maintains SECURITY DEFINER
    - Preserves RLS policies
*/

-- Drop existing functions and trigger
DROP TRIGGER IF EXISTS maintain_studio_owner_email ON successful_bookings;
DROP FUNCTION IF EXISTS set_studio_owner_email();
DROP FUNCTION IF EXISTS get_studio_owner_email(uuid);

-- Create improved function to get studio owner email
CREATE OR REPLACE FUNCTION get_studio_owner_email(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_email text;
BEGIN
  -- Get the owner's email through the correct relationship path
  SELECT au.email INTO v_owner_email
  FROM rooms r
  JOIN studios s ON s.id = r.studio_id
  JOIN organizations o ON o.id = s.organization_id
  JOIN auth.users au ON au.id = o.id
  WHERE r.id = p_room_id;

  -- If no email found, raise a warning
  IF v_owner_email IS NULL THEN
    RAISE WARNING 'No owner email found for room_id: %. Verify organization relationship.', p_room_id;
  END IF;

  RETURN v_owner_email;
END;
$$;

-- Create improved trigger function
CREATE OR REPLACE FUNCTION set_studio_owner_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get and set the owner's email
  NEW.studio_owner_email := get_studio_owner_email(NEW.room_id);
  
  -- Log if no email was found
  IF NEW.studio_owner_email IS NULL THEN
    RAISE WARNING 'Failed to set studio owner email for booking: %. Check organization relationships.', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER maintain_studio_owner_email
  BEFORE INSERT OR UPDATE OF room_id ON successful_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_studio_owner_email();

-- Update existing records with better error handling
DO $$
DECLARE
  v_booking RECORD;
  v_email text;
BEGIN
  FOR v_booking IN SELECT id, room_id FROM successful_bookings WHERE studio_owner_email IS NULL LOOP
    v_email := get_studio_owner_email(v_booking.room_id);
    IF v_email IS NOT NULL THEN
      UPDATE successful_bookings
      SET studio_owner_email = v_email
      WHERE id = v_booking.id;
    END IF;
  END LOOP;
END;
$$;
