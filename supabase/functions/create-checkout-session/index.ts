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
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { roomId, date, startTime, hours, amount, timezone } = body;

    // Validate required fields
    if (!roomId || !date || !startTime || !hours || !amount) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: { roomId, date, startTime, hours, amount }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Use provided timezone or default to America/New_York
    const studioTimezone = timezone || 'America/New_York';

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get room details and studio owner's Stripe keys
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        id,
        name,
        timezone,
        studio:studios!inner (
          id,
          name,
          created_by
        )
      `)
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the studio owner's profile to get their Stripe key
    const { data: studioOwner, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_enabled, stripe_secret_key')
      .eq('id', room.studio.created_by)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch studio owner profile');
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

    // Always use the studio's timezone for payment processing and records
    const roomTimezone = room.timezone || studioTimezone;

    // Calculate end time
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + hours * 60 * 60 * 1000);
    const endTime = endDateTime.toTimeString().split(' ')[0];

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      description: `Booking for ${room.name} at ${room.studio.name}`,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        roomId,
        studioName: room.studio.name,
        roomName: room.name,
        date,
        startTime,
        endTime,
        hours: hours.toString(),
        timezone: roomTimezone, // Store the studio timezone in metadata
        studioOwnerId: room.studio.created_by // Store the studio owner ID for webhook handling
      }
    });

    return new Response(
      JSON.stringify({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
