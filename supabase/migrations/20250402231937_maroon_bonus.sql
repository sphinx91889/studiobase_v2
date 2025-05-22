/*
  # Add body column to bookings table

  1. Changes
    - Add body column to store the complete webhook payload
    - Column type is JSONB to store structured JSON data
    - Column is nullable to maintain compatibility with existing records

  2. Notes
    - Using JSONB instead of JSON for better performance and querying capabilities
*/

DO $$ 
BEGIN
  -- Add body column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'body') 
  THEN
    ALTER TABLE bookings ADD COLUMN body jsonb;
  END IF;
END $$;
