import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAdminRole() {
      if (authLoading) return;

      if (!user) {
        setLoading(false);
        toast.error("請先登入");
        navigate("/auth");
        return;
      }

      try {
        // Check admin role
        const { data: adminData } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });

        // Check moderator role
        const { data: modData } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "moderator",
        });

        setIsAdmin(!!adminData);
        setIsModerator(!!modData);

        if (!adminData && !modData) {
          toast.error("您沒有權限訪問此頁面");
          navigate("/");
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
        toast.error("權限驗證失敗");
        navigate("/");
      } finally {
        setLoading(false);
      }
    }

    checkAdminRole();
  }, [user, authLoading, navigate]);

  return { isAdmin, isModerator, loading, user };
}
