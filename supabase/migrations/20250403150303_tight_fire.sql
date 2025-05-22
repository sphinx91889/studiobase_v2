/*
  # Fix Studio Owner Email Retrieval

  1. Changes
    - Drop existing functions and trigger
    - Create improved function with better relationship traversal
    - Add detailed logging for debugging
    - Update trigger with better error handling
    - Add batch update for existing records

  2. Security
    - Maintains SECURITY DEFINER
    - Preserves existing RLS policies
*/

-- Drop existing functions and trigger
DROP TRIGGER IF EXISTS maintain_studio_owner_email ON successful_bookings;
DROP FUNCTION IF EXISTS set_studio_owner_email();
DROP FUNCTION IF EXISTS get_studio_owner_email(uuid);

-- Create improved function to get studio owner email with detailed logging
CREATE OR REPLACE FUNCTION get_studio_owner_email(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_email text;
  v_studio_id uuid;
  v_organization_id uuid;
  v_debug_info jsonb;
BEGIN
  -- Get studio_id and organization_id with detailed logging
  SELECT 
    s.id,
    s.organization_id,
    jsonb_build_object(
      'room_id', r.id,
      'studio_id', s.id,
      'organization_id', s.organization_id
    ) INTO v_studio_id, v_organization_id, v_debug_info
  FROM rooms r
  JOIN studios s ON s.id = r.studio_id
  WHERE r.id = p_room_id;

  -- Log relationship chain
  RAISE NOTICE 'Relationship chain: %', v_debug_info;

  -- If no studio found, log and return
  IF v_studio_id IS NULL THEN
    RAISE WARNING 'No studio found for room_id: %', p_room_id;
    RETURN NULL;
  END IF;

  -- Get owner email directly from auth.users
  SELECT email INTO v_owner_email
  FROM auth.users
  WHERE id = v_organization_id;

  -- Log result
  IF v_owner_email IS NULL THEN
    RAISE WARNING 'No email found for organization_id: % (studio_id: %)', v_organization_id, v_studio_id;
  ELSE
    RAISE NOTICE 'Found email % for organization_id: %', v_owner_email, v_organization_id;
  END IF;

  RETURN v_owner_email;
END;
$$;

-- Create improved trigger function with error handling
CREATE OR REPLACE FUNCTION set_studio_owner_email()
RETURNS TRIGGER AS $$
DECLARE
  v_email text;
  v_debug_info jsonb;
BEGIN
  -- Get debug info for logging
  SELECT jsonb_build_object(
    'booking_id', NEW.id,
    'room_id', NEW.room_id,
    'customer_email', NEW.customer_email
  ) INTO v_debug_info;

  -- Log trigger execution
  RAISE NOTICE 'Setting studio owner email for: %', v_debug_info;

  -- Get and set the owner's email
  v_email := get_studio_owner_email(NEW.room_id);
  
  -- Set email and log result
  IF v_email IS NOT NULL THEN
    NEW.studio_owner_email := v_email;
    RAISE NOTICE 'Successfully set studio_owner_email to % for booking %', v_email, NEW.id;
  ELSE
    RAISE WARNING 'Failed to set studio_owner_email for booking %. Check organization relationships.', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER maintain_studio_owner_email
  BEFORE INSERT OR UPDATE OF room_id ON successful_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_studio_owner_email();

-- Update existing records with detailed logging
DO $$
DECLARE
  v_booking RECORD;
  v_email text;
  v_count integer := 0;
  v_success integer := 0;
  v_failed integer := 0;
BEGIN
  -- Log start of batch update
  RAISE NOTICE 'Starting batch update of studio_owner_email';

  FOR v_booking IN 
    SELECT id, room_id, customer_email 
    FROM successful_bookings 
    WHERE studio_owner_email IS NULL 
  LOOP
    v_count := v_count + 1;
    
    -- Get owner email
    v_email := get_studio_owner_email(v_booking.room_id);
    
    IF v_email IS NOT NULL THEN
      -- Update record
      UPDATE successful_bookings
      SET studio_owner_email = v_email
      WHERE id = v_booking.id;
      
      v_success := v_success + 1;
      RAISE NOTICE 'Updated booking % with email %', v_booking.id, v_email;
    ELSE
      v_failed := v_failed + 1;
      RAISE WARNING 'Failed to update booking % (customer: %)', 
        v_booking.id, v_booking.customer_email;
    END IF;
  END LOOP;

  -- Log final results
  RAISE NOTICE 'Batch update complete. Total: %, Success: %, Failed: %',
    v_count, v_success, v_failed;
END;
$$;
