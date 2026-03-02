import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { page_view_id } = await req.json();
    if (!page_view_id) {
      return new Response(JSON.stringify({ error: "missing page_view_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the connecting IP from Deno request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";

    let country: string | null = null;
    let city: string | null = null;

    if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
      try {
        // Free IP geolocation API (no key required)
        const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city&lang=zh-CN`);
        if (geoRes.ok) {
          const geo = await geoRes.json();
          if (geo.status === "success") {
            country = geo.country || null;
            city = geo.city || null;
          }
        }
      } catch (e) {
        console.error("Geo lookup failed:", e);
      }
    }

    // Update the page_view record
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    await supabase
      .from("page_views")
      .update({ country, city })
      .eq("id", page_view_id);

    return new Response(JSON.stringify({ country, city }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("geolocate error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
