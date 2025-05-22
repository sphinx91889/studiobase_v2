/*
  # Add studio settings update trigger

  1. Changes
    - Adds a trigger function to automatically update the updated_at timestamp
    - Creates a trigger that fires before any update on the studios table
    - Ensures updated_at is always set to the current timestamp when a studio is modified

  2. Security
    - No changes to RLS policies
    - Maintains existing security model
*/

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_studio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS set_studio_updated_at ON public.studios;
CREATE TRIGGER set_studio_updated_at
  BEFORE UPDATE ON public.studios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_studio_updated_at();

-- Add indexes to improve query performance
CREATE INDEX IF NOT EXISTS idx_studios_updated_at ON public.studios(updated_at);
CREATE INDEX IF NOT EXISTS idx_studios_organization_id ON public.studios(organization_id);

-- Ensure updated_at has a default value
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' 
    AND column_name = 'updated_at' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE public.studios 
    ALTER COLUMN updated_at SET DEFAULT now();
  END IF;
END $$;
