/*
  # Add Booking Conflict Check Function
  
  1. New Function
    - check_booking_conflicts: Checks if a room is already booked for a given time period
    - Returns true if there's a conflict, false if the slot is available
    
  2. Security
    - Function is accessible to all authenticated users
    - Uses successful_bookings table to check conflicts
*/

CREATE OR REPLACE FUNCTION check_booking_conflicts(
  p_room_id uuid,
  p_booking_date text,
  p_start_time text,
  p_end_time text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM successful_bookings
    WHERE room_id = p_room_id
    AND booking_date = p_booking_date
    AND (
      -- Check if the new booking overlaps with any existing booking
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
    AND status = 'completed'
  );
END;
$$;
