/*
  # Fix successful bookings visibility and RLS policies

  1. Changes
    - Update RLS policies for successful_bookings table
    - Fix policy for studio owners to see their bookings
    - Add proper relationship checks through studios table
    
  2. Security
    - Maintains proper access control
    - Ensures studio owners can see all their bookings
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their bookings" ON successful_bookings;

-- Create new policies with proper relationship checks
CREATE POLICY "Users can view their bookings"
ON successful_bookings
FOR SELECT
TO authenticated
USING (
  -- Users can view their own bookings
  customer_email = auth.jwt()->>'email'
  OR
  -- Studio owners can view bookings for their studios
  EXISTS (
    SELECT 1 
    FROM rooms r
    JOIN studios s ON r.studio_id = s.id
    WHERE r.id = successful_bookings.room_id
    AND (
      -- Check both organization ownership and studio creation
      s.organization_id = auth.uid()
      OR s.created_by = auth.uid()
    )
  )
);
