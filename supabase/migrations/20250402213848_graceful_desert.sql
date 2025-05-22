/*
  # Fix rooms policy recursion

  1. Changes
    - Drop existing policy that causes recursion
    - Add simplified policy for studio owners to manage rooms
    - Keep the public read policy

  2. Security
    - Studio owners can manage rooms in their studios
    - Everyone can view rooms
    - Maintains proper access control without recursion
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Rooms are editable by studio owners" ON rooms;

-- Create a simplified policy for studio owners
CREATE POLICY "Studio owners can manage their rooms"
ON rooms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studios s
    WHERE s.id = rooms.studio_id
    AND s.organization_id = auth.uid()
  )
);

-- Keep the existing read policy
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON rooms;
CREATE POLICY "Rooms are viewable by everyone"
ON rooms
FOR SELECT
TO public
USING (true);
