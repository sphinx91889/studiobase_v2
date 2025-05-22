/*
  # Fix studio owner email retrieval

  1. Changes
    - Drop existing functions and trigger
    - Create new function to get studio owner email that follows correct relationship path
    - Add improved error handling and logging
    - Update trigger function
    
  2. Security
    - Maintains SECURITY DEFINER for proper access
    - Preserves existing RLS policies
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
  v_debug_info jsonb;
BEGIN
  -- Get the owner's email through the correct relationship path
  WITH relationship_chain AS (
    SELECT 
      r.id as room_id,
      s.id as studio_id,
      s.organization_id,
      s.email as studio_email
    FROM rooms r
    JOIN studios s ON s.id = r.studio_id
    WHERE r.id = p_room_id
  )
  SELECT 
    COALESCE(rc.studio_email, 'info@rivieregroup.org') INTO v_owner_email
  FROM relationship_chain rc;

  -- Log the result
  SELECT jsonb_build_object(
    'room_id', p_room_id,
    'owner_email', v_owner_email
  ) INTO v_debug_info;
  
  RAISE NOTICE 'Studio owner email lookup: %', v_debug_info;

  RETURN v_owner_email;
END;
$$;

-- Create improved trigger function
CREATE OR REPLACE FUNCTION set_studio_owner_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Get and set the owner's email
  NEW.studio_owner_email := get_studio_owner_email(NEW.room_id);
  
  -- Log the update
  RAISE NOTICE 'Set studio_owner_email to % for booking %', 
    NEW.studio_owner_email, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER maintain_studio_owner_email
  BEFORE INSERT OR UPDATE OF room_id ON successful_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_studio_owner_email();

-- Update existing records
UPDATE successful_bookings
SET studio_owner_email = get_studio_owner_email(room_id)
WHERE studio_owner_email IS NULL;
