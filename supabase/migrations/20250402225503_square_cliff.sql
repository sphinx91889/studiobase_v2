/*
  # Add webhook helper functions
  
  1. New Functions
    - generate_webhook_secret: Creates a secure random secret for webhooks
    
  2. Changes
    - Add function to generate webhook secrets
    - Add helper to enable webhooks with auto-generated secrets
*/

-- Create function to generate webhook secrets
CREATE OR REPLACE FUNCTION generate_webhook_secret()
RETURNS text
LANGUAGE SQL
AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$;

-- Create function to enable webhooks for a studio
CREATE OR REPLACE FUNCTION enable_studio_webhook(
  studio_id uuid,
  webhook_url text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_secret text;
BEGIN
  -- Generate new webhook secret
  new_secret := generate_webhook_secret();
  
  -- Update studio webhook settings
  UPDATE studios
  SET 
    webhook_secret = new_secret,
    webhook_url = webhook_url,
    webhook_enabled = true,
    webhook_last_error = null,
    webhook_last_success = null
  WHERE id = studio_id;
  
  -- Return the generated secret
  RETURN new_secret;
END;
$$;
