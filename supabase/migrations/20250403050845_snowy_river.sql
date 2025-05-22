/*
  # Fix availability table RLS policies

  1. Changes
    - Drop existing RLS policies
    - Add new policy for studio owners to manage availability
    - Add policy for public viewing of availability
    
  2. Security
    - Studio owners can manage availability for their rooms
    - Everyone can view availability
    - Maintains proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Availability is viewable by everyone" ON public.availability;
DROP POLICY IF EXISTS "Availability is editable by studio owners" ON public.availability;

-- Create new policies
CREATE POLICY "Studio owners can manage availability"
ON public.availability
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    JOIN studios ON rooms.studio_id = studios.id
    WHERE rooms.id = availability.room_id
    AND studios.organization_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rooms
    JOIN studios ON rooms.studio_id = studios.id
    WHERE rooms.id = availability.room_id
    AND studios.organization_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view availability"
ON public.availability
FOR SELECT
TO public
USING (true);
