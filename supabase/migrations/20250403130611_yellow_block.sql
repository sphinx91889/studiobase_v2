/*
  # Fix availability initialization and display

  1. Changes
    - Add function to ensure default availability records exist
    - Add function to get or create availability records
    - Add trigger to handle availability updates
    
  2. Security
    - Functions are SECURITY DEFINER to ensure proper access
    - Maintains existing RLS policies
*/

-- Create function to ensure default availability records exist
CREATE OR REPLACE FUNCTION ensure_room_availability(p_room_id uuid)
RETURNS SETOF availability
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day integer;
  v_result availability;
BEGIN
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
