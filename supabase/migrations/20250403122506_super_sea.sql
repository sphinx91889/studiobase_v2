/*
  # Fix availability time slots and persistence

  1. Changes
    - Update get_available_time_slots function to use room's actual availability hours
    - Fix time slot generation to respect room's configured hours
    - Improve overlap detection logic
    
  2. Security
    - Maintains existing security model
    - Uses SECURITY DEFINER to ensure proper access
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
BEGIN
  -- Get day of week (0-6, Sunday is 0)
  v_day_of_week := EXTRACT(DOW FROM p_booking_date::date);
  
  -- Get room availability for this day
  SELECT * INTO v_room_availability
  FROM availability
  WHERE room_id = p_room_id
  AND day_of_week = v_day_of_week
  LIMIT 1;

  -- If no availability found or day is not available, return all slots as unavailable
  IF NOT FOUND OR NOT v_room_availability.is_available THEN
    RETURN QUERY
    WITH RECURSIVE generated_slots AS (
      SELECT '09:00'::text as slot_time
      UNION ALL
      SELECT to_char((slot_time::time + interval '1 hour')::time, 'HH24:MI')
      FROM generated_slots
      WHERE slot_time::time < '22:00'::time
    )
    SELECT slot_time, false::boolean
    FROM generated_slots;
    RETURN;
  END IF;

  -- Generate time slots based on room's configured hours
  RETURN QUERY
  WITH RECURSIVE generated_slots AS (
    SELECT v_room_availability.start_time::text as slot_time
    UNION ALL
    SELECT to_char((slot_time::time + interval '1 hour')::time, 'HH24:MI')
    FROM generated_slots
    WHERE slot_time::time < v_room_availability.end_time - interval '1 hour'
  ),
  bookings AS (
    SELECT 
      start_time,
      end_time
    FROM successful_bookings
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND status = 'completed'
  )
  SELECT 
    gs.slot_time as time_slot,
    CASE
      WHEN
        -- Check if slot is not in the past for today
        (
          p_booking_date::date > CURRENT_DATE 
          OR (
            p_booking_date::date = CURRENT_DATE 
            AND gs.slot_time::time > CURRENT_TIME
          )
        )
        -- Check if slot doesn't overlap with any booking
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE 
            -- Check if slot starts during a booking
            gs.slot_time >= b.start_time 
            AND gs.slot_time < b.end_time
        )
      THEN true
      ELSE false
    END as is_available
  FROM generated_slots gs
  ORDER BY gs.slot_time;
END;
$$;
