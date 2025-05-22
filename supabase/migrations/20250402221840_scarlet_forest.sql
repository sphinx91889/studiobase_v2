/*
  # Fix RLS policies for studios

  1. Changes
    - Enable RLS on studios table if not already enabled
    - Add policies for studio management if they don't exist
    - Ensure proper policy checks for organization owners

  2. Security
    - Maintains existing security model
    - Adds proper checks for policy creation
*/

-- Enable RLS on studios table if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'studios' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies to ensure clean state
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Studio owners can manage their studios" ON public.studios;
  DROP POLICY IF EXISTS "Studios are viewable by everyone" ON public.studios;
END $$;

-- Create policies with proper checks
CREATE POLICY "Studio owners can manage their studios"
ON public.studios
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Studios are viewable by everyone"
ON public.studios
AS PERMISSIVE
FOR SELECT
TO public
USING (true);
