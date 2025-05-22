/*
  # Add is_studio_owner to profiles table

  1. Changes
    - Add `is_studio_owner` boolean column to profiles table with default value of false
    - Add trigger to automatically create profile when a new user signs up

  2. Security
    - Maintain existing RLS policies
*/

-- Add is_studio_owner column
ALTER TABLE profiles 
ADD COLUMN is_studio_owner boolean DEFAULT false;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, is_studio_owner)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
