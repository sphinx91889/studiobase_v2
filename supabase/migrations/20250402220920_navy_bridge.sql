/*
  # Fix rooms RLS policy for studio owners

  1. Changes
    - Drop existing policies
    - Create new simplified policy for studio owners to manage rooms
    - Keep public read access
    
  2. Security
    - Studio owners can manage rooms in their studios
    - Everyone can view rooms
    - Maintains proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Studio owners can manage rooms" ON rooms;
DROP POLICY IF EXISTS "Rooms are viewable by everyone" ON rooms;

-- Create simplified policy for studio owners
CREATE POLICY "Studio owners can manage rooms"
ON rooms
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studios s
    JOIN organizations o ON s.organization_id = o.id
    WHERE s.id = rooms.studio_id
    AND o.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM studios s
    JOIN organizations o ON s.organization_id = o.id
    WHERE s.id = rooms.studio_id
    AND o.id = auth.uid()
  )
);

-- Keep public read access
CREATE POLICY "Rooms are viewable by everyone"
ON rooms
FOR SELECT
TO public
USING (true);
