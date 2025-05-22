/*
  # Add Formatted DateTime Column to Successful Bookings

  1. Changes
    - Add formatted_datetime column to successful_bookings table
    - Add function to automatically format datetime on insert/update
    - Add trigger to maintain formatted datetime
    
  2. Notes
    - Uses America/New_York timezone
    - Format: MM-DD-YYYY HH:MM AM/PM
*/

-- Add the formatted_datetime column
ALTER TABLE successful_bookings
ADD COLUMN formatted_datetime text;

-- Create function to format datetime
CREATE OR REPLACE FUNCTION format_booking_datetime()
RETURNS TRIGGER AS $$
DECLARE
  v_datetime timestamp with time zone;
BEGIN
  -- Combine booking date and start time
  v_datetime := (NEW.booking_date || ' ' || NEW.start_time)::timestamp at time zone 'America/New_York';
  
  -- Format datetime in desired format
  NEW.formatted_datetime := to_char(v_datetime, 'MM-DD-YYYY HH12:MI AM');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain formatted datetime
CREATE TRIGGER maintain_formatted_datetime
  BEFORE INSERT OR UPDATE ON successful_bookings
  FOR EACH ROW
  EXECUTE FUNCTION format_booking_datetime();

-- Update existing records
UPDATE successful_bookings
SET formatted_datetime = to_char(
  (booking_date || ' ' || start_time)::timestamp at time zone 'America/New_York',
  'MM-DD-YYYY HH12:MI AM'
);
