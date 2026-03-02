import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  ArrowRight, 
  Clock, 
  Eye, 
  TrendingUp,
  Pin,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

interface TopicRow {
  id: string;
  title: string;
  category: string;
  category_id: string | null;
  user_id: string;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  last_reply_at: string | null;
  author_name?: string;
  category_name?: string;
  category_color?: string;
}

const fallbackCategoryColors: Record<string, string> = {
  phone: "bg-green-500/10 text-green-600",
  camera: "bg-blue-500/10 text-blue-600",
};

export function ForumPreview() {
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHotTopics() {
      const { data, error } = await supabase
        .from("forum_topics")
        .select("id, title, category, category_id, user_id, reply_count, view_count, is_pinned, created_at, last_reply_at")
        .eq("is_hidden", false)
        .order("reply_count", { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch category info
      const categoryIds = [...new Set(data.map((t) => t.category_id).filter(Boolean))] as string[];
      const categoryMap = new Map<string, { name: string; color: string }>();
      if (categoryIds.length > 0) {
        const { data: cats } = await supabase
          .from("forum_categories")
          .select("id, name, color")
          .in("id", categoryIds);
        cats?.forEach((c) => categoryMap.set(c.id, { name: c.name, color: c.color || "blue" }));
      }

      // Fetch author names
      const userIds = [...new Set(data.map((t) => t.user_id))];
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
        data.map((t) => {
          const catInfo = t.category_id ? categoryMap.get(t.category_id) : null;
          return {
            ...t,
            reply_count: t.reply_count ?? 0,
            view_count: t.view_count ?? 0,
            is_pinned: t.is_pinned ?? false,
            author_name: profileMap.get(t.user_id) || "匿名",
            category_name: catInfo?.name || (t.category === "phone" ? "手機" : "相機"),
            category_color: catInfo?.color || (t.category === "phone" ? "green" : "blue"),
          };
        })
      );
      setLoading(false);
    }

    fetchHotTopics();
  }, []);

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-green-500/10 text-green-600",
    purple: "bg-purple-500/10 text-purple-600",
    orange: "bg-orange-500/10 text-orange-600",
    red: "bg-red-500/10 text-red-600",
  };

  if (!loading && topics.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              熱門<span className="text-gradient">討論</span>
            </h2>
            <p className="text-muted-foreground">
              社群最新話題與交流
            </p>
          </div>
          <Link to="/forums">
            <Button variant="outline" className="hidden sm:flex gap-2">
              進入討論區
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
            <div className="col-span-7">主題</div>
            <div className="col-span-2 text-center">回覆 / 瀏覽</div>
            <div className="col-span-3 text-right">最後活動</div>
          </div>

          {/* Topics */}
          <div className="divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              topics.map((topic) => {
                const isHot = topic.reply_count >= 10;
                const lastActive = topic.last_reply_at || topic.created_at;

                return (
                  <Link
                    key={topic.id}
                    to={`/forums/topic/${topic.id}`}
                    className="block px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                      <div className="col-span-7">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              {topic.is_pinned && (
                                <Pin className="h-3.5 w-3.5 text-primary" />
                              )}
                              {isHot && (
                                <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                              )}
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorClasses[topic.category_color || "blue"] || colorClasses.blue}`}>
                                {topic.category_name}
                              </span>
                            </div>
                            <h3 className="font-medium text-foreground line-clamp-1">
                              {topic.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {topic.author_name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 hidden md:flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4" />
                          {topic.reply_count}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="h-4 w-4" />
                          {topic.view_count}
                        </span>
                      </div>

                      <div className="col-span-3 hidden md:flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(lastActive), { addSuffix: true, locale: zhTW })}
                      </div>

                      <div className="flex items-center gap-4 mt-2 md:hidden text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {topic.reply_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDistanceToNow(new Date(lastActive), { addSuffix: true, locale: zhTW })}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/forums">
            <Button variant="outline" className="gap-2">
              進入討論區
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
