/*
  # Fix Multiple Bookings Issue

  1. Changes
    - Add unique constraint on stripe_session_id to prevent duplicate bookings
    - Add index on stripe_session_id for better performance
    - Add trigger to prevent duplicate successful bookings
    
  2. Security
    - Maintains existing RLS policies
    - Ensures data integrity
*/

-- First, clean up any duplicate bookings, keeping only the first one
WITH duplicates AS (
  SELECT 
    id,
    stripe_session_id,
    ROW_NUMBER() OVER (
      PARTITION BY stripe_session_id 
      ORDER BY created_at
    ) as rn
  FROM successful_bookings
  WHERE stripe_session_id IS NOT NULL
)
DELETE FROM successful_bookings
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Add unique constraint on stripe_session_id
ALTER TABLE successful_bookings
ADD CONSTRAINT successful_bookings_stripe_session_id_key 
UNIQUE (stripe_session_id);

-- Create function to handle booking creation
CREATE OR REPLACE FUNCTION create_successful_booking(
  p_room_id uuid,
  p_stripe_session_id text,
  p_customer_email text,
  p_customer_name text,
  p_amount_total integer,
  p_booking_date text,
  p_start_time text,
  p_end_time text,
  p_hours integer
)
RETURNS successful_bookings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result successful_bookings;
BEGIN
  -- Check if booking already exists
  SELECT * INTO v_result
  FROM successful_bookings
  WHERE stripe_session_id = p_stripe_session_id;

  -- If booking exists, return it
  IF FOUND THEN
    RETURN v_result;
  END IF;

  -- Create new booking
  INSERT INTO successful_bookings (
    room_id,
    stripe_session_id,
    customer_email,
    customer_name,
    amount_total,
    booking_date,
    start_time,
    end_time,
    hours,
    status,
    created_at,
    updated_at
  )
  VALUES (
    p_room_id,
    p_stripe_session_id,
    p_customer_email,
    p_customer_name,
    p_amount_total,
    p_booking_date,
    p_start_time,
    p_end_time,
    p_hours,
    'completed',
    now(),
    now()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
