/*
  # Add webhook settings to studios table
  
  1. New Columns
    - webhook_secret: Secret key for webhook authentication
    - webhook_enabled: Toggle for webhook functionality
    - webhook_url: Endpoint URL for webhook
    - webhook_last_error: Store last error message
    - webhook_last_success: Track successful webhook calls

  2. Changes
    - Only add columns if they don't exist
    - Skip constraint if it already exists
*/

-- Add webhook-related columns if they don't exist
DO $$ 
BEGIN
  -- Add webhook_secret column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' AND column_name = 'webhook_secret'
  ) THEN
    ALTER TABLE public.studios ADD COLUMN webhook_secret text;
  END IF;

  -- Add webhook_enabled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' AND column_name = 'webhook_enabled'
  ) THEN
    ALTER TABLE public.studios ADD COLUMN webhook_enabled boolean DEFAULT false;
  END IF;

  -- Add webhook_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' AND column_name = 'webhook_url'
  ) THEN
    ALTER TABLE public.studios ADD COLUMN webhook_url text;
  END IF;

  -- Add webhook_last_error column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' AND column_name = 'webhook_last_error'
  ) THEN
    ALTER TABLE public.studios ADD COLUMN webhook_last_error text;
  END IF;

  -- Add webhook_last_success column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' AND column_name = 'webhook_last_success'
  ) THEN
    ALTER TABLE public.studios ADD COLUMN webhook_last_success timestamptz;
  END IF;
END $$;
