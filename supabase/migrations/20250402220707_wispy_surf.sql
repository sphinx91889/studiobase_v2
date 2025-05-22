/*
  # Fix rooms RLS policy for studio owners

  1. Changes
    - Drop existing policies for rooms table
    - Add new policy to allow studio owners to manage rooms
    - Keep public read access policy
    
  2. Security
    - Studio owners can manage rooms in their studios
    - Everyone can view rooms
    - Maintains proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Studio owners can manage their rooms" ON rooms;
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON rooms;

-- Create policy for studio owners to manage rooms
CREATE POLICY "Studio owners can manage rooms"
ON rooms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studios s
    WHERE s.id = rooms.studio_id
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = s.organization_id
      AND o.id = auth.uid()
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM studios s
    WHERE s.id = rooms.studio_id
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = s.organization_id
      AND o.id = auth.uid()
    )
  )
);

-- Recreate public read access policy
CREATE POLICY "Rooms are viewable by everyone"
ON rooms
FOR SELECT
TO public
USING (true);
