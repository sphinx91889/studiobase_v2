/*
  # Add missing studios policies

  1. Security Changes
    - Add RLS policy to allow studio owners to create studios
    - Add RLS policy to allow studio owners to manage their studios

  Note: The "Studios are viewable by everyone" policy already exists and is skipped
*/

-- Allow studio owners to create studios
CREATE POLICY "Studio owners can create studios"
ON studios
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_studio_owner = true
  )
);

-- Allow studio owners to manage their studios
CREATE POLICY "Studio owners can manage their studios"
ON studios
FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organizations.id
    FROM organizations
    WHERE organizations.id IN (
      SELECT studios.organization_id
      FROM studios
      WHERE studios.organization_id = auth.uid()
    )
  )
);
