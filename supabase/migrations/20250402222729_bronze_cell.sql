/*
  # Add Custom Booking Link to Rooms

  1. Changes
    - Add `booking_link` column to rooms table
    - This allows studio owners to specify custom external booking links for their rooms

  2. Notes
    - The booking_link is optional
    - When present, it will override the default booking flow
*/

-- Add booking_link column to rooms table
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS booking_link text;
