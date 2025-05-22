/*
  # Fix availability and booking checks
  
  1. Changes
    - Update get_available_time_slots function to properly handle room-specific availability
    - Fix time slot generation to use room's configured hours
    - Improve booking conflict detection
    - Add better validation and error handling
    
  2. Security
    - Maintains SECURITY DEFINER
    - Preserves existing RLS policies
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
      end_time
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
            -- Check various overlap conditions
            (s.slot_time::time >= b.start_time::time AND s.slot_time::time < b.end_time::time)
            OR
            ((s.slot_time::time + interval '1 hour') > b.start_time::time AND (s.slot_time::time + interval '1 hour') <= b.end_time::time)
            OR
            (s.slot_time::time <= b.start_time::time AND (s.slot_time::time + interval '1 hour') >= b.end_time::time)
        )
      THEN true
      ELSE false
    END as is_available
  FROM slots s
  ORDER BY s.slot_time;
END;
$$;

-- Create function to ensure room availability exists
CREATE OR REPLACE FUNCTION ensure_room_availability(p_room_id uuid)
RETURNS SETOF availability
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day integer;
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
