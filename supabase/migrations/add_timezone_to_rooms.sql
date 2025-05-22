/*
  # Add timezone field to rooms table

  1. Changes
    - Add timezone column to rooms table with default value
    
  2. Security
    - No security changes
*/

-- Add timezone column to rooms table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'rooms' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE rooms ADD COLUMN timezone text DEFAULT 'America/New_York';
  END IF;
END $$;
