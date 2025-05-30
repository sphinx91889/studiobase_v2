/*
  # Fix Time Slot Availability Logic

  1. Changes
    - Update get_available_time_slots function to properly handle gaps between bookings
    - Fix overlap checking logic to only mark slots as unavailable when they actually overlap with a booking
    - Maintain proper time slot generation and ordering
    
  2. Notes
    - Slots between bookings (like 12 PM in your case) will now show as available
    - Maintains all other availability rules (operating hours, past times, etc)
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

  -- Get room's operating hours
  v_start_hour := v_room_availability.start_time;
  v_end_hour := v_room_availability.end_time;

  -- Generate time slots and check availability
  RETURN QUERY
  WITH RECURSIVE generated_slots AS (
    SELECT '09:00'::text as slot_time
    UNION ALL
    SELECT to_char((slot_time::time + interval '1 hour')::time, 'HH24:MI')
    FROM generated_slots
    WHERE slot_time::time < '22:00'::time
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
    gs.slot_time as time_slot,
    CASE
      -- Check if slot is within operating hours
      WHEN gs.slot_time::time >= v_start_hour 
        AND (gs.slot_time::time + interval '1 hour') <= v_end_hour
        -- Check if slot is not in the past for today
        AND (
          p_booking_date::date > CURRENT_DATE 
          OR (
            p_booking_date::date = CURRENT_DATE 
            AND gs.slot_time::time > CURRENT_TIME
          )
        )
        -- Check if slot doesn't overlap with any booking
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE gs.slot_time::time >= b.booking_start
            AND gs.slot_time::time < b.booking_end
        )
      THEN true
      ELSE false
    END as is_available
  FROM generated_slots gs
  ORDER BY gs.slot_time;
END;
$$;
