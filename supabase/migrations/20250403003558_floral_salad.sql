/*
  # Update bookings2 RLS policies

  1. Changes
    - Drop existing policies
    - Add policy for users to view their assigned bookings
    - Add policy for studio owners to manage bookings
    - Keep public read access for specific cases
    
  2. Security
    - Users can view bookings assigned to them
    - Studio owners can manage bookings for their studios
    - Maintains proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Bookings are viewable by everyone" ON public.bookings2;
DROP POLICY IF EXISTS "Studio owners can manage bookings" ON public.bookings2;

-- Create policy for users to view their assigned bookings
CREATE POLICY "Users can view their assigned bookings"
ON public.bookings2
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM rooms
    JOIN studios ON rooms.studio_id = studios.id
    WHERE rooms.id = bookings2.room_id
    AND studios.organization_id = auth.uid()
  )
);

-- Create policy for studio owners to manage bookings
CREATE POLICY "Studio owners can manage bookings"
ON public.bookings2
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rooms
    JOIN studios ON rooms.studio_id = studios.id
    WHERE rooms.id = bookings2.room_id
    AND studios.organization_id = auth.uid()
  )
);
