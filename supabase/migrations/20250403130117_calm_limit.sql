/*
  # Fix time slots generation

  1. Changes
    - Update get_available_time_slots function to use room's configured hours
    - Remove hardcoded 09:00-22:00 time range
    - Fix time slot generation to respect room's availability settings
    
  2. Notes
    - Time slots are now generated based on room's start_time and end_time
    - Maintains proper availability checking
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

  -- If no availability found or day is not available, return empty result
  IF NOT FOUND OR NOT v_room_availability.is_available THEN
    RETURN;
  END IF;

  -- Generate time slots based on room's configured hours
  RETURN QUERY
  WITH RECURSIVE generated_slots AS (
    -- Start with the room's configured start time
    SELECT v_room_availability.start_time::text as slot_time
    UNION ALL
    SELECT to_char((slot_time::time + interval '1 hour')::time, 'HH24:MI')
    FROM generated_slots
    -- Stop one hour before end time to ensure full hour slots
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
