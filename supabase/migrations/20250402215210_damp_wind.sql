/*
  # Create storage bucket for studio photos

  1. New Storage Bucket
    - Creates a new public bucket for storing studio photos
    - Sets up appropriate security policies
  
  2. Security
    - Enables authenticated users to upload photos
    - Makes photos publicly readable
*/

-- Create a new storage bucket for studio photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-photos', 'studio-photos', true);

-- Allow authenticated users to upload files to the bucket
CREATE POLICY "Authenticated users can upload studio photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'studio-photos'
  AND auth.role() = 'authenticated'
);

-- Allow public access to read files
CREATE POLICY "Anyone can view studio photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'studio-photos');
