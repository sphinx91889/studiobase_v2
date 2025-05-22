/*
  # Fix time slot availability check function
  
  1. Changes
    - Update get_available_time_slots function to properly check availability
    - Fix time comparison logic
    - Add proper handling of room availability hours
    
  2. Security
    - Maintains existing security model
    - Function remains SECURITY DEFINER
*/

-- Drop existing function
DROP FUNCTION IF EXISTS get_available_time_slots;

-- Create improved function
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
  v_start_hour time;
  v_end_hour time;
BEGIN
  -- Get day of week (0-6, Sunday is 0)
  v_day_of_week := EXTRACT(DOW FROM p_booking_date::date);
  
  -- Get room availability for this day
  SELECT * INTO v_room_availability
  FROM availability
  WHERE room_id = p_room_id
  AND day_of_week = v_day_of_week
  LIMIT 1;

  -- If no availability found for this day, return all slots as unavailable
  IF NOT FOUND OR NOT v_room_availability.is_available THEN
    RETURN QUERY
    WITH RECURSIVE time_slots AS (
      SELECT '09:00'::text as time_slot
      UNION ALL
      SELECT to_char((time_slot::time + interval '1 hour')::time, 'HH24:MI')
      FROM time_slots
      WHERE time_slot::time < '22:00'::time
    )
    SELECT time_slot, false::boolean
    FROM time_slots;
    RETURN;
  END IF;

  -- Get room's operating hours
  v_start_hour := v_room_availability.start_time;
  v_end_hour := v_room_availability.end_time;

  -- Generate time slots and check availability
  RETURN QUERY
  WITH RECURSIVE time_slots AS (
    SELECT v_start_hour::text as time_slot
    UNION ALL
    SELECT to_char((time_slot::time + interval '1 hour')::time, 'HH24:MI')
    FROM time_slots
    WHERE time_slot::time < v_end_hour - interval '1 hour'
  )
  SELECT 
    ts.time_slot,
    CASE
      -- Check if slot is within operating hours
      WHEN ts.time_slot::time >= v_start_hour 
        AND (ts.time_slot::time + interval '1 hour') <= v_end_hour
        -- Check if slot is not already booked
        AND NOT EXISTS (
          SELECT 1 
          FROM successful_bookings sb
          WHERE sb.room_id = p_room_id
          AND sb.booking_date = p_booking_date
          AND sb.status = 'completed'
          AND (
            (sb.start_time::time <= ts.time_slot::time 
              AND sb.end_time::time > ts.time_slot::time)
            OR 
            (sb.start_time::time < (ts.time_slot::time + interval '1 hour')
              AND sb.end_time::time >= (ts.time_slot::time + interval '1 hour'))
            OR
            (sb.start_time::time >= ts.time_slot::time 
              AND sb.end_time::time <= (ts.time_slot::time + interval '1 hour'))
          )
        )
        -- Check if slot is not in the past for today
        AND (
          p_booking_date::date > CURRENT_DATE 
          OR (
            p_booking_date::date = CURRENT_DATE 
            AND ts.time_slot::time > CURRENT_TIME
          )
        )
      THEN true
      ELSE false
    END as is_available
  FROM time_slots ts
  ORDER BY ts.time_slot;
END;
$$;
