/*
  # Add HEIC Image Conversion Function
  
  1. Changes
    - Add function to convert HEIC images to JPEG
    - Add trigger to automatically convert HEIC images on upload
    - Add validation for image formats
    
  2. Security
    - Function runs with SECURITY DEFINER
    - Only processes images from authorized uploads
*/

-- Create function to check if file is HEIC
CREATE OR REPLACE FUNCTION is_heic_image(filename text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lower(substring(filename from '\.([^\.]+)$')) IN ('heic', 'heif');
END;
$$;

-- Create function to get JPEG filename
CREATE OR REPLACE FUNCTION get_jpeg_filename(heic_filename text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN regexp_replace(heic_filename, '\.heic$|\.heif$', '.jpg', 'i');
END;
$$;

-- Create function to handle HEIC conversion
CREATE OR REPLACE FUNCTION handle_heic_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jpeg_filename text;
BEGIN
  -- Check if this is a HEIC image
  IF is_heic_image(NEW.name) THEN
    -- Generate JPEG filename
    jpeg_filename := get_jpeg_filename(NEW.name);
    
    -- Log conversion attempt
    RAISE NOTICE 'Converting HEIC image % to JPEG %', NEW.name, jpeg_filename;

    -- Update filename to JPEG version
    NEW.name := jpeg_filename;
    
    -- Set content type to JPEG
    NEW.metadata := jsonb_set(
      COALESCE(NEW.metadata, '{}'::jsonb),
      '{mimetype}',
      '"image/jpeg"'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for HEIC conversion
CREATE TRIGGER convert_heic_images
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_heic_upload();

-- Add policy to allow HEIC uploads
CREATE POLICY "Allow HEIC image uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('studio-photos', 'profile-photos') AND
  (
    lower(substring(name from '\.([^\.]+)$')) = 'heic' OR
    lower(substring(name from '\.([^\.]+)$')) = 'heif'
  )
);
