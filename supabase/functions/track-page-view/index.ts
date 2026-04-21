import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type TrackPageViewBody = {
  session_id?: string;
  page_path?: string;
  page_title?: string | null;
  referrer?: string | null;
  referrer_domain?: string | null;
  language?: string | null;
  screen_width?: number | null;
  screen_height?: number | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function limitText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function normalizePath(value: unknown) {
  const path = limitText(value, 512);
  if (!path || !path.startsWith("/")) return null;
  return path;
}

function normalizeScreenSize(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value <= 0 || value > 100_000) return null;
  return Math.round(value);
}

function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

async function lookupGeo(clientIp: string) {
  if (!clientIp || clientIp === "127.0.0.1" || clientIp === "::1") {
    return { country: null, city: null };
  }

  try {
    const geoRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city&lang=zh-CN`);
    if (!geoRes.ok) return { country: null, city: null };

    const geo = await geoRes.json();
    if (geo.status !== "success") return { country: null, city: null };

    return {
      country: typeof geo.country === "string" ? geo.country.slice(0, 128) : null,
      city: typeof geo.city === "string" ? geo.city.slice(0, 128) : null,
    };
  } catch (error) {
    console.error("Geo lookup failed:", error);
    return { country: null, city: null };
  }
}

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, anonKey: string) {
  const authorization = req.headers.get("authorization");
  if (!authorization) return null;

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { authorization } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error) return null;

  return data.user?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse({ error: "missing Supabase environment variables" }, 500);
    }

    const body = (await req.json()) as TrackPageViewBody;
    const sessionId = limitText(body.session_id, 128);
    const pagePath = normalizePath(body.page_path);

    if (!sessionId || !pagePath) {
      return jsonResponse({ error: "missing required tracking fields" }, 400);
    }

    const userId = await getAuthenticatedUserId(req, supabaseUrl, anonKey);
    const { country, city } = await lookupGeo(getClientIp(req));

    const supabase = createClient(supabaseUrl, serviceKey);
    const { error } = await supabase.from("page_views").insert({
      session_id: sessionId,
      user_id: userId,
      page_path: pagePath,
      page_title: limitText(body.page_title, 300),
      referrer: limitText(body.referrer, 1000),
      referrer_domain: limitText(body.referrer_domain, 255),
      user_agent: limitText(req.headers.get("user-agent"), 1000),
      language: limitText(body.language, 64),
      screen_width: normalizeScreenSize(body.screen_width),
      screen_height: normalizeScreenSize(body.screen_height),
      country,
      city,
    });

    if (error) {
      console.error("Page view insert failed:", error);
      return jsonResponse({ error: "failed to track page view" }, 500);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("Track page view failed:", error);
    return jsonResponse({ error: "internal error" }, 500);
  }
});
