/*
  # Add function to update Sunday availability

  1. Changes
    - Add function to update availability for a specific day
    - Add validation for time inputs
    - Ensure proper error handling
*/

CREATE OR REPLACE FUNCTION update_day_availability(
  p_room_id uuid,
  p_day_of_week integer,
  p_start_time time,
  p_end_time time,
  p_is_available boolean
)
RETURNS availability
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result availability;
BEGIN
  -- Validate inputs
  IF p_room_id IS NULL THEN
    RAISE EXCEPTION 'Room ID cannot be null';
  END IF;

  IF p_day_of_week NOT BETWEEN 0 AND 6 THEN
    RAISE EXCEPTION 'Day of week must be between 0 and 6';
  END IF;

  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;

  -- Update or insert availability
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
    p_day_of_week,
    p_start_time,
    p_end_time,
    p_is_available,
    now(),
    now()
  )
  ON CONFLICT (room_id, day_of_week) 
  DO UPDATE SET
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    is_available = EXCLUDED.is_available,
    updated_at = now()
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
