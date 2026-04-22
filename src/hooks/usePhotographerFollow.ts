import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

function getFollowErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "請稍後再試";

  if (
    message.includes("user_follows_unique") ||
    message.includes("duplicate key") ||
    message.includes("already exists")
  ) {
    return "你已經追蹤這位攝影師了。";
  }

  if (message.includes("user_follows")) {
    return "追蹤功能尚未完成資料庫更新，請先同步最新 migration。";
  }

  return message;
}

export function usePhotographerFollow(targetUserId?: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSelf = useMemo(
    () => Boolean(user?.id && targetUserId && user.id === targetUserId),
    [targetUserId, user?.id],
  );

  const followStateQuery = useQuery({
    queryKey: ["photographer-follow-state", user?.id ?? "anon", targetUserId ?? "none"],
    enabled: !!targetUserId && !!user?.id,
    queryFn: async () => {
      if (!user?.id || !targetUserId) {
        return {
          followerCount: 0,
          isFollowing: false,
        };
      }

      const [{ count, error: countError }, relationship] = await Promise.all([
        supabase
          .from("user_follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", targetUserId!),
        user?.id && !isSelf
          ? supabase
              .from("user_follows")
              .select("id")
              .eq("follower_id", user.id)
              .eq("following_id", targetUserId!)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as const),
      ]);

      if (countError) throw countError;
      if (relationship?.error) throw relationship.error;

      return {
        followerCount: count ?? 0,
        isFollowing: Boolean(relationship?.data?.id),
      };
    },
    staleTime: 60 * 1000,
  });

  const invalidateRelatedQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["photographer-follow-state"] }),
      queryClient.invalidateQueries({ queryKey: ["homepage-following-feed"] }),
      queryClient.invalidateQueries({ queryKey: ["user-profile", targetUserId] }),
    ]);
  };

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("請先登入");
      if (!targetUserId) throw new Error("缺少攝影師資訊");
      if (isSelf) throw new Error("不能追蹤自己");
      if (followStateQuery.data?.isFollowing) return;

      const { error } = await supabase
        .from("user_follows")
        .upsert(
          { follower_id: user.id, following_id: targetUserId },
          { onConflict: "follower_id,following_id", ignoreDuplicates: true },
        );

      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateRelatedQueries();
      toast({ title: "已追蹤攝影師", description: "首頁將顯示這位攝影師的新作品。" });
    },
    onError: (error: Error) => {
      toast({ title: "追蹤失敗", description: getFollowErrorMessage(error), variant: "destructive" });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("請先登入");
      if (!targetUserId) throw new Error("缺少攝影師資訊");

      const { error } = await supabase
        .from("user_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateRelatedQueries();
      toast({ title: "已取消追蹤", description: "首頁將不再優先顯示這位攝影師的新作品。" });
    },
    onError: (error: Error) => {
      toast({ title: "取消追蹤失敗", description: getFollowErrorMessage(error), variant: "destructive" });
    },
  });

  return {
    followerCount: followStateQuery.data?.followerCount ?? 0,
    isFollowing: followStateQuery.data?.isFollowing ?? false,
    isSelf,
    isLoading: followStateQuery.isLoading,
    isMutating: followMutation.isPending || unfollowMutation.isPending,
    follow: followMutation.mutateAsync,
    unfollow: unfollowMutation.mutateAsync,
  };
}
