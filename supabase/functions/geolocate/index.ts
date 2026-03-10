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

    // Validate UUID format to prevent injection
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(page_view_id)) {
      return new Response(JSON.stringify({ error: "invalid page_view_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the page_view exists and was created recently (within 60 seconds)
    const { data: pageView, error: fetchError } = await supabase
      .from("page_views")
      .select("id, created_at, country")
      .eq("id", page_view_id)
      .single();

    if (fetchError || !pageView) {
      return new Response(JSON.stringify({ error: "page view not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only enrich if created within the last 60 seconds (prevent replay attacks)
    const createdAt = new Date(pageView.created_at).getTime();
    const now = Date.now();
    if (now - createdAt > 60_000) {
      return new Response(JSON.stringify({ error: "page view too old" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already enriched
    if (pageView.country) {
      return new Response(JSON.stringify({ country: pageView.country, city: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use the connecting IP from request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      "";

    let country: string | null = null;
    let city: string | null = null;

    if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
      try {
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

    await supabase
      .from("page_views")
      .update({ country, city })
      .eq("id", page_view_id);

    return new Response(JSON.stringify({ country, city }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
