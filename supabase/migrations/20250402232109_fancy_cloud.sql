/*
  # Add execution mode column to bookings table

  1. Changes
    - Add executionMode column to track booking execution status
    - Column type is TEXT with a CHECK constraint for valid values
    - Default value is 'pending'
    - Column is NOT NULL to ensure every booking has a mode

  2. Notes
    - Valid modes are: 'pending', 'processing', 'completed', 'failed'
    - This helps track the state of booking execution separately from booking status
*/

DO $$ 
BEGIN
  -- Add executionMode column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'execution_mode') 
  THEN
    ALTER TABLE bookings ADD COLUMN execution_mode text NOT NULL DEFAULT 'pending';
    
    -- Add constraint to ensure valid execution modes
    ALTER TABLE bookings 
    ADD CONSTRAINT valid_execution_mode 
    CHECK (execution_mode IN ('pending', 'processing', 'completed', 'failed'));
  END IF;
END $$;
