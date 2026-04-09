import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Users, Clock, Pin, TrendingUp, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { getCategoryColor } from "./ForumCategorySelector";
import { prefetchForumTopicBundle } from "@/lib/forumTopicPrefetch";
import { supabase } from "@/integrations/supabase/client";

export interface ForumTopic {
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
  last_reply_at: string | null;
  category_id: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  tags?: string[];
  reply_previews?: TopicReplyPreview[];
}

export interface TopicReplyPreview {
  id: string;
  topic_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
}

function normalizeAuthorName(
  profile?: { display_name?: string | null; username?: string | null },
  userId?: string,
) {
  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  const username = profile?.username?.trim();
  if (username) return username;

  return userId ? `會員 ${userId.slice(0, 8)}` : "愛屁543會員";
}

function compactReplyText(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

export async function fetchTopicReplyPreviews(topicIds: string[]) {
  if (!topicIds.length) return new Map<string, TopicReplyPreview[]>();

  const { data: replies, error: repliesError } = await supabase
    .from("forum_replies")
    .select("id, topic_id, user_id, content, created_at")
    .in("topic_id", topicIds)
    .order("created_at", { ascending: false })
    .limit(Math.max(topicIds.length * 4, 16));

  if (repliesError) throw repliesError;

  const replyRows = (replies || []).filter((reply) => topicIds.includes(reply.topic_id));
  if (!replyRows.length) return new Map<string, TopicReplyPreview[]>();

  const userIds = [...new Set(replyRows.map((reply) => reply.user_id))];
  const { data: profilesData, error: profilesError } = userIds.length
    ? await supabase.rpc("get_public_profiles")
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    (((profilesData as Array<{ user_id: string; username: string | null; display_name: string | null }> | null) || [])
      .filter((profile) => userIds.includes(profile.user_id))
      .map((profile) => [profile.user_id, profile])),
  );

  const previewsByTopic = new Map<string, TopicReplyPreview[]>();

  for (const reply of replyRows) {
    const existing = previewsByTopic.get(reply.topic_id) || [];
    if (existing.length >= 2) continue;
    existing.push({
      id: reply.id,
      topic_id: reply.topic_id,
      user_id: reply.user_id,
      content: compactReplyText(reply.content),
      created_at: reply.created_at,
      author_name: normalizeAuthorName(profileMap.get(reply.user_id), reply.user_id),
    });
    previewsByTopic.set(reply.topic_id, existing);
  }

  return previewsByTopic;
}

const categoryColors: Record<string, string> = {
  手機攝影: "green",
  相機攝影: "blue",
  攝影技術: "purple",
  哈拉打屁: "orange",
};

function formatTime(dateString: string | null) {
  if (!dateString) return "剛剛";
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhTW });
}

interface TopicListProps {
  topics: ForumTopic[] | undefined;
  onTagClick?: (tag: string) => void;
}

export function TopicList({ topics, onTagClick }: TopicListProps) {
  const topicIds = topics?.map((topic) => topic.id) || [];
  const { data: replyPreviewMap } = useQuery({
    queryKey: ["forum-topic-reply-previews", topicIds],
    enabled: topicIds.length > 0,
    staleTime: 1000 * 60 * 3,
    queryFn: () => fetchTopicReplyPreviews(topicIds),
  });

  if (!topics?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">目前沒有主題</div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
        <div className="col-span-7">主題</div>
        <div className="col-span-2 text-center">回覆 / 瀏覽</div>
        <div className="col-span-3 text-right">最後活動</div>
      </div>

      <div className="divide-y divide-border">
        {topics.map((topic) => {
          const replyPreviews = topic.reply_previews || replyPreviewMap?.get(topic.id) || [];
          return (
          <Link
            key={topic.id}
            to={`/forums/topic/${topic.id}`}
            state={{ topicPreview: topic }}
            className="group block px-6 py-4 motion-list-item hover:bg-muted/40"
            onMouseEnter={() => void prefetchForumTopicBundle(topic.id, topic)}
            onFocus={() => void prefetchForumTopicBundle(topic.id, topic)}
            onTouchStart={() => void prefetchForumTopicBundle(topic.id, topic)}
            onMouseDown={() => void prefetchForumTopicBundle(topic.id, topic)}
            onPointerDown={() => void prefetchForumTopicBundle(topic.id, topic)}
          >
            <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
              <div className="col-span-7">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                    {topic.profiles?.avatar_url ? (
                      <img
                        src={topic.profiles.avatar_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full rounded-full object-cover motion-media"
                      />
                    ) : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {topic.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {(topic.reply_count || 0) > 10 && <TrendingUp className="h-3.5 w-3.5 text-destructive" />}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(categoryColors[topic.category])}`}>
                        {topic.category}
                      </span>
                      {topic.brand && (
                        <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          {topic.brand}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground line-clamp-1 motion-list-title">
                      {topic.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">
                        {topic.profiles?.display_name || topic.profiles?.username}
                      </p>
                      {topic.tags && topic.tags.length > 0 && (
                        <div className="flex gap-1">
                          {topic.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs cursor-pointer motion-interactive hover:bg-primary/10"
                              onClick={(e) => {
                                e.preventDefault();
                                onTagClick?.(tag);
                              }}
                            >
                              <Tag className="h-2.5 w-2.5 mr-0.5" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {replyPreviews.length > 0 && (
                      <div className="mt-3 space-y-1.5 rounded-lg border border-border/60 bg-background/70 px-3 py-2">
                        {replyPreviews.map((reply) => (
                          <div key={reply.id} className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/80">{reply.author_name}</span>
                            <span className="mx-1 text-muted-foreground/60">：</span>
                            <span className="line-clamp-1">{reply.content}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-span-2 hidden md:flex items-center justify-center gap-4">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />{topic.reply_count || 0}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />{topic.view_count || 0}
                </span>
              </div>

              <div className="col-span-3 hidden md:flex items-center justify-end gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(topic.last_reply_at || topic.created_at)}
              </div>

              <div className="flex items-center gap-4 mt-2 md:hidden text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />{topic.reply_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />{formatTime(topic.last_reply_at || topic.created_at)}
                </span>
              </div>
            </div>
          </Link>
        )})}
      </div>
    </div>
  );
}
