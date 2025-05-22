/*
  # Update bookings table schema

  1. Changes
    - Add new columns for contact information:
      - contact_name (text)
      - contact_email (text)
      - contact_phone (text)
    - Add new columns for appointment details:
      - appointment_title (text)
      - cancellation_link (text)
      - reschedule_link (text)
      - calendar_links (jsonb)

  2. Notes
    - All new columns are nullable to maintain compatibility with existing records
    - calendar_links is a JSONB field to store Google Calendar and iCal links
*/

-- Add new columns to bookings table
DO $$ 
BEGIN
  -- Contact information
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'contact_name') 
  THEN
    ALTER TABLE bookings ADD COLUMN contact_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'contact_email') 
  THEN
    ALTER TABLE bookings ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'contact_phone') 
  THEN
    ALTER TABLE bookings ADD COLUMN contact_phone text;
  END IF;

  -- Appointment details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'appointment_title') 
  THEN
    ALTER TABLE bookings ADD COLUMN appointment_title text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'cancellation_link') 
  THEN
    ALTER TABLE bookings ADD COLUMN cancellation_link text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'reschedule_link') 
  THEN
    ALTER TABLE bookings ADD COLUMN reschedule_link text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'calendar_links') 
  THEN
    ALTER TABLE bookings ADD COLUMN calendar_links jsonb;
  END IF;
END $$;
