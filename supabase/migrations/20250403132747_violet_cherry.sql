/*
  # Update time slots range to 12:00 AM - 11:00 PM
  
  1. Changes
    - Modify get_available_time_slots function to show slots from 00:00 to 23:00
    - Keep existing availability and booking validation logic
    - Update time slot generation
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
    WITH RECURSIVE slots AS (
      SELECT '00:00'::text as slot_time
      UNION ALL
      SELECT to_char((slot_time::time + interval '1 hour')::time, 'HH24:MI')
      FROM slots
      WHERE slot_time::time < '23:00'::time
    )
    SELECT slot_time, false::boolean
    FROM slots;
    RETURN;
  END IF;

  -- Generate time slots and check availability
  RETURN QUERY
  WITH RECURSIVE slots AS (
    SELECT '00:00'::text as slot_time
    UNION ALL
    SELECT to_char((slot_time::time + interval '1 hour')::time, 'HH24:MI')
    FROM slots
    WHERE slot_time::time < '23:00'::time
  ),
  bookings AS (
    SELECT 
      start_time::time as booking_start,
      end_time::time as booking_end
    FROM successful_bookings
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND status = 'completed'
  )
  SELECT 
    s.slot_time as time_slot,
    CASE
      WHEN
        -- Check if slot is not in the past for today
        (
          p_booking_date::date > CURRENT_DATE 
          OR (
            p_booking_date::date = CURRENT_DATE 
            AND s.slot_time::time > CURRENT_TIME
          )
        )
        -- Check if slot doesn't overlap with any booking
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE 
            -- Check various overlap conditions
            (s.slot_time::time >= b.booking_start AND s.slot_time::time < b.booking_end)
            OR
            ((s.slot_time::time + interval '1 hour') > b.booking_start AND (s.slot_time::time + interval '1 hour') <= b.booking_end)
            OR
            (s.slot_time::time <= b.booking_start AND (s.slot_time::time + interval '1 hour') >= b.booking_end)
        )
      THEN true
      ELSE false
    END as is_available
  FROM slots s
  ORDER BY s.slot_time;
END;
$$;
