/*
  # Create payments table

  1. New Table
    - payments: Stores payment information for bookings
    - Includes fields for tracking payment status and Stripe integration
    - Links payments to users and products
    
  2. Security
    - Enable RLS
    - Add policies for user access
    - Add appropriate indexes for performance
*/

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  product_id text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_amount decimal NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  stripe_payment_intent_id text,
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Add status constraint
ALTER TABLE public.payments
ADD CONSTRAINT payments_status_check
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded'));

-- Create indexes
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_product_id ON public.payments(product_id);
CREATE INDEX idx_payments_stripe_session_id ON public.payments(stripe_session_id);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);

-- Create policies
CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION handle_payment_updated_at();
