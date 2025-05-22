/*
  # Fix organizations RLS policy recursion

  1. Changes
    - Drop existing policies that cause recursion
    - Create simplified policies with direct ownership checks
    - Keep public read access
    
  2. Security
    - Studio owners can create organizations
    - Organization owners can manage their organizations
    - Everyone can view organizations
    - Maintains proper access control without recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;
DROP POLICY IF EXISTS "Studio owners can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can manage their organizations" ON organizations;

-- Create simplified policies
CREATE POLICY "Organizations are viewable by everyone"
ON organizations
FOR SELECT
TO public
USING (true);

CREATE POLICY "Studio owners can create organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_studio_owner = true
  )
);

CREATE POLICY "Organization owners can manage their organizations"
ON organizations
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
