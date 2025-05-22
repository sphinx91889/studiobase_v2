import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret",
};

interface BookingData {
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  appointment: {
    only_start_date: string;
    only_start_time: string;
    only_end_date: string;
    only_end_time: string;
    room_id: string;
    notes?: string;
    title?: string;
    cancellation_link?: string;
    reschedule_link?: string;
    add_to_google_calendar?: string;
    add_to_ical_outlook?: string;
  };
  payment: {
    amount: number;
    payment_intent_id?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405,
        headers: corsHeaders 
      });
    }

    // Get the webhook secret from headers
    const webhookSecret = req.headers.get("x-webhook-secret");
    if (!webhookSecret) {
      return new Response("Missing webhook secret", { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Parse the request body
    const body: BookingData = await req.json();

    // Validate required fields
    if (!body.customer?.email || !body.appointment?.room_id ||
        !body.appointment?.only_start_date || !body.appointment?.only_start_time ||
        !body.appointment?.only_end_date || !body.appointment?.only_end_time ||
        !body.payment?.amount) {
      return new Response("Missing required fields", { 
        status: 400,
        headers: corsHeaders 
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the webhook secret matches the studio's secret
    const { data: studio, error: studioError } = await supabase
      .from("studios")
      .select("webhook_secret, organization_id")
      .eq("webhook_secret", webhookSecret)
      .single();

    if (studioError || !studio) {
      return new Response("Invalid webhook secret", { 
        status: 401,
        headers: corsHeaders 
      });
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert([{
        room_id: body.appointment.room_id,
        start_time: new Date(`${body.appointment.only_start_date} ${body.appointment.only_start_time}`).toISOString(),
        end_time: new Date(`${body.appointment.only_end_date} ${body.appointment.only_end_time}`).toISOString(),
        total_amount: body.payment.amount,
        stripe_payment_intent_id: body.payment.payment_intent_id,
        notes: body.appointment.notes,
        status: "confirmed",
        contact_name: body.customer.name,
        contact_email: body.customer.email,
        contact_phone: body.customer.phone,
        appointment_title: body.appointment.title,
        appointment_start_date: body.appointment.only_start_date,
        appointment_end_date: body.appointment.only_end_date,
        cancellation_link: body.appointment.cancellation_link,
        reschedule_link: body.appointment.reschedule_link,
        calendar_links: {
          google: body.appointment.add_to_google_calendar,
          ical: body.appointment.add_to_ical_outlook
        },
        body: body
      }])
      .select()
      .single();

    if (bookingError) {
      // Update webhook error status
      await supabase
        .from("studios")
        .update({
          webhook_last_error: bookingError.message,
        })
        .eq("webhook_secret", webhookSecret);

      return new Response(JSON.stringify({ error: bookingError.message }), { 
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }

    // Update webhook success status
    await supabase
      .from("studios")
      .update({
        webhook_last_success: new Date().toISOString(),
        webhook_last_error: null
      })
      .eq("webhook_secret", webhookSecret);

    return new Response(JSON.stringify({ 
      success: true,
      booking: booking
    }), { 
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
