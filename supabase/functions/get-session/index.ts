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
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Session ID is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, try to get the session with the platform key to get the metadata
    const platformStripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!platformStripeKey) {
      throw new Error('Platform Stripe key not configured');
    }

    const platformStripe = new Stripe(platformStripeKey, {
      apiVersion: '2023-10-16',
    });

    // Get the session with minimal expansion to get metadata
    const session = await platformStripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer_details'],
    });

    // Get the studio owner ID from metadata
    const studioOwnerId = session.metadata?.studioOwnerId;
    if (!studioOwnerId) {
      // If no studio owner ID in metadata, use the platform key
      return new Response(
        JSON.stringify({ session }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the studio owner's profile to get their Stripe key
    const { data: studioOwner, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_enabled, stripe_secret_key')
      .eq('id', studioOwnerId)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch studio owner profile');
    }

    // Determine which Stripe key to use
    let stripeSecretKey: string | undefined;
    if (studioOwner?.stripe_enabled && studioOwner.stripe_secret_key) {
      // Use studio owner's Stripe key if enabled and configured
      stripeSecretKey = studioOwner.stripe_secret_key;
      console.log('Using studio owner Stripe key');
    } else {
      // Fall back to platform Stripe key
      stripeSecretKey = platformStripeKey;
      console.log('Using platform Stripe key');
    }

    // If using studio owner's key, retrieve the session again
    if (stripeSecretKey !== platformStripeKey) {
      const studioStripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-10-16',
      });

      const studioSession = await studioStripe.checkout.sessions.retrieve(sessionId, {
        expand: ['customer_details'],
      });

      return new Response(
        JSON.stringify({ session: studioSession }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the session retrieved with platform key
    return new Response(
      JSON.stringify({ session }),
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
