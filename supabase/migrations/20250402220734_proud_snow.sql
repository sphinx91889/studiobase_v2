/*
  # Fix organizations RLS policy recursion

  1. Changes
    - Drop existing policies that cause recursion
    - Add simplified policies for organization management
    - Keep public read access
    
  2. Security
    - Studio owners can create organizations
    - Organization owners can manage their organizations
    - Everyone can view organizations
    - Maintains proper access control without recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Organizations are editable by owners" ON organizations;
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON organizations;
DROP POLICY IF EXISTS "Studio owners can create organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Organization owners can delete their organizations" ON organizations;

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
    WHERE profiles.id = auth.uid()
    AND profiles.is_studio_owner = true
  )
);

CREATE POLICY "Organization owners can manage their organizations"
ON organizations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studios
    WHERE studios.organization_id = organizations.id
    AND studios.organization_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM studios
    WHERE studios.organization_id = organizations.id
    AND studios.organization_id = auth.uid()
  )
);
