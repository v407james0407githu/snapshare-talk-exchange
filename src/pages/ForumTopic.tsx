import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminActions } from "@/hooks/useAdminActions";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ReportDialog } from "@/components/reports/ReportDialog";

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
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function ForumTopic() {
  const { topicId } = useParams<{ topicId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState("");
  const { canModerate, checkAdminStatus, toggleTopicPinned, toggleTopicLocked, loading: adminLoading } = useAdminActions();

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
      const { data: topicData, error: topicError } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("id", topicId)
        .single();

      if (topicError) throw topicError;

      // Fetch profile for topic author
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("user_id", topicData.user_id)
        .single();

      // Increment view count
      await supabase
        .from("forum_topics")
        .update({ view_count: (topicData.view_count || 0) + 1 })
        .eq("id", topicId);

      return {
        ...topicData,
        profiles: profileData,
      } as ForumTopicData;
    },
    enabled: !!topicId,
  });

  // Fetch replies
  const { data: replies, isLoading: repliesLoading } = useQuery({
    queryKey: ["forum-replies", topicId],
    queryFn: async () => {
      const { data: repliesData, error: repliesError } = await supabase
        .from("forum_replies")
        .select("*")
        .eq("topic_id", topicId)
        .order("created_at", { ascending: true });

      if (repliesError) throw repliesError;

      // Fetch profiles for all reply authors
      const userIds = [...new Set(repliesData.map((r) => r.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, p]) || []
      );

      return repliesData.map((reply) => ({
        ...reply,
        profiles: profilesMap.get(reply.user_id),
      })) as ForumReply[];
    },
    enabled: !!topicId,
  });

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) throw new Error("請先登入");
      if (!topicId) throw new Error("主題不存在");

      const { error } = await supabase.from("forum_replies").insert({
        topic_id: topicId,
        content,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-replies", topicId] });
      queryClient.invalidateQueries({ queryKey: ["forum-topic", topicId] });
      toast.success("回覆成功");
      setReplyContent("");
    },
    onError: (error) => {
      toast.error("回覆失敗：" + (error as Error).message);
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
              <h1 className="text-2xl font-bold mb-4">{topic.title}</h1>

              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={topic.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {topic.profiles?.display_name?.[0] ||
                      topic.profiles?.username?.[0] ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {topic.profiles?.display_name || topic.profiles?.username}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatFullDate(topic.created_at)}
                  </div>
                </div>
              </div>

              <div className="prose prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{topic.content}</p>
              </div>

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
                <ReportDialog
                  contentType="forum_topic"
                  contentId={topic.id}
                  reportedUserId={topic.user_id}
                />
              </div>

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
                          <ReportDialog
                            contentType="forum_reply"
                            contentId={reply.id}
                            reportedUserId={reply.user_id}
                          />
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-foreground/90">
                        {reply.content}
                      </p>
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
            <Textarea
              placeholder={user ? "分享你的想法..." : "請先登入才能回覆"}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              disabled={!user}
            />
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
    </MainLayout>
  );
}
