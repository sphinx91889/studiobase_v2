/*
  # Add Studio Owner Email to Successful Bookings

  1. Changes
    - Add studio_owner_email column to successful_bookings table
    - Create function to get studio owner email
    - Add trigger to automatically populate studio owner email
    
  2. Notes
    - Gets email from auth.users table via organizations -> studios -> rooms path
    - Maintains data consistency with triggers
*/

-- Add the studio_owner_email column
ALTER TABLE successful_bookings
ADD COLUMN studio_owner_email text;

-- Create function to get studio owner email
CREATE OR REPLACE FUNCTION get_studio_owner_email(p_room_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_email text;
BEGIN
  SELECT au.email INTO v_owner_email
  FROM rooms r
  JOIN studios s ON s.id = r.studio_id
  JOIN organizations o ON o.id = s.organization_id
  JOIN auth.users au ON au.id = o.id
  WHERE r.id = p_room_id;
  
  RETURN v_owner_email;
END;
$$;

-- Create trigger function to set studio owner email
CREATE OR REPLACE FUNCTION set_studio_owner_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.studio_owner_email := get_studio_owner_email(NEW.room_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to maintain studio owner email
CREATE TRIGGER maintain_studio_owner_email
  BEFORE INSERT OR UPDATE OF room_id ON successful_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_studio_owner_email();

-- Update existing records
UPDATE successful_bookings
SET studio_owner_email = get_studio_owner_email(room_id)
WHERE studio_owner_email IS NULL;
