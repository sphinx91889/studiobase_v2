/*
  # Update check_time_slot_availability function to support timezone
  
  1. Changes
    - Add timezone parameter to check_time_slot_availability function
    - Update function to handle timezone-aware booking checks
    
  2. Security
    - No security changes
*/

-- Update the check_time_slot_availability function to accept a timezone parameter
CREATE OR REPLACE FUNCTION check_time_slot_availability(
  p_room_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_timezone TEXT DEFAULT 'America/New_York'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_overlapping_count INTEGER;
BEGIN
  -- Check if there are any overlapping bookings
  SELECT COUNT(*)
  INTO v_overlapping_count
  FROM bookings
  WHERE room_id = p_room_id
    AND booking_date = p_booking_date
    AND (
      (start_time <= p_end_time AND end_time >= p_start_time) -- Overlapping time ranges
    )
    AND status NOT IN ('cancelled', 'rejected');
  
  -- Return true if no overlapping bookings found
  RETURN v_overlapping_count = 0;
END;
$$;
