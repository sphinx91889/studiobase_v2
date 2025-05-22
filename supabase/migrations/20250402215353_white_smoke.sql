/*
  # Add organizations policies

  1. Security Changes
    - Add RLS policy to allow studio owners to create organizations
    - Add RLS policy to allow organization owners to update their organizations
    - Add RLS policy to allow organization owners to delete their organizations

  Note: The existing policy for public viewing remains unchanged
*/

-- Allow studio owners to create organizations
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

-- Allow organization owners to update their organizations
CREATE POLICY "Organization owners can update their organizations"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM studios 
    WHERE organization_id = organizations.id
  )
)
WITH CHECK (
  id IN (
    SELECT organization_id 
    FROM studios 
    WHERE organization_id = organizations.id
  )
);

-- Allow organization owners to delete their organizations
CREATE POLICY "Organization owners can delete their organizations"
ON organizations
FOR DELETE
TO authenticated
USING (
  id IN (
    SELECT organization_id 
    FROM studios 
    WHERE organization_id = organizations.id
  )
);
