import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useAdminActions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkAdminStatus = async () => {
    if (!user || checked) return;
    
    try {
      const [adminResult, modResult] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" }),
      ]);

      setIsAdmin(!!adminResult.data);
      setIsModerator(!!modResult.data);
      setChecked(true);
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const togglePhotoFeatured = async (photoId: string, currentStatus: boolean) => {
    if (!user) {
      toast.error("請先登入");
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("photos")
        .update({ is_featured: !currentStatus })
        .eq("id", photoId);

      if (error) throw error;

      toast.success(currentStatus ? "已取消置頂" : "已設為置頂");
      return true;
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast.error("操作失敗");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleTopicPinned = async (topicId: string, currentStatus: boolean) => {
    if (!user) {
      toast.error("請先登入");
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("forum_topics")
        .update({ is_pinned: !currentStatus })
        .eq("id", topicId);

      if (error) throw error;

      toast.success(currentStatus ? "已取消置頂" : "已設為置頂");
      return true;
    } catch (error) {
      console.error("Error toggling pinned:", error);
      toast.error("操作失敗");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleTopicLocked = async (topicId: string, currentStatus: boolean) => {
    if (!user) {
      toast.error("請先登入");
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("forum_topics")
        .update({ is_locked: !currentStatus })
        .eq("id", topicId);

      if (error) throw error;

      toast.success(currentStatus ? "已解鎖主題" : "已鎖定主題");
      return true;
    } catch (error) {
      console.error("Error toggling locked:", error);
      toast.error("操作失敗");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isAdmin,
    isModerator,
    canModerate: isAdmin || isModerator,
    loading,
    checkAdminStatus,
    togglePhotoFeatured,
    toggleTopicPinned,
    toggleTopicLocked,
  };
}
