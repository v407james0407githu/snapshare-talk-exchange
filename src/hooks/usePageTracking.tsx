import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export function usePageTracking() {
  const location = useLocation();
  const lastPath = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;
    if (path === lastPath.current) return;
    lastPath.current = path;

    // Use requestIdleCallback to avoid blocking main thread during critical render
    const schedule = typeof requestIdleCallback === 'function' 
      ? requestIdleCallback 
      : (cb: () => void) => setTimeout(cb, 2000);

    const id = schedule(async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        let sid = sessionStorage.getItem("pv_sid");
        if (!sid) {
          sid = crypto.randomUUID();
          sessionStorage.setItem("pv_sid", sid);
        }

        const { data: { session } } = await supabase.auth.getSession();
        const referrer = document.referrer || "";
        let referrerDomain: string | null = null;
        try { referrerDomain = referrer ? new URL(referrer).hostname : null; } catch {}

        const { data: inserted } = await (supabase.from("page_views") as any).insert({
          session_id: sid,
          user_id: session?.user?.id || null,
          page_path: path,
          page_title: document.title,
          referrer: referrer || null,
          referrer_domain: referrerDomain,
          user_agent: navigator.userAgent,
          language: navigator.language,
          screen_width: window.screen.width,
          screen_height: window.screen.height,
        }).select("id").single();

        if (inserted?.id) {
          supabase.functions.invoke("geolocate", {
            body: { page_view_id: inserted.id },
          }).catch(() => {});
        }
      } catch {}
    });

    return () => {
      if (typeof cancelIdleCallback === 'function' && typeof id === 'number') {
        cancelIdleCallback(id);
      }
    };
  }, [location.pathname]);
}
