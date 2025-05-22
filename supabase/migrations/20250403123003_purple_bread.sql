/*
  # Fix Availability Duplicates and Add Constraint

  1. Changes
    - Remove duplicate availability records, keeping the most recently updated one
    - Add unique constraint for room_id and day_of_week
    - Create upsert function for availability records
    
  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity
*/

-- First, create a temporary table to store the records we want to keep
CREATE TEMP TABLE temp_availability AS
WITH ranked_availability AS (
  SELECT 
    id,
    room_id,
    day_of_week,
    ROW_NUMBER() OVER (
      PARTITION BY room_id, day_of_week 
      ORDER BY updated_at DESC
    ) as rn
  FROM availability
)
SELECT a.*
FROM availability a
JOIN ranked_availability ra ON a.id = ra.id
WHERE ra.rn = 1;

-- Delete all records from the original table
DELETE FROM availability;

-- Reinsert the deduplicated records
INSERT INTO availability
SELECT * FROM temp_availability;

-- Drop the temporary table
DROP TABLE temp_availability;

-- Now add the unique constraint
ALTER TABLE availability
ADD CONSTRAINT availability_room_day_unique 
UNIQUE (room_id, day_of_week);

-- Create function to handle availability upserts
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
    is_available
  )
  VALUES (
    p_room_id,
    p_day_of_week,
    p_start_time,
    p_end_time,
    p_is_available
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
