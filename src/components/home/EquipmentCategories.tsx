import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  MessageSquare,
  Eye,
  Clock,
  TrendingUp,
  Pin,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string | null;
}

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
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  green: "bg-green-500/10 text-green-600 border-green-500/20",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  orange: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  red: "bg-red-500/10 text-red-600 border-red-500/20",
};

const iconComponents: Record<string, string> = {
  Smartphone: "📱",
  Camera: "📷",
  Wrench: "🔧",
  Coffee: "☕",
};

function resolveIcon(icon: string | null): string {
  if (!icon) return "💬";
  return iconComponents[icon] || icon;
}

export function EquipmentCategories() {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch top-level categories
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from("forum_categories")
        .select("id, name, slug, icon, color, description")
        .is("parent_id", null)
        .eq("is_active", true)
        .order("sort_order");

      if (data && data.length > 0) {
        setCategories(data as ForumCategory[]);
        setActiveCategory(data[0].slug);
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  // Fetch latest topics when category changes
  useEffect(() => {
    if (!activeCategory) return;

    async function fetchTopics() {
      // Find category and its children
      const cat = categories.find((c) => c.slug === activeCategory);
      if (!cat) return;

      // Get child category IDs
      const { data: children } = await supabase
        .from("forum_categories")
        .select("id")
        .eq("parent_id", cat.id)
        .eq("is_active", true);

      const categoryIds = [cat.id, ...(children?.map((c) => c.id) || [])];

      const { data: topicsData } = await supabase
        .from("forum_topics")
        .select("id, title, category, category_id, user_id, reply_count, view_count, is_pinned, created_at, last_reply_at")
        .eq("is_hidden", false)
        .in("category_id", categoryIds)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (!topicsData || topicsData.length === 0) {
        setTopics([]);
        return;
      }

      // Fetch author names
      const userIds = [...new Set(topicsData.map((t) => t.user_id))];
      const profileMap = new Map<string, string>();
      for (const uid of userIds) {
        const { data: profileData } = await supabase.rpc("get_public_profile", { target_user_id: uid });
        if (profileData && profileData.length > 0) {
          profileMap.set(uid, profileData[0].display_name || profileData[0].username);
        }
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
    }

    fetchTopics();
  }, [activeCategory, categories]);

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="container flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              攝影<span className="text-gradient">討論區</span>
            </h2>
            <p className="text-muted-foreground">
              依主題分類瀏覽最新討論，與同好交流心得
            </p>
          </div>
          <Link to="/forums">
            <Button variant="outline" className="hidden sm:flex gap-2">
              進入討論區
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                activeCategory === cat.slug
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              <span>{resolveIcon(cat.icon)}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Category Description */}
        {(() => {
          const activeCat = categories.find((c) => c.slug === activeCategory);
          return activeCat?.description ? (
            <p className="text-sm text-muted-foreground mb-6 pl-1">{activeCat.description}</p>
          ) : null;
        })()}

        {/* Topics List */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
            <div className="col-span-7">主題</div>
            <div className="col-span-2 text-center">回覆 / 瀏覽</div>
            <div className="col-span-3 text-right">最後活動</div>
          </div>

          <div className="divide-y divide-border">
            {topics.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                此分類尚無討論串，
                <Link to="/forums" className="text-primary hover:underline ml-1">
                  前往發起討論
                </Link>
              </div>
            ) : (
              topics.map((topic) => {
                const isHot = (topic.reply_count ?? 0) >= 10;
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
                        {formatDistanceToNow(new Date(lastActive), {
                          addSuffix: true,
                          locale: zhTW,
                        })}
                      </div>

                      <div className="flex items-center gap-4 mt-2 md:hidden text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {topic.reply_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatDistanceToNow(new Date(lastActive), {
                            addSuffix: true,
                            locale: zhTW,
                          })}
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
