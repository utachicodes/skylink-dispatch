import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeliveryNotificationRequest {
  delivery_id: string;
  old_status: string;
  new_status: string;
}

const getStatusMessage = (status: string): string => {
  switch (status) {
    case "confirmed":
      return "Your delivery has been confirmed and an operator has been assigned.";
    case "in_flight":
      return "Your package is now in the air! Track its progress in real-time.";
    case "arrived":
      return "Your package has arrived at the destination!";
    case "delivered":
      return "Your package has been successfully delivered!";
    case "cancelled":
      return "Your delivery has been cancelled.";
    default:
      return "Your delivery status has been updated.";
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { delivery_id, old_status, new_status }: DeliveryNotificationRequest = await req.json();

    console.log(`Processing notification for delivery ${delivery_id}: ${old_status} -> ${new_status}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get delivery details and client email
    const { data: delivery, error: deliveryError } = await supabase
      .from("deliveries")
      .select(`
        id,
        pickup_location,
        dropoff_location,
        package_note,
        estimated_time,
        client_id
      `)
      .eq("id", delivery_id)
      .maybeSingle();

    if (deliveryError || !delivery) {
      console.error("Error fetching delivery:", deliveryError);
      throw new Error("Delivery not found");
    }

    // Get client profile and auth user email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
      delivery.client_id
    );

    if (authError || !authUser) {
      console.error("Error fetching user:", authError);
      throw new Error("User not found");
    }

    const clientEmail = authUser.user.email;
    if (!clientEmail) {
      console.error("No email found for user");
      throw new Error("Client email not found");
    }

    // Get client name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", delivery.client_id)
      .maybeSingle();

    const clientName = profile?.name || "Valued Customer";

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "SkyLink Delivery <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `Delivery Update: ${new_status.charAt(0).toUpperCase() + new_status.slice(1)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .status-badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; margin: 20px 0; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #6b7280; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚁 SkyLink Delivery</h1>
              <p>Delivery Status Update</p>
            </div>
            <div class="content">
              <p>Hello ${clientName},</p>
              <p><strong>${getStatusMessage(new_status)}</strong></p>
              
              <div class="status-badge">${new_status.toUpperCase()}</div>
              
              <div class="details">
                <div class="detail-row">
                  <span class="detail-label">Delivery ID:</span> ${delivery_id}
                </div>
                <div class="detail-row">
                  <span class="detail-label">Pickup:</span> ${delivery.pickup_location}
                </div>
                <div class="detail-row">
                  <span class="detail-label">Dropoff:</span> ${delivery.dropoff_location}
                </div>
                ${delivery.estimated_time ? `
                <div class="detail-row">
                  <span class="detail-label">Estimated Time:</span> ${delivery.estimated_time} minutes
                </div>
                ` : ''}
                ${delivery.package_note ? `
                <div class="detail-row">
                  <span class="detail-label">Package Note:</span> ${delivery.package_note}
                </div>
                ` : ''}
              </div>
              
              <p>You can track your delivery in real-time through the SkyLink app.</p>
              
              <div class="footer">
                <p>This is an automated notification from SkyLink Delivery Service.</p>
                <p>If you have any questions, please contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-delivery-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
