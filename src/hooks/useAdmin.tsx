import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkRoles() {
      if (authLoading) return;

      // Guests: no redirects, just treat as non-admin.
      if (!user) {
        if (cancelled) return;
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
        return;
      }

      try {
        const [adminRes, modRes] = await Promise.all([
          supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
          supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" }),
        ]);

        if (cancelled) return;
        setIsAdmin(Boolean(adminRes.data));
        setIsModerator(Boolean(modRes.data));
      } catch (error) {
        console.error("Error checking roles:", error);
        if (cancelled) return;
        setIsAdmin(false);
        setIsModerator(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    checkRoles();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin, isModerator, loading, user };
}
