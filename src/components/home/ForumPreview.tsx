import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Camera,
  Clock,
  MessageSquare,
  Smartphone,
} from "lucide-react";
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

interface ReplyRow {
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

interface SectionColumn {
  key: "phone" | "camera";
  title: string;
  subtitle: string;
  icon: typeof Smartphone;
  iconClassName: string;
  items: ReplyRow[];
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

function buildColumns(replies: ReplyRow[]): SectionColumn[] {
  return [
    {
      key: "phone",
      title: "手機攝影",
      subtitle: "最新回應",
      icon: Smartphone,
      iconClassName: "bg-green-500/10 text-green-600",
      items: replies.filter((reply) => reply.group === "phone").slice(0, 6),
    },
    {
      key: "camera",
      title: "相機攝影",
      subtitle: "最新回應",
      icon: Camera,
      iconClassName: "bg-blue-500/10 text-blue-600",
      items: replies.filter((reply) => reply.group === "camera").slice(0, 6),
    },
  ];
}

function ReplyCard({ reply }: { reply: ReplyRow }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-muted/30 p-4 transition-colors hover:border-primary/30 hover:bg-muted/50">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-background">
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
          <p className="text-sm leading-6 text-foreground/90">
            <span className="font-semibold text-foreground">{reply.author_name}</span>
            <span className="mx-1.5 text-muted-foreground">回覆了主題</span>
            <Link
              to={`/forums/topic/${reply.topic_id}`}
              className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
            >
              {reply.topic_title}
            </Link>
          </p>

          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {compactReplyText(reply.content) || "沒有文字內容"}
          </p>

          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
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
  );
}

function ReplyColumnSkeleton() {
  return (
    <div className="rounded-[28px] border border-border bg-card p-6">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-muted animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-24 rounded bg-muted animate-pulse" />
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-full bg-muted animate-pulse" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
                <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ForumPreview({
  sectionTitle,
  sectionSubtitle,
}: { sectionTitle?: string; sectionSubtitle?: string } = {}) {
  const cachedReplies = readBootstrapCache<ReplyRow[]>("homepage-forum-activity-preview");
  const initialReplies = cachedReplies && cachedReplies.length > 0 ? cachedReplies : undefined;

  const { data: replies = [], isLoading: loading, isFetched } = useQuery({
    queryKey: ["homepage-forum-activity-preview"],
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
          const group = getCategoryGroup(topic.category, topic.category_id, categoryMap);

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
            group,
          } satisfies ReplyRow;
        })
        .filter((reply) => reply.group === "phone" || reply.group === "camera");

      writeBootstrapCache("homepage-forum-activity-preview", result);
      return result;
    },
    initialData: initialReplies,
    staleTime: 5 * 60 * 1000,
  });

  const columns = buildColumns(replies);
  if (isFetched && !loading && columns.every((column) => column.items.length === 0)) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
            {sectionTitle || "攝影討論區"}
          </h2>
          <p className="text-muted-foreground">
            {sectionSubtitle || "瀏覽最新討論，與同好交流心得"}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-8 lg:grid-cols-2">
            <ReplyColumnSkeleton />
            <ReplyColumnSkeleton />
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {columns.map((column) => {
              const Icon = column.icon;

              return (
                <div key={column.key} className="rounded-[28px] border border-border bg-card p-6 shadow-sm">
                  <div className="mb-6 flex items-center gap-4">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${column.iconClassName}`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-semibold tracking-tight text-foreground">{column.title}</h3>
                      <p className="text-sm text-muted-foreground">{column.subtitle}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {column.items.length > 0 ? (
                      column.items.map((reply) => <ReplyCard key={reply.id} reply={reply} />)
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                        目前還沒有最新回應
                      </div>
                    )}
                  </div>

                  <div className="mt-6 text-center">
                    <Link to="/forums">
                      <Button variant="ghost" className="gap-2 text-primary hover:text-primary">
                        查看全部
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
