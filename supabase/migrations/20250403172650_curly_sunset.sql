/*
  # Add Profile Photos Storage Bucket

  1. Changes
    - Create storage bucket for profile photos
    - Add policies for photo upload and access
    
  2. Security
    - Users can upload their own photos
    - Photos are publicly readable
*/

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true);

-- Allow authenticated users to upload their own photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND auth.uid()::text = SUBSTRING(name FROM '^[^/]+')
);

-- Allow public access to read photos
CREATE POLICY "Anyone can view profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
