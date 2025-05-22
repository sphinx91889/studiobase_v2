/*
  # Add Stripe Keys to Profiles
  
  1. Changes
    - Add stripe_publishable_key column to profiles table
    - Add stripe_secret_key column to profiles table
    - Add stripe_webhook_secret column to profiles table
    - Add stripe_enabled flag to profiles table
    - Add constraint to ensure keys are present when enabled
    
  2. Security
    - Only studio owners can update Stripe keys
    - Keys are required when Stripe is enabled
*/

-- Add Stripe-related columns
ALTER TABLE public.profiles
ADD COLUMN stripe_publishable_key text,
ADD COLUMN stripe_secret_key text,
ADD COLUMN stripe_webhook_secret text,
ADD COLUMN stripe_enabled boolean DEFAULT false;

-- Add constraint to ensure keys are present when enabled
ALTER TABLE public.profiles
ADD CONSTRAINT stripe_keys_required
CHECK (
  NOT stripe_enabled OR
  (stripe_enabled AND stripe_publishable_key IS NOT NULL AND stripe_secret_key IS NOT NULL AND stripe_webhook_secret IS NOT NULL)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_enabled ON public.profiles(stripe_enabled);

-- Update RLS policies to allow studio owners to update their Stripe keys
CREATE POLICY "Users can update their own Stripe keys"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid() AND
  is_studio_owner = true
)
WITH CHECK (
  id = auth.uid() AND
  is_studio_owner = true
);
