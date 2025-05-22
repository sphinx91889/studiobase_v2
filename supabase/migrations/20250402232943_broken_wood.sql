/*
  # Add calendar links and appointment title columns

  1. Changes
    - Add google_calendar_link column for Google Calendar integration
    - Add ical_outlook_link column for iCal/Outlook integration
    - Add appointment_title column for storing the appointment title
  
  2. Notes
    - These columns support calendar integration features
    - Links can be used to add appointments to different calendar systems
*/

DO $$ 
BEGIN
  -- Add google_calendar_link column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'google_calendar_link') 
  THEN
    ALTER TABLE bookings ADD COLUMN google_calendar_link text;
  END IF;

  -- Add ical_outlook_link column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'ical_outlook_link') 
  THEN
    ALTER TABLE bookings ADD COLUMN ical_outlook_link text;
  END IF;

  -- Add appointment_title column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'appointment_title') 
  THEN
    ALTER TABLE bookings ADD COLUMN appointment_title text;
  END IF;
END $$;
