/*
  # Fix Booking Availability Check

  1. Changes
    - Update get_available_time_slots function to properly handle time ranges
    - Fix booking overlap detection for multi-hour bookings
    - Add better validation for time slots
    
  2. Notes
    - Properly handles bookings that span multiple hours
    - Uses correct time range comparisons
    - Maintains existing security model
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
  WITH RECURSIVE slots AS (
    -- Start with the room's configured start time
    SELECT v_room_availability.start_time::text as slot_time
    UNION ALL
    SELECT to_char((slot_time::time + interval '1 hour')::time, 'HH24:MI')
    FROM slots
    -- Stop one hour before end time to ensure full hour slots
    WHERE slot_time::time < v_room_availability.end_time - interval '1 hour'
  ),
  bookings AS (
    -- Get existing bookings for this room and date
    SELECT 
      start_time,
      end_time,
      -- Calculate the duration in hours
      EXTRACT(EPOCH FROM (end_time::time - start_time::time))/3600 as duration
    FROM successful_bookings
    WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND status = 'completed'
  )
  SELECT 
    s.slot_time as time_slot,
    CASE
      WHEN
        -- Check if slot is within operating hours
        s.slot_time::time >= v_room_availability.start_time
        AND (s.slot_time::time + interval '1 hour') <= v_room_availability.end_time
        -- Check if slot is not in the past for today
        AND (
          p_booking_date::date > CURRENT_DATE 
          OR (
            p_booking_date::date = CURRENT_DATE 
            AND s.slot_time::time > CURRENT_TIME
          )
        )
        -- Check if slot doesn't overlap with any existing booking
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE 
            -- Check if the slot falls within any booking's time range
            s.slot_time::time >= b.start_time::time
            AND s.slot_time::time < b.end_time::time
            OR
            -- Check if a booking starts during this slot
            (b.start_time::time >= s.slot_time::time 
             AND b.start_time::time < (s.slot_time::time + interval '1 hour'))
            OR
            -- Check if a booking ends during this slot
            (b.end_time::time > s.slot_time::time 
             AND b.end_time::time <= (s.slot_time::time + interval '1 hour'))
        )
      THEN true
      ELSE false
    END as is_available
  FROM slots s
  ORDER BY s.slot_time;
END;
$$;
