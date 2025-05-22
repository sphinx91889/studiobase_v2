import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.20.0";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client at the start of the request
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { roomId, date, startTime, hours, amount, userId, userEmail, userName } = await req.json();

    // Check if a booking already exists for this room, date and time
    const { data: existingBooking } = await supabase
      .from('successful_bookings')
      .select('id')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .eq('start_time', startTime)
      .eq('status', 'completed')
      .single();

    if (existingBooking) {
      return new Response(
        JSON.stringify({ error: 'This time slot is already booked' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Calculate end time
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);
    const endTime = endDateTime.toTimeString().split(' ')[0];

    // Initialize empty discounts array for Stripe
    const discounts = [];

    // Get room details and studio owner's Stripe keys using the correct relationships
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        id,
        name,
        studio:studios!inner (
          id,
          name,
          created_by,
          organization:organizations!inner (
            id
          )
        )
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('Room fetch error:', roomError);
      throw new Error('Room not found or error fetching room details');
    }

    // Get the studio owner's profile through the created_by relationship
    const { data: studioOwner, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_enabled, stripe_publishable_key, stripe_secret_key')
      .eq('id', room.studio.created_by)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Error fetching studio owner profile');
    }

    const platformStripeKey = Deno.env.get('STRIPE_SECRET_KEY');

    // Determine which Stripe key to use
    let stripeSecretKey: string | undefined;
    if (studioOwner?.stripe_enabled && studioOwner.stripe_secret_key) {
      // Use studio owner's Stripe key if enabled and configured
      stripeSecretKey = studioOwner.stripe_secret_key;
      console.log('Using studio owner Stripe key');
    } else if (platformStripeKey) {
      // Fall back to platform Stripe key
      stripeSecretKey = platformStripeKey;
      console.log('Using platform Stripe key');
    }

    if (!stripeSecretKey) {
      throw new Error('No Stripe secret key available - neither studio owner nor platform keys found');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userEmail,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${room.name} at ${room.studio.name}`,
              description: `${date} ${startTime}-${endTime} (${hours} hours)`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      discounts: discounts,
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin')}/booking/${roomId}`,
      metadata: {
        roomId,
        date,
        startTime,
        endTime,
        hours: hours.toString(),
        userId,
        userName
      },
    });

    return new Response(
      JSON.stringify({ 
        sessionId: session.id,
        sessionUrl: session.url 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
