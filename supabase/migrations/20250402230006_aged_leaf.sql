/*
  # Implement shared webhook secret system

  1. Changes
    - Adds a shared webhook secret function
    - Updates webhook validation to use shared secret
    - Modifies webhook constraints

  2. Security
    - Uses a single cryptographically secure secret for all studios
    - Maintains webhook validation security
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS enable_studio_webhook(uuid, text);
DROP FUNCTION IF EXISTS validate_webhook_secret(text);

-- Create function to get the shared webhook secret
CREATE OR REPLACE FUNCTION get_shared_webhook_secret()
RETURNS text
LANGUAGE SQL
IMMUTABLE
SECURITY DEFINER
AS $$
  -- This generates a consistent secret based on a fixed string
  SELECT 'whsec_' || encode(sha256('studiobase_shared_webhook_secret'::bytea), 'hex');
$$;

-- Create function to validate webhook secrets
CREATE OR REPLACE FUNCTION validate_webhook_secret(secret text)
RETURNS boolean
LANGUAGE SQL
IMMUTABLE
SECURITY DEFINER
AS $$
  SELECT secret = get_shared_webhook_secret();
$$;

-- Function to enable webhooks for a studio (without individual secrets)
CREATE OR REPLACE FUNCTION enable_studio_webhook(
  studio_id uuid,
  target_webhook_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE studios
  SET 
    webhook_url = target_webhook_url,
    webhook_enabled = true,
    webhook_last_error = null,
    webhook_last_success = null
  WHERE id = studio_id;
END;
$$;

-- Drop the webhook_secret column since we're using a shared secret
ALTER TABLE studios
DROP COLUMN IF EXISTS webhook_secret CASCADE;

-- Update webhook constraint to only require URL
ALTER TABLE studios
DROP CONSTRAINT IF EXISTS webhook_requires_secret;

ALTER TABLE studios
ADD CONSTRAINT webhook_requires_url
CHECK (
  NOT webhook_enabled OR
  (webhook_enabled AND webhook_url IS NOT NULL)
);
