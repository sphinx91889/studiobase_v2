/*
  # Fix studios RLS policy recursion

  1. Changes
    - Drop the recursive policy that's causing infinite recursion
    - Add a new, simplified policy for studio management
    
  2. Security
    - Maintain security by ensuring studio owners can only manage their own studios
    - Keep the policy for studio creation unchanged
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Studio owners can manage their studios" ON studios;

-- Create a new, non-recursive policy
CREATE POLICY "Studio owners can manage their studios"
ON studios
FOR ALL
TO authenticated
USING (
  organization_id = auth.uid()
);
