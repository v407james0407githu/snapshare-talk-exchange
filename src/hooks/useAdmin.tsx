import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      const [adminRes, modRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "moderator" }),
      ]);
      return {
        isAdmin: Boolean(adminRes.data),
        isModerator: Boolean(modRes.data),
      };
    },
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  return {
    isAdmin: roles?.isAdmin ?? false,
    isModerator: roles?.isModerator ?? false,
    loading: authLoading || isLoading,
    user,
  };
}
