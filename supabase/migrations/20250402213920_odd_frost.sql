/*
  # Fix studios policy recursion

  1. Changes
    - Drop existing policy that causes recursion
    - Add simplified policy for organization owners
    - Keep the public read policy

  2. Security
    - Organization owners can manage their studios
    - Everyone can view studios
    - Maintains proper access control without recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Studios are editable by organization owners" ON studios;

-- Create a simplified policy for organization owners
CREATE POLICY "Organization owners can manage their studios"
ON studios
FOR ALL
TO authenticated
USING (
  organization_id = auth.uid()
);

-- Keep the existing read policy
DROP POLICY IF EXISTS "Studios are viewable by everyone" ON studios;
CREATE POLICY "Studios are viewable by everyone"
ON studios
FOR SELECT
TO public
USING (true);
