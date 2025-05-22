/*
  # Add functions for checking booking availability

  1. New Functions
    - check_time_slot_availability: Checks if a time slot is available
    - get_available_time_slots: Gets all available time slots for a given date
    
  2. Security
    - Functions are SECURITY DEFINER to ensure proper access control
    - Proper error handling and validation
*/

-- Function to check if a specific time slot is available
CREATE OR REPLACE FUNCTION check_time_slot_availability(
  p_room_id uuid,
  p_booking_date text,
  p_start_time text,
  p_end_time text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week integer;
BEGIN
  -- Get day of week (0-6, Sunday is 0)
  v_day_of_week := EXTRACT(DOW FROM p_booking_date::date);

  -- Check if within room availability
  IF NOT EXISTS (
    SELECT 1 
    FROM availability
    WHERE room_id = p_room_id
    AND day_of_week = v_day_of_week
    AND is_available = true
    AND start_time <= p_start_time::time
    AND end_time >= p_end_time::time
  ) THEN
    RETURN false;
  END IF;

  -- Check for conflicts with existing bookings
  RETURN NOT EXISTS (
    SELECT 1 
    FROM successful_bookings
    WHERE room_id = p_room_id
    AND booking_date = p_booking_date
    AND status = 'completed'
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;

-- Function to get all available time slots for a date
CREATE OR REPLACE FUNCTION get_available_time_slots(
  p_room_id uuid,
  p_booking_date text
)
RETURNS TABLE (
  time_slot text,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week integer;
  v_room_availability availability%ROWTYPE;
BEGIN
  -- Get day of week
  v_day_of_week := EXTRACT(DOW FROM p_booking_date::date);
  
  -- Get room availability for this day
  SELECT * INTO v_room_availability
  FROM availability
  WHERE room_id = p_room_id
  AND day_of_week = v_day_of_week;

  -- Generate time slots
  RETURN QUERY
  WITH RECURSIVE time_slots AS (
    SELECT 
      '09:00'::text as time_slot,
      check_time_slot_availability(p_room_id, p_booking_date, '09:00', '10:00') as is_available
    UNION ALL
    SELECT 
      to_char((time_slot::time + interval '1 hour')::time, 'HH24:MI'),
      check_time_slot_availability(
        p_room_id, 
        p_booking_date,
        to_char((time_slot::time + interval '1 hour')::time, 'HH24:MI'),
        to_char((time_slot::time + interval '2 hour')::time, 'HH24:MI')
      )
    FROM time_slots
    WHERE time_slot::time < '22:00'::time
  )
  SELECT * FROM time_slots;
END;
$$;
