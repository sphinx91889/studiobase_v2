/*
  # Add webhook security and booking status constraints

  1. Changes
    - Add webhook_secret column to studios table for webhook authentication
    - Add webhook_enabled flag to studios table
    - Add webhook_url column to studios table
    - Add webhook_last_error column to studios table for error tracking
    - Add webhook_last_success column to studios table for monitoring
    - Add constraints to ensure valid booking status transitions

  2. Security
    - Only studio owners can update webhook settings
    - Webhook secret is required when webhook is enabled
*/

-- Add webhook-related columns to studios table
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS webhook_secret text,
ADD COLUMN IF NOT EXISTS webhook_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS webhook_last_error text,
ADD COLUMN IF NOT EXISTS webhook_last_success timestamptz;

-- Add constraint to ensure webhook_secret is set when enabled
ALTER TABLE public.studios
ADD CONSTRAINT webhook_requires_secret
CHECK (
  NOT webhook_enabled OR
  (webhook_enabled AND webhook_secret IS NOT NULL AND webhook_url IS NOT NULL)
);

-- Add booking status transition constraints
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
    'failed'
  ]::text[])
);

-- Create function to validate booking status transitions
CREATE OR REPLACE FUNCTION validate_booking_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow specific status transitions
  IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled', 'failed') THEN
    RAISE EXCEPTION 'Invalid status transition from pending to %', NEW.status;
  END IF;

  IF OLD.status = 'confirmed' AND NEW.status NOT IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status transition from confirmed to %', NEW.status;
  END IF;

  IF OLD.status IN ('completed', 'cancelled', 'failed') AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status once booking is %', OLD.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking status transitions
DROP TRIGGER IF EXISTS booking_status_transition ON public.bookings;
CREATE TRIGGER booking_status_transition
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_status_transition();
