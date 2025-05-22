/*
  # Update user trigger to handle studio owner flag

  1. Changes
    - Update handle_new_user trigger function to set is_studio_owner from user metadata
    - Ensure is_studio_owner is properly set during user creation
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    avatar_url,
    is_studio_owner
  ) VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'full_name'), ''),
    COALESCE((NEW.raw_user_meta_data->>'avatar_url'), ''),
    COALESCE((NEW.raw_user_meta_data->>'is_studio_owner')::boolean, false)
  );
  RETURN NEW;
END;
$$;
