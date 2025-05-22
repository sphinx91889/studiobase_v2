/*
  # Fix HEIC Image URLs
  
  1. Changes
    - Add function to update HEIC URLs to JPEG
    - Update existing studio photos
    - Add trigger to automatically fix URLs on insert/update
    
  2. Notes
    - Converts .HEIC and .HEIF extensions to .jpg
    - Maintains existing storage paths
*/

-- Create function to fix HEIC URLs
CREATE OR REPLACE FUNCTION fix_heic_urls(urls text[])
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  fixed_urls text[];
  url text;
BEGIN
  -- Initialize empty array for fixed URLs
  fixed_urls := ARRAY[]::text[];
  
  -- Process each URL
  FOREACH url IN ARRAY urls
  LOOP
    -- Replace HEIC/HEIF extension with jpg
    fixed_urls := array_append(
      fixed_urls,
      regexp_replace(url, '\.heic$|\.heif$', '.jpg', 'i')
    );
  END LOOP;
  
  RETURN fixed_urls;
END;
$$;

-- Update existing studio photos
UPDATE studios
SET photos = fix_heic_urls(photos)
WHERE photos IS NOT NULL
AND (
  photos::text ILIKE '%.heic%'
  OR photos::text ILIKE '%.heif%'
);

-- Create trigger function to fix URLs on insert/update
CREATE OR REPLACE FUNCTION fix_photo_urls()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.photos IS NOT NULL THEN
    NEW.photos := fix_heic_urls(NEW.photos);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER fix_photo_urls_trigger
  BEFORE INSERT OR UPDATE OF photos ON studios
  FOR EACH ROW
  EXECUTE FUNCTION fix_photo_urls();
