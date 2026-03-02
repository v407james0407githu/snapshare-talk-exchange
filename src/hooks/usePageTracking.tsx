import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

function getSessionId(): string {
  let sid = sessionStorage.getItem("pv_sid");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("pv_sid", sid);
  }
  return sid;
}

function extractDomain(url: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function usePageTracking() {
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;

    const record = async () => {
      const sessionId = getSessionId();
      const referrer = document.referrer || "";
      const referrerDomain = extractDomain(referrer);

      // Get user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      const { data: inserted } = await (supabase.from("page_views") as any).insert({
        session_id: sessionId,
        user_id: user?.id || null,
        page_path: path,
        page_title: document.title,
        referrer: referrer || null,
        referrer_domain: referrerDomain,
        user_agent: navigator.userAgent,
        language: navigator.language,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
      }).select("id").single();

      // Fire-and-forget geolocation enrichment
      if (inserted?.id) {
        supabase.functions.invoke("geolocate", {
          body: { page_view_id: inserted.id },
        }).catch(() => {});
      }
    };

    // Small delay to let page title update
    const timer = setTimeout(record, 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);
}
