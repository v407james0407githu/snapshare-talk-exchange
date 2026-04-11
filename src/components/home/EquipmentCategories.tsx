import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Smartphone, Camera, ChevronRight, MessageSquare, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { getPublicSupabase } from "@/lib/publicSupabase";
import { readBootstrapCache, writeBootstrapCache } from "@/lib/bootstrapCache";

type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

interface CategoryRow {
  id: string;
  name: string;
  color: string | null;
  parent_id: string | null;
}

interface ReplyFeedItem {
  id: string;
  content: string;
  created_at: string;
  topic_id: string;
  user_id: string;
  topic_title: string;
  topic_category: string;
  topic_category_id: string | null;
  author_name: string;
  avatar_url: string | null;
  group: "phone" | "camera" | "other";
}

interface ActivityColumnProps {
  icon: React.ReactNode;
  title: string;
  linkPrefix: string;
  items: ReplyFeedItem[];
  isLoading?: boolean;
}

function normalizeAuthorName(profile: PublicProfile | null | undefined, userId?: string) {
  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  const username = profile?.username?.trim();
  if (username) return username;

  return userId ? `會員 ${userId.slice(0, 8)}` : "愛屁543會員";
}

function compactReplyText(content: string) {
  return content.replace(/\s+/g, " ").trim();
}

function getTopLevelCategoryName(
  topicCategory: string,
  categoryId: string | null,
  categoryMap: Map<string, CategoryRow>,
): string {
  if (!categoryId) return topicCategory;

  const category = categoryMap.get(categoryId);
  if (!category) return topicCategory;
  if (!category.parent_id) return category.name;

  return categoryMap.get(category.parent_id)?.name || category.name;
}

function getCategoryGroup(
  topicCategory: string,
  categoryId: string | null,
  categoryMap: Map<string, CategoryRow>,
): "phone" | "camera" | "other" {
  const topLevelName = getTopLevelCategoryName(topicCategory, categoryId, categoryMap);
  if (topLevelName === "手機攝影") return "phone";
  if (topLevelName === "相機攝影") return "camera";
  return "other";
}

function ActivityColumnSkeleton({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center text-charcoal">
          {icon}
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">最新回應</p>
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/70 bg-secondary/30 p-3">
            <div className="flex items-start gap-2.5">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1 mt-4 text-sm text-primary">
        查看全部 <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}

function ActivityColumn({ icon, title, linkPrefix, items, isLoading }: ActivityColumnProps) {
  if (isLoading) {
    return <ActivityColumnSkeleton icon={icon} title={title} />;
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 md:hover-lift">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-gradient-gold flex items-center justify-center text-charcoal">
          {icon}
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">最新回應</p>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            尚無最新回應，
            <Link to={linkPrefix} className="text-primary hover:underline ml-1">前往討論區</Link>
          </div>
        ) : (
          items.map((reply) => (
            <article
              key={reply.id}
              className="rounded-2xl border border-border/70 bg-secondary/30 p-3 transition-colors hover:border-primary/20 hover:bg-primary/5"
            >
              <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-background">
                  {reply.avatar_url ? (
                    <img
                      src={reply.avatar_url}
                      alt={reply.author_name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                      {reply.author_name.slice(0, 1)}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-5 text-foreground/90">
                    <span className="font-semibold text-foreground">{reply.author_name}</span>
                    <span className="mx-1 text-muted-foreground">回覆了主題</span>
                    <Link
                      to={`/forums/topic/${reply.topic_id}`}
                      className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
                    >
                      {reply.topic_title}
                    </Link>
                  </p>

                  <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                    {compactReplyText(reply.content) || "沒有文字內容"}
                  </p>

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      最新回應
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: zhTW })}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <Link
        to={linkPrefix}
        className="flex items-center justify-center gap-1 mt-4 text-sm text-primary hover:underline"
      >
        查看全部 <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

export function EquipmentCategories({ sectionTitle, sectionSubtitle }: { sectionTitle?: string; sectionSubtitle?: string } = {}) {
  const cachedReplies = readBootstrapCache<ReplyFeedItem[]>("equipment-category-recent-replies");
  const initialReplies = cachedReplies && cachedReplies.length > 0 ? cachedReplies : undefined;

  const { data: replies = [], isLoading: loading } = useQuery({
    queryKey: ["equipment-category-recent-replies"],
    queryFn: async () => {
      const supabase = await getPublicSupabase();

      const [{ data: categories, error: categoryError }, { data: replyData, error: replyError }] = await Promise.all([
        supabase.from("forum_categories").select("id, name, color, parent_id"),
        supabase
          .from("forum_replies")
          .select(`
            id,
            content,
            created_at,
            topic_id,
            user_id,
            topic:forum_topics!forum_replies_topic_id_fkey (
              id,
              title,
              category,
              category_id,
              is_hidden
            )
          `)
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(24),
      ]);

      if (categoryError) throw categoryError;
      if (replyError) throw replyError;

      const categoryMap = new Map<string, CategoryRow>(((categories as CategoryRow[] | null) || []).map((category) => [category.id, category]));
      const visibleReplies = ((replyData as Array<{
        id: string;
        content: string;
        created_at: string;
        topic_id: string;
        user_id: string;
        topic: {
          id: string;
          title: string;
          category: string;
          category_id: string | null;
          is_hidden: boolean | null;
        } | null;
      }> | null) || []).filter((reply) => reply.topic && !reply.topic.is_hidden);

      if (visibleReplies.length === 0) return [];

      const userIds = [...new Set(visibleReplies.map((reply) => reply.user_id))];
      const { data: profiles, error: profileError } = userIds.length
        ? await supabase.rpc("get_public_profiles")
        : { data: [], error: null };

      if (profileError) throw profileError;

      const profileMap = new Map(
        (((profiles as PublicProfile[] | null) || []).filter((profile) => userIds.includes(profile.user_id))).map((profile) => [
          profile.user_id,
          profile,
        ]),
      );

      const result = visibleReplies
        .map((reply) => {
          const topic = reply.topic!;
          return {
            id: reply.id,
            content: reply.content,
            created_at: reply.created_at,
            topic_id: topic.id,
            user_id: reply.user_id,
            topic_title: topic.title,
            topic_category: topic.category,
            topic_category_id: topic.category_id,
            author_name: normalizeAuthorName(profileMap.get(reply.user_id), reply.user_id),
            avatar_url: profileMap.get(reply.user_id)?.avatar_url || null,
            group: getCategoryGroup(topic.category, topic.category_id, categoryMap),
          } satisfies ReplyFeedItem;
        })
        .filter((reply) => reply.group === "phone" || reply.group === "camera");

      writeBootstrapCache("equipment-category-recent-replies", result);
      return result;
    },
    initialData: initialReplies,
    staleTime: 5 * 60 * 1000,
  });

  const phoneReplies = replies.filter((reply) => reply.group === "phone").slice(0, 4);
  const cameraReplies = replies.filter((reply) => reply.group === "camera").slice(0, 4);

  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            {sectionTitle || "攝影討論區"}
          </h2>
          <p className="text-muted-foreground max-w-xl">
            {sectionSubtitle || "瀏覽最新討論，與同好交流心得"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <ActivityColumn
            icon={<Smartphone className="h-6 w-6" />}
            title="手機攝影"
            linkPrefix="/forums?category=phone"
            items={phoneReplies}
            isLoading={loading}
          />
          <ActivityColumn
            icon={<Camera className="h-6 w-6" />}
            title="相機攝影"
            linkPrefix="/forums?category=camera"
            items={cameraReplies}
            isLoading={loading}
          />
        </div>
      </div>
    </section>
  );
}
