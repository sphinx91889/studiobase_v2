/*
  # Add Booking Handler Function
  
  1. New Function
    - create_booking: Handles booking creation with conflict checking
    - Runs in a transaction to ensure data consistency
    - Returns the created booking or raises an error
    
  2. Security
    - Function is accessible to authenticated users
    - Validates booking times against availability
    - Checks for conflicts before creating booking
*/

CREATE OR REPLACE FUNCTION create_booking(
  p_room_id uuid,
  p_booking_date text,
  p_start_time text,
  p_end_time text,
  p_stripe_session_id text,
  p_customer_email text,
  p_customer_name text,
  p_amount_total integer,
  p_hours integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_day_of_week integer;
  v_booking_record json;
BEGIN
  -- Get day of week (0-6, Sunday is 0)
  v_day_of_week := EXTRACT(DOW FROM p_booking_date::date);

  -- Start transaction
  BEGIN
    -- Check if the time slot is within the room's availability
    IF NOT EXISTS (
      SELECT 1 
      FROM availability
      WHERE room_id = p_room_id
      AND day_of_week = v_day_of_week
      AND is_available = true
      AND start_time <= p_start_time::time
      AND end_time >= p_end_time::time
    ) THEN
      RAISE EXCEPTION 'Time slot is not available for booking';
    END IF;

    -- Check for conflicts with existing bookings
    IF EXISTS (
      SELECT 1 
      FROM successful_bookings
      WHERE room_id = p_room_id
      AND booking_date = p_booking_date
      AND status = 'completed'
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      )
    ) THEN
      RAISE EXCEPTION 'Time slot is already booked';
    END IF;

    -- Create the booking
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
      status
    ) VALUES (
      p_room_id,
      p_stripe_session_id,
      p_customer_email,
      p_customer_name,
      p_amount_total,
      p_booking_date,
      p_start_time,
      p_end_time,
      p_hours,
      'completed'
    )
    RETURNING row_to_json(successful_bookings.*) INTO v_booking_record;

    RETURN v_booking_record;
  EXCEPTION
    WHEN others THEN
      -- Rollback will happen automatically
      RAISE;
  END;
END;
$$;
