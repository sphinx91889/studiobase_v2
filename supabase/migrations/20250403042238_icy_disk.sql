/*
  # Add Netlify URL tracking

  1. Changes
    - Add netlify_url column to studios table
    - Add netlify_deploy_id column to studios table
    - Add netlify_site_id column to studios table
    
  2. Security
    - Maintains existing RLS policies
    - Only studio owners can update these fields
*/

-- Add Netlify-related columns
ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS netlify_url text,
ADD COLUMN IF NOT EXISTS netlify_deploy_id text,
ADD COLUMN IF NOT EXISTS netlify_site_id text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_studios_netlify_url ON public.studios(netlify_url);
