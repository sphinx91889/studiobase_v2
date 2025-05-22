/*
  # Enable webhook for studio

  1. Drop existing function
  2. Create function to enable webhooks for a studio
  3. Updates the studio with the webhook configuration
  4. Returns the generated webhook secret
*/

-- Drop existing function first
DROP FUNCTION IF EXISTS enable_studio_webhook(uuid, text);

-- Create function to enable webhooks for a studio
CREATE OR REPLACE FUNCTION enable_studio_webhook(
  studio_id uuid,
  target_webhook_url text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_secret text;
BEGIN
  -- Generate new webhook secret
  new_secret := encode(gen_random_bytes(32), 'hex');
  
  -- Update studio webhook settings
  UPDATE studios
  SET 
    webhook_secret = new_secret,
    webhook_url = target_webhook_url,
    webhook_enabled = true,
    webhook_last_error = null,
    webhook_last_success = null
  WHERE id = studio_id;
  
  -- Return the generated secret
  RETURN new_secret;
END;
$$;
