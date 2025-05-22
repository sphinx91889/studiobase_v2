/*
  # Add timezone field to bookings table
  
  1. Changes
    - Add timezone column to bookings table to store the studio timezone
    - Set default value to 'America/New_York' for backward compatibility
    
  2. Security
    - No security changes
*/

-- Add timezone column to bookings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE bookings ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
  END IF;
END $$;
