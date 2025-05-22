/*
  # Add Studio Creator Tracking
  
  1. Changes
    - Add created_by column to studios table
    - Add created_at and updated_at columns if they don't exist
    - Update RLS policies to use created_by for authorization
    - Add indexes for better query performance
    
  2. Security
    - Only studio owners can create studios
    - Studio creators can manage their studios
    - Maintains public read access
*/

-- Add created_by column
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Add created_at and updated_at if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE public.studios ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'studios' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.studios ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Studio owners can manage their studios" ON public.studios;
DROP POLICY IF EXISTS "Studios are viewable by everyone" ON public.studios;
DROP POLICY IF EXISTS "Studio owners can create studios" ON public.studios;

-- Create new policies
CREATE POLICY "Studios are viewable by everyone"
ON public.studios
FOR SELECT
TO public
USING (true);

CREATE POLICY "Studio owners can create studios"
ON public.studios
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_studio_owner = true
  )
);

CREATE POLICY "Studio creators can manage their studios"
ON public.studios
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_studios_created_by ON public.studios(created_by);
CREATE INDEX IF NOT EXISTS idx_studios_created_at ON public.studios(created_at);
CREATE INDEX IF NOT EXISTS idx_studios_updated_at ON public.studios(updated_at);
