/*
  # Fix availability handling and defaults

  1. Changes
    - Drop existing unique constraint if it exists
    - Clean up duplicate availability records
    - Re-add unique constraint
    - Update availability functions
    
  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity
*/

-- First, drop the existing constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'availability_room_day_unique'
  ) THEN
    ALTER TABLE availability DROP CONSTRAINT availability_room_day_unique;
  END IF;
END $$;

-- Create a temporary table to store the records we want to keep
CREATE TEMP TABLE temp_availability AS
WITH ranked_availability AS (
  SELECT 
    id,
    room_id,
    day_of_week,
    start_time,
    end_time,
    is_available,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY room_id, day_of_week 
      ORDER BY updated_at DESC, id DESC
    ) as rn
  FROM availability
)
SELECT 
  id,
  room_id,
  day_of_week,
  start_time,
  end_time,
  is_available,
  created_at,
  updated_at
FROM ranked_availability
WHERE rn = 1;

-- Delete all records from the original table
TRUNCATE availability;

-- Reinsert the deduplicated records
INSERT INTO availability
SELECT * FROM temp_availability;

-- Drop the temporary table
DROP TABLE temp_availability;

-- Add the unique constraint
ALTER TABLE availability
ADD CONSTRAINT availability_room_day_unique 
UNIQUE (room_id, day_of_week);

-- Create or replace the upsert function
CREATE OR REPLACE FUNCTION upsert_availability(
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

-- Create or replace the ensure_room_availability function
CREATE OR REPLACE FUNCTION ensure_room_availability(p_room_id uuid)
RETURNS SETOF availability
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day integer;
BEGIN
  FOR v_day IN 0..6 LOOP
    -- Check if availability exists for this day
    IF NOT EXISTS (
      SELECT 1 FROM availability 
      WHERE room_id = p_room_id AND day_of_week = v_day
    ) THEN
      -- Create default availability
      PERFORM upsert_availability(
        p_room_id,
        v_day,
        '09:00'::time,
        '17:00'::time,
        true
      );
    END IF;
  END LOOP;
  
  -- Return all availability records for the room
  RETURN QUERY
  SELECT * FROM availability 
  WHERE room_id = p_room_id 
  ORDER BY day_of_week;
END;
$$;
