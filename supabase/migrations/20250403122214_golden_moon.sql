/*
  # Add availability update trigger and function
  
  1. Changes
    - Add trigger function to handle availability updates
    - Add trigger to automatically update availability timestamps
    - Add index for better query performance
    
  2. Security
    - Maintains existing RLS policies
*/

-- Create trigger function for availability updates
CREATE OR REPLACE FUNCTION handle_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_availability_updated_at ON availability;
CREATE TRIGGER set_availability_updated_at
  BEFORE UPDATE ON availability
  FOR EACH ROW
  EXECUTE FUNCTION handle_availability_updated_at();

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_availability_room_id_day ON availability(room_id, day_of_week);
