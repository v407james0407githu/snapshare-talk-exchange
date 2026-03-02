import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Smartphone, Camera, ChevronRight, MessageSquare, Eye, Clock, Loader2, Pin, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

interface TopicRow {
  id: string;
  title: string;
  user_id: string;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  last_reply_at: string | null;
  author_name?: string;
}

interface CategoryColumnProps {
  icon: React.ReactNode;
  title: string;
  parentSlug: string;
  linkPrefix: string;
}

function CategoryColumn({ icon, title, parentSlug, linkPrefix }: CategoryColumnProps) {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopics() {
      // Find the parent category
      const { data: parentCat } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("slug", parentSlug)
        .eq("is_active", true)
        .limit(1);

      if (!parentCat || parentCat.length === 0) {
        setLoading(false);
        return;
      }

      const parentId = parentCat[0].id;

      // Get child category IDs
      const { data: children } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("parent_id", parentId)
        .eq("is_active", true);

      const categoryIds = [parentId, ...(children?.map((c) => c.id) || [])];

      const { data: topicsData } = await supabase
        .from("forum_topics")
        .select("id, title, user_id, reply_count, view_count, is_pinned, created_at, last_reply_at")
        .eq("is_hidden", false)
        .in("category_id", categoryIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (!topicsData || topicsData.length === 0) {
        setTopics([]);
        setLoading(false);
        return;
      }

      // Fetch author names
      const userIds = [...new Set(topicsData.map((t) => t.user_id))];
      const profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", userIds);
        profiles?.forEach((p) => {
          profileMap.set(p.user_id, p.display_name || p.username);
        });
      }

      setTopics(
        topicsData.map((t) => ({
          ...t,
          reply_count: t.reply_count ?? 0,
          view_count: t.view_count ?? 0,
          is_pinned: t.is_pinned ?? false,
          author_name: profileMap.get(t.user_id) || "匿名",
        }))
      );
      setLoading(false);
    }

    fetchTopics();
  }, [parentSlug]);

  return (
    <div className="bg-card rounded-2xl border border-border p-6 hover-lift">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center text-charcoal">
          {icon}
        </div>
        <div>
          <h3 className="font-serif text-xl font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">最新討論串</p>
        </div>
      </div>

      <div className="space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : topics.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            尚無討論串，
            <Link to={linkPrefix} className="text-primary hover:underline ml-1">前往發起</Link>
          </div>
        ) : (
          topics.map((topic) => {
            const isHot = topic.reply_count >= 10;
            const lastActive = topic.last_reply_at || topic.created_at;

            return (
              <Link
                key={topic.id}
                to={`/forums/topic/${topic.id}`}
                className="group flex items-center justify-between p-3 rounded-xl bg-secondary/50 hover:bg-primary/10 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {topic.is_pinned && <Pin className="h-3 w-3 text-primary flex-shrink-0" />}
                    {isHot && <TrendingUp className="h-3 w-3 text-destructive flex-shrink-0" />}
                    <span className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {topic.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{topic.author_name}</span>
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="h-3 w-3" />{topic.reply_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Eye className="h-3 w-3" />{topic.view_count}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  <span className="hidden sm:inline">
                    {formatDistanceToNow(new Date(lastActive), { addSuffix: true, locale: zhTW })}
                  </span>
                </div>
              </Link>
            );
          })
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

export function EquipmentCategories() {
  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            攝影<span className="text-gradient">討論區</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            瀏覽最新討論，與同好交流心得
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <CategoryColumn
            icon={<Smartphone className="h-6 w-6" />}
            title="手機攝影"
            parentSlug="mobile"
            linkPrefix="/forums?category=phone"
          />
          <CategoryColumn
            icon={<Camera className="h-6 w-6" />}
            title="相機攝影"
            parentSlug="camera"
            linkPrefix="/forums?category=camera"
          />
        </div>
      </div>
    </section>
  );
}
