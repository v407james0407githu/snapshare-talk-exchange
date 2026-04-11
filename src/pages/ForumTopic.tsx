import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Eye,
  Pin,
  PinOff,
  Lock,
  Unlock,
  Loader2,
  Send,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminActions } from "@/hooks/useAdminActions";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ReportDialog } from "@/components/reports/ReportDialog";
import { ForumImageUpload, useTextareaDrop, filesToItems, urlsToItems, uploadPendingItems, type ImageItem } from "@/components/forums/ForumImageUpload";
import { ImageLightbox } from "@/components/forums/ImageLightbox";
import { prefetchForumTopicBundle, readPrefetchedForumTopic } from "@/lib/forumTopicPrefetch";

interface ForumTopicData {
  id: string;
  title: string;
  content: string;
  category: string;
  brand: string | null;
  user_id: string;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface ForumReply {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function normalizeProfile(profile: PublicProfile | null | undefined, userId: string) {
  const displayName = profile?.display_name?.trim();
  const username = profile?.username?.trim();

  return {
    username: username || displayName || `會員 ${userId.slice(0, 8)}`,
    display_name: displayName || null,
    avatar_url: profile?.avatar_url || null,
  };
}

function resolveForumImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (/\/storage\/v1\/object\/public\/photos\/forum\/.+\.(jpe?g|png)$/i.test(parsed.pathname)) {
        parsed.pathname = parsed.pathname.replace(/\.(jpe?g|png)$/i, ".webp");
        return parsed.toString();
      }
    } catch {
      return url;
    }
    return url;
  }

  let cleaned = url
    .replace(/^\/+/, "")
    .replace(/^storage\/v1\/object\/public\/photos\//, "")
    .replace(/^photos\//, "");

  if (/^forum\/.+\.(jpe?g|png)$/i.test(cleaned)) {
    cleaned = cleaned.replace(/\.(jpe?g|png)$/i, ".webp");
  }

  if (!cleaned) return null;
  const { data } = supabase.storage.from("photos").getPublicUrl(cleaned);
  return data.publicUrl;
}

export default function ForumTopic() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState("");
  const [replyImages, setReplyImages] = useState<ImageItem[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingImages, setEditingImages] = useState<ImageItem[]>([]);
  const [editingTopic, setEditingTopic] = useState(false);
  const [editingTopicTitle, setEditingTopicTitle] = useState("");
  const [editingTopicContent, setEditingTopicContent] = useState("");
  const [editingTopicImages, setEditingTopicImages] = useState<ImageItem[]>([]);
  const { canModerate, checkAdminStatus, toggleTopicPinned, toggleTopicLocked, loading: adminLoading } = useAdminActions();
  const topicViewIncrementedRef = useRef<string | null>(null);

  const topicPreview = useMemo(() => {
    const candidate = (location.state as { topicPreview?: Partial<ForumTopicData> } | null)?.topicPreview;
    if (!candidate || candidate.id !== topicId) return null;
    return candidate as ForumTopicData;
  }, [location.state, topicId]);

  const prefetchedBundle = useMemo(
    () => (topicId ? readPrefetchedForumTopic(topicId) : null),
    [topicId],
  );

  const handleReplyDragFiles = (files: File[]) => {
    const isEditing = editingReplyId !== null;
    const currentItems = isEditing ? editingImages : replyImages;
    const remaining = 5 - currentItems.length;
    if (remaining <= 0) { toast.error('最多只能上傳 5 張圖片'); return; }
    const newItems = filesToItems(files).slice(0, remaining);
    if (newItems.length > 0) {
      if (isEditing) {
        setEditingImages(prev => [...prev, ...newItems]);
      } else {
        setReplyImages(prev => [...prev, ...newItems]);
      }
    }
  };

  const replyDrag = useTextareaDrop(handleReplyDragFiles, !user);

  // Check admin status when user is available
  useState(() => {
    if (user) {
      checkAdminStatus();
    }
  });

  // Fetch topic
  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ["forum-topic", topicId],
    queryFn: async () => {
      const bundle = await prefetchForumTopicBundle(topicId!, topicPreview ?? prefetchedBundle?.topic ?? undefined);
      if (!bundle.topic) throw new Error("找不到主題");
      return bundle.topic as ForumTopicData;
    },
    enabled: !!topicId,
    initialData: topicPreview ?? prefetchedBundle?.topic ?? undefined,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  // Fetch replies
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ["forum-replies", topicId],
    queryFn: async () => {
      const bundle = await prefetchForumTopicBundle(topicId!, topicPreview ?? prefetchedBundle?.topic ?? undefined);
      return (bundle.replies || []) as ForumReply[];
    },
    enabled: !!topicId,
    initialData: prefetchedBundle?.replies ?? undefined,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!topicId || !topic || topicViewIncrementedRef.current === topicId) return;

    topicViewIncrementedRef.current = topicId;
    void supabase
      .from("forum_topics")
      .update({ view_count: (topic.view_count || 0) + 1 })
      .eq("id", topicId);
  }, [topic, topicId]);

  // Realtime subscription for forum replies
  useEffect(() => {
    if (!topicId) return;

    const channel = supabase
      .channel(`forum-replies-${topicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forum_replies',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["forum-replies", topicId] });
          queryClient.invalidateQueries({ queryKey: ["forum-topic", topicId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId, queryClient]);

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("請先登入");
      if (!topicId) throw new Error("主題不存在");

      const imageUrls = replyImages.length > 0 ? await uploadPendingItems(replyImages) : null;
      const { error } = await supabase.from("forum_replies").insert({
        topic_id: topicId,
        content,
        user_id: user.id,
        image_urls: imageUrls,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-replies", topicId] });
      queryClient.invalidateQueries({ queryKey: ["forum-topic", topicId] });
      toast.success("回覆成功");
      setReplyContent("");
      setReplyImages([]);
    },
    onError: (error) => {
      toast.error("回覆失敗：" + (error as Error).message);
    },
  });

  // Update reply mutation
  const updateReplyMutation = useMutation({
    mutationFn: async ({ replyId, content, items }: { replyId: string; content: string; items: ImageItem[] }) => {
      if (!user) throw new Error("請先登入");
      const imageUrls = items.length > 0 ? await uploadPendingItems(items) : null;
      const { error } = await supabase
        .from("forum_replies")
        .update({ content, image_urls: imageUrls } as any)
        .eq("id", replyId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-replies", topicId] });
      toast.success("回覆已更新");
      setEditingReplyId(null);
      setEditingContent("");
      setEditingImages([]);
    },
    onError: (error) => {
      toast.error("更新失敗：" + (error as Error).message);
    },
  });

  // Update topic mutation
  const updateTopicMutation = useMutation({
    mutationFn: async ({ title, content, items }: { title: string; content: string; items: ImageItem[] }) => {
      if (!user || !topicId) throw new Error("請先登入");
      const imageUrls = items.length > 0 ? await uploadPendingItems(items) : null;
      const { error } = await supabase
        .from("forum_topics")
        .update({ title, content, image_urls: imageUrls } as any)
        .eq("id", topicId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-topic", topicId] });
      toast.success("主題已更新");
      setEditingTopic(false);
    },
    onError: (error) => {
      toast.error("更新失敗：" + (error as Error).message);
    },
  });

  // Delete reply mutation
  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      if (!user) throw new Error("請先登入");
      const { error } = await supabase
        .from("forum_replies")
        .delete()
        .eq("id", replyId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-replies", topicId] });
      queryClient.invalidateQueries({ queryKey: ["forum-topic", topicId] });
      toast.success("回覆已刪除");
    },
    onError: (error) => {
      toast.error("刪除失敗：" + (error as Error).message);
    },
  });

  const handleSubmitReply = () => {
    if (!user) {
      toast.error("請先登入");
      navigate("/auth");
      return;
    }
    if (!replyContent.trim()) {
      toast.error("請輸入回覆內容");
      return;
    }
    createReplyMutation.mutate(replyContent);
  };

  const handleStartEdit = (reply: ForumReply) => {
    setEditingReplyId(reply.id);
    setEditingContent(reply.content);
    const imgs = reply.image_urls?.length ? reply.image_urls : reply.image_url ? [reply.image_url] : [];
    const resolvedImages = imgs.map(resolveForumImageUrl).filter(Boolean) as string[];
    setEditingImages(urlsToItems(resolvedImages));
  };

  const handleCancelEdit = () => {
    setEditingReplyId(null);
    setEditingContent("");
    setEditingImages([]);
  };

  const handleSaveEdit = () => {
    if (!editingReplyId || !editingContent.trim()) return;
    updateReplyMutation.mutate({ replyId: editingReplyId, content: editingContent, items: editingImages });
  };

  const handleStartEditTopic = () => {
    if (!topic) return;
    setEditingTopic(true);
    setEditingTopicTitle(topic.title);
    setEditingTopicContent(topic.content);
    const imgs = topic.image_urls?.length ? topic.image_urls : topic.image_url ? [topic.image_url] : [];
    const resolvedImages = imgs.map(resolveForumImageUrl).filter(Boolean) as string[];
    setEditingTopicImages(urlsToItems(resolvedImages));
  };

  const handleSaveEditTopic = () => {
    if (!editingTopicTitle.trim() || !editingTopicContent.trim()) return;
    updateTopicMutation.mutate({ title: editingTopicTitle, content: editingTopicContent, items: editingTopicImages });
  };

  const handleDeleteTopic = async () => {
    if (!user || !topic) return;
    setIsDeleting(true);

    try {
      // Delete related content_tags
      await supabase.from("content_tags").delete().eq("content_id", topic.id);
      // Delete related replies
      await supabase.from("forum_replies").delete().eq("topic_id", topic.id);
      // Delete the topic
      const { error } = await supabase.from("forum_topics").delete().eq("id", topic.id);

      if (error) throw error;

      toast.success("討論串已刪除");
      navigate("/forums");
    } catch (err: any) {
      toast.error("刪除失敗：" + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: zhTW,
    });
  };

  const formatFullDate = (dateString: string) => {
    return format(new Date(dateString), "yyyy年MM月dd日 HH:mm", { locale: zhTW });
  };

  if (topicLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!topic) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">主題不存在</h2>
          <Link to="/forums">
            <Button>返回論壇</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/forums"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回論壇
          </Link>
        </div>

        {/* Topic Header */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="flex items-start gap-4">
            {topic.is_pinned && (
              <Pin className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
            )}
            {topic.is_locked && (
              <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                  {topic.category}
                </span>
                {topic.brand && (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                    {topic.brand}
                  </span>
                )}
              </div>
              {editingTopic ? (
                <>
                  <input
                    className="text-2xl font-bold mb-4 w-full bg-background border border-input rounded-md px-3 py-2"
                    value={editingTopicTitle}
                    onChange={(e) => setEditingTopicTitle(e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={topic.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {topic.profiles?.display_name?.[0] || topic.profiles?.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{topic.profiles?.display_name || topic.profiles?.username}</div>
                      <div className="text-sm text-muted-foreground">{formatFullDate(topic.created_at)}</div>
                    </div>
                  </div>
                  <Textarea
                    value={editingTopicContent}
                    onChange={(e) => setEditingTopicContent(e.target.value)}
                    rows={6}
                  />
                  <ForumImageUpload
                    items={editingTopicImages}
                    onItemsChange={setEditingTopicImages}
                    disabled={updateTopicMutation.isPending}
                  />
                  <div className="flex gap-2 justify-end mt-3">
                    <Button variant="ghost" size="sm" onClick={() => setEditingTopic(false)} disabled={updateTopicMutation.isPending}>
                      <X className="h-4 w-4 mr-1" />取消
                    </Button>
                    <Button size="sm" onClick={handleSaveEditTopic} disabled={updateTopicMutation.isPending || !editingTopicTitle.trim() || !editingTopicContent.trim()}>
                      {updateTopicMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                      儲存
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold mb-4">{topic.title}</h1>

                  <div className="flex items-center gap-4 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={topic.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {topic.profiles?.display_name?.[0] || topic.profiles?.username?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{topic.profiles?.display_name || topic.profiles?.username}</div>
                      <div className="text-sm text-muted-foreground">{formatFullDate(topic.created_at)}</div>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{topic.content}</p>
                    {(() => {
                      const imgs = topic.image_urls?.length ? topic.image_urls : topic.image_url ? [topic.image_url] : [];
                      return imgs.length > 0 ? (
                        <div className="flex flex-wrap gap-3 mt-4">
                          {imgs.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt={`主題附圖 ${i + 1}`}
                              className="max-h-64 rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity object-cover"
                              onClick={() => { setLightboxImages(imgs); setLightboxIndex(i); setLightboxOpen(true); }}
                            />
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {topic.view_count || 0} 瀏覽
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {topic.reply_count || 0} 回覆
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {user && user.id === topic.user_id && !editingTopic && (
                    <Button variant="ghost" size="sm" className="gap-1" onClick={handleStartEditTopic}>
                      <Pencil className="h-3.5 w-3.5" />編輯
                    </Button>
                  )}
                  {user && user.id !== topic.user_id && (
                    <ReportDialog
                      contentType="forum_topic"
                      contentId={topic.id}
                      reportedUserId={topic.user_id}
                    />
                  )}
                </div>
              </div>

              {/* Delete Button - Owner or Admin */}
              {user && (user.id === topic.user_id || canModerate) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2" disabled={isDeleting}>
                        <Trash2 className="h-4 w-4" />
                        刪除討論串
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>確定要刪除這個討論串嗎？</AlertDialogTitle>
                        <AlertDialogDescription>
                          此操作無法復原，討論串及其所有回覆將會被永久刪除。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTopic} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          確定刪除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              {/* Admin Controls */}
              {canModerate && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">管理員操作</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={topic.is_pinned ? "destructive" : "outline"}
                      size="sm"
                      onClick={async () => {
                        const success = await toggleTopicPinned(topic.id, topic.is_pinned);
                        if (success) {
                          queryClient.invalidateQueries({ queryKey: ["forum-topic", topicId] });
                        }
                      }}
                      disabled={adminLoading}
                      className="gap-2"
                    >
                      {topic.is_pinned ? (
                        <>
                          <PinOff className="h-4 w-4" />
                          取消置頂
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4" />
                          設為置頂
                        </>
                      )}
                    </Button>
                    <Button
                      variant={topic.is_locked ? "outline" : "secondary"}
                      size="sm"
                      onClick={async () => {
                        const success = await toggleTopicLocked(topic.id, topic.is_locked);
                        if (success) {
                          queryClient.invalidateQueries({ queryKey: ["forum-topic", topicId] });
                        }
                      }}
                      disabled={adminLoading}
                      className="gap-2"
                    >
                      {topic.is_locked ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          解鎖主題
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          鎖定主題
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Replies */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            回覆 ({replies?.length || 0})
          </h2>

          {repliesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : replies?.length ? (
            <div className="space-y-4">
              {replies.map((reply, index) => (
                <div
                  key={reply.id}
                  className="bg-card rounded-xl border border-border p-6"
                >
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reply.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {reply.profiles?.display_name?.[0] ||
                          reply.profiles?.username?.[0] ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {reply.profiles?.display_name ||
                              reply.profiles?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(reply.created_at)}
                          </span>
                          {user && user.id === reply.user_id && editingReplyId !== reply.id && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(reply)} title="編輯">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="刪除">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>確定要刪除這則回覆嗎？</AlertDialogTitle>
                                    <AlertDialogDescription>此操作無法復原，回覆將會被永久刪除。</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>取消</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteReplyMutation.mutate(reply.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      確定刪除
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                          <ReportDialog
                            contentType="forum_reply"
                            contentId={reply.id}
                            reportedUserId={reply.user_id}
                          />
                        </div>
                      </div>
                      {editingReplyId === reply.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            rows={3}
                            autoFocus
                          />
                          <ForumImageUpload
                            items={editingImages}
                            onItemsChange={setEditingImages}
                            disabled={updateReplyMutation.isPending}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={updateReplyMutation.isPending}>
                              <X className="h-4 w-4 mr-1" />取消
                            </Button>
                            <Button size="sm" onClick={handleSaveEdit} disabled={updateReplyMutation.isPending || !editingContent.trim()}>
                              {updateReplyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                              儲存
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap text-foreground/90">
                            {reply.content}
                          </p>
                          {(() => {
                            const imgs = (reply.image_urls?.length ? reply.image_urls : reply.image_url ? [reply.image_url] : [])
                              .map(resolveForumImageUrl)
                              .filter(Boolean) as string[];
                            return imgs.length > 0 ? (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {imgs.map((url, i) => (
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`回覆附圖 ${i + 1}`}
                                    className="max-w-full max-h-64 rounded-lg border border-border cursor-pointer hover:opacity-90 transition-opacity object-contain"
                                    onError={(event) => {
                                      event.currentTarget.style.display = "none";
                                    }}
                                    onClick={() => { setLightboxImages(imgs); setLightboxIndex(i); setLightboxOpen(true); }}
                                  />
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              還沒有回覆，來發表第一個回覆吧！
            </div>
          )}
        </div>

        {/* Reply Form */}
        {topic.is_locked ? (
          <div className="bg-muted/50 rounded-xl border border-border p-6 text-center text-muted-foreground">
            <Lock className="h-6 w-6 mx-auto mb-2" />
            此主題已鎖定，無法回覆
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-semibold mb-4">發表回覆</h3>
            <div
              className={`relative rounded-md transition-colors ${replyDrag.dragOver ? 'ring-2 ring-primary' : ''}`}
              {...replyDrag.handlers}
            >
              <Textarea
                placeholder={user ? "分享你的想法...（可拖拉圖片到此處上傳）" : "請先登入才能回覆"}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
                disabled={!user}
                maxLength={10000}
              />
              {replyDrag.dragOver && (
                <div className="absolute inset-0 bg-primary/10 rounded-md flex items-center justify-center pointer-events-none">
                  <span className="text-primary font-medium text-sm">放開以上傳圖片</span>
                </div>
              )}
            </div>
            <div className="mt-3">
              <ForumImageUpload
                items={replyImages}
                onItemsChange={setReplyImages}
                disabled={!user || createReplyMutation.isPending}
              />
            </div>
            <div className="flex justify-end mt-4">
              <Button
                onClick={handleSubmitReply}
                disabled={createReplyMutation.isPending || !user}
                className="gap-2"
              >
                {createReplyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    發送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    發表回覆
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </MainLayout>
  );
}
