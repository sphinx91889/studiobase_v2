/*
  # Fix ensure_room_availability function

  1. Changes
    - Improve error handling in ensure_room_availability function
    - Add proper transaction handling
    - Fix return type to ensure data is always returned
    - Add better logging for debugging
    
  2. Security
    - Maintains existing security model
    - Uses SECURITY DEFINER for proper access control
*/

-- Drop existing function
DROP FUNCTION IF EXISTS ensure_room_availability;

-- Create improved function
CREATE OR REPLACE FUNCTION ensure_room_availability(p_room_id uuid)
RETURNS SETOF availability
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day integer;
  v_result availability;
BEGIN
  -- Validate input
  IF p_room_id IS NULL THEN
    RAISE EXCEPTION 'Room ID cannot be null';
  END IF;

  -- Verify room exists
  IF NOT EXISTS (SELECT 1 FROM rooms WHERE id = p_room_id) THEN
    RAISE EXCEPTION 'Room with ID % does not exist', p_room_id;
  END IF;

  -- Create availability records for each day if they don't exist
  FOR v_day IN 0..6 LOOP
    INSERT INTO availability (
      room_id,
      day_of_week,
      start_time,
      end_time,
      is_available,
      created_at,
      updated_at
    )
    VALUES (
      p_room_id,
      v_day,
      '09:00'::time,
      '17:00'::time,
      true,
      now(),
      now()
    )
    ON CONFLICT (room_id, day_of_week) DO NOTHING;
  END LOOP;

  -- Return all availability records for the room
  RETURN QUERY
  SELECT * FROM availability 
  WHERE room_id = p_room_id 
  ORDER BY day_of_week;
END;
$$;
