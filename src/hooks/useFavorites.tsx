import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Favorite {
  id: string;
  user_id: string;
  content_type: string;
  content_id: string;
  created_at: string;
}

export function useFavorites(contentType?: string, contentId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 檢查是否已收藏
  const { data: isFavorited } = useQuery({
    queryKey: ['favorite-check', contentType, contentId, user?.id],
    queryFn: async () => {
      if (!contentType || !contentId) return false;
      
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user?.id)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!contentType && !!contentId,
  });

  // 獲取用戶的所有收藏
  const { data: favorites, isLoading: favoritesLoading } = useQuery({
    queryKey: ['user-favorites', user?.id, contentType],
    queryFn: async () => {
      let query = supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (contentType) {
        query = query.eq('content_type', contentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Favorite[];
    },
    enabled: !!user,
  });

  // 新增收藏
  const addFavorite = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const { error } = await supabase.from('favorites').insert({
        user_id: user?.id,
        content_type: type,
        content_id: id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-check'] });
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
      toast({
        title: '收藏成功',
        description: '已加入您的收藏',
      });
    },
    onError: (error: any) => {
      toast({
        title: '收藏失敗',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 取消收藏
  const removeFavorite = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user?.id)
        .eq('content_type', type)
        .eq('content_id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-check'] });
      queryClient.invalidateQueries({ queryKey: ['user-favorites'] });
      toast({
        title: '取消收藏',
        description: '已從收藏中移除',
      });
    },
    onError: (error: any) => {
      toast({
        title: '操作失敗',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 切換收藏狀態
  const toggleFavorite = async (type: string, id: string) => {
    if (!user) {
      toast({
        title: '請先登入',
        description: '登入後才能收藏',
        variant: 'destructive',
      });
      return;
    }

    // 檢查當前狀態
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_type', type)
      .eq('content_id', id)
      .maybeSingle();

    if (data) {
      removeFavorite.mutate({ type, id });
    } else {
      addFavorite.mutate({ type, id });
    }
  };

  return {
    isFavorited,
    favorites,
    favoritesLoading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isToggling: addFavorite.isPending || removeFavorite.isPending,
  };
}
