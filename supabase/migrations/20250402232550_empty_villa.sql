/*
  # Add appointment date columns to bookings table

  1. Changes
    - Add appointment_start_date column to store the date portion of the appointment start
    - Add appointment_end_date column to store the date portion of the appointment end
    - Both columns are type TEXT to match the incoming date format
  
  2. Notes
    - These columns store the date portion separately from the timestamp fields
    - Useful for date-based queries and reporting
*/

DO $$ 
BEGIN
  -- Add appointment_start_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'appointment_start_date') 
  THEN
    ALTER TABLE bookings ADD COLUMN appointment_start_date text;
  END IF;

  -- Add appointment_end_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'appointment_end_date') 
  THEN
    ALTER TABLE bookings ADD COLUMN appointment_end_date text;
  END IF;
END $$;
