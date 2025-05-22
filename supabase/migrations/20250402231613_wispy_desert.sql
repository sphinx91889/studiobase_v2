/*
  # Add booking data fields

  1. Changes
    - Add new columns to store external booking data
    - Add constraints to ensure data integrity
    - Update booking status options

  2. Security
    - Maintains existing RLS policies
    - Preserves data integrity with constraints
*/

-- Add new columns for external booking data
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS contact_name text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS appointment_title text,
ADD COLUMN IF NOT EXISTS cancellation_link text,
ADD COLUMN IF NOT EXISTS reschedule_link text,
ADD COLUMN IF NOT EXISTS calendar_links jsonb;

-- Update the booking status check constraint to include all possible statuses
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_status_check
CHECK (
  status = ANY (ARRAY[
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'failed',
    'rescheduled'  -- Added new status
  ]::text[])
);

-- Update the status transition function to handle the new status
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow transitions to rescheduled status
  IF OLD.status = 'confirmed' AND NEW.status = 'rescheduled' THEN
    RETURN NEW;
  END IF;

  -- Only allow specific status transitions
  IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled', 'failed') THEN
    RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
  END IF;

  IF OLD.status = 'confirmed' AND NEW.status NOT IN ('completed', 'cancelled', 'rescheduled') THEN
    RAISE EXCEPTION 'Invalid status transition from confirmed to %', NEW.status;
  END IF;

  IF OLD.status IN ('completed', 'cancelled', 'failed') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status once booking is %', OLD.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
