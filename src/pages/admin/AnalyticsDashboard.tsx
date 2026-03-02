import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Image,
  MessageSquare,
  Eye,
  Star,
  Heart,
  TrendingUp,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format, subDays } from "date-fns";
import { zhTW } from "date-fns/locale";

interface Stats {
  totalUsers: number;
  totalPhotos: number;
  totalTopics: number;
  totalReplies: number;
  totalListings: number;
  totalReports: number;
  pendingReports: number;
}

interface TopPhoto {
  id: string;
  title: string;
  view_count: number;
  like_count: number;
  average_rating: number;
  author_name: string;
}

interface ActiveUser {
  user_id: string;
  username: string;
  display_name: string;
  photo_count: number;
}

interface TrendPoint {
  date: string;
  count: number;
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [topPhotos, setTopPhotos] = useState<TopPhoto[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [photoTrend, setPhotoTrend] = useState<TrendPoint[]>([]);
  const [topicTrend, setTopicTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      // Stats
      const [usersR, photosR, topicsR, repliesR, listingsR, reportsR, pendingR] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("photos").select("id", { count: "exact", head: true }),
          supabase.from("forum_topics").select("id", { count: "exact", head: true }),
          supabase.from("forum_replies").select("id", { count: "exact", head: true }),
          supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
          supabase.from("reports").select("id", { count: "exact", head: true }),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

      setStats({
        totalUsers: usersR.count || 0,
        totalPhotos: photosR.count || 0,
        totalTopics: topicsR.count || 0,
        totalReplies: repliesR.count || 0,
        totalListings: listingsR.count || 0,
        totalReports: reportsR.count || 0,
        pendingReports: pendingR.count || 0,
      });

      // Top photos by views
      const { data: photos } = await supabase
        .from("photos")
        .select("id, title, view_count, like_count, average_rating, user_id")
        .eq("is_hidden", false)
        .order("view_count", { ascending: false })
        .limit(10);

      if (photos) {
        const userIds = [...new Set(photos.map((p) => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", userIds);
        const pMap = new Map(profiles?.map((p) => [p.user_id, p.display_name || p.username]) || []);
        setTopPhotos(
          photos.map((p) => ({
            ...p,
            view_count: p.view_count || 0,
            like_count: p.like_count || 0,
            average_rating: p.average_rating || 0,
            author_name: pMap.get(p.user_id) || "未知",
          }))
        );
      }

      // Active users (by photo count)
      const { data: allPhotos } = await supabase
        .from("photos")
        .select("user_id")
        .eq("is_hidden", false);

      if (allPhotos) {
        const countMap = new Map<string, number>();
        allPhotos.forEach((p) => countMap.set(p.user_id, (countMap.get(p.user_id) || 0) + 1));
        const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
        const uids = sorted.map(([uid]) => uid);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", uids);
        const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        setActiveUsers(
          sorted.map(([uid, count]) => ({
            user_id: uid,
            username: pMap.get(uid)?.username || "未知",
            display_name: pMap.get(uid)?.display_name || "未知",
            photo_count: count,
          }))
        );
      }

      // Trends: last 14 days
      const days = 14;
      const startDate = subDays(new Date(), days).toISOString();

      const { data: recentPhotos } = await supabase
        .from("photos")
        .select("created_at")
        .gte("created_at", startDate);

      const { data: recentTopics } = await supabase
        .from("forum_topics")
        .select("created_at")
        .gte("created_at", startDate);

      const buildTrend = (items: { created_at: string }[] | null): TrendPoint[] => {
        const map = new Map<string, number>();
        for (let i = 0; i < days; i++) {
          const d = format(subDays(new Date(), days - 1 - i), "MM/dd");
          map.set(d, 0);
        }
        items?.forEach((item) => {
          const d = format(new Date(item.created_at), "MM/dd");
          if (map.has(d)) map.set(d, map.get(d)! + 1);
        });
        return [...map.entries()].map(([date, count]) => ({ date, count }));
      };

      setPhotoTrend(buildTrend(recentPhotos));
      setTopicTrend(buildTrend(recentTopics));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout title="數據分析" subtitle="全站數據統計與趨勢分析">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: "總會員", value: stats?.totalUsers || 0, icon: <Users className="h-5 w-5" /> },
    { label: "總作品", value: stats?.totalPhotos || 0, icon: <Image className="h-5 w-5" /> },
    { label: "討論主題", value: stats?.totalTopics || 0, icon: <MessageSquare className="h-5 w-5" /> },
    { label: "討論回覆", value: stats?.totalReplies || 0, icon: <MessageSquare className="h-5 w-5" /> },
    { label: "二手商品", value: stats?.totalListings || 0, icon: <ShoppingBag className="h-5 w-5" /> },
    { label: "待處理檢舉", value: stats?.pendingReports || 0, icon: <TrendingUp className="h-5 w-5" /> },
  ];

  return (
    <AdminLayout title="數據分析" subtitle="全站數據統計與趨勢分析">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                {s.icon}
              </div>
              <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Charts */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">每日新增作品（近 14 天）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={photoTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="作品數" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">每日新增討論（近 14 天）</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="討論數" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rankings */}
      <Tabs defaultValue="photos">
        <TabsList>
          <TabsTrigger value="photos">熱門作品 TOP 10</TabsTrigger>
          <TabsTrigger value="users">活躍用戶 TOP 10</TabsTrigger>
        </TabsList>

        <TabsContent value="photos">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {topPhotos.map((photo, i) => (
                  <div key={photo.id} className="flex items-center gap-4 p-4">
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{photo.title}</p>
                      <p className="text-xs text-muted-foreground">{photo.author_name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{photo.view_count}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{photo.like_count}</span>
                      {photo.average_rating > 0 && (
                        <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{Number(photo.average_rating).toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {topPhotos.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">暫無資料</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {activeUsers.map((user, i) => (
                  <div key={user.user_id} className="flex items-center gap-4 p-4">
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="secondary">{user.photo_count} 件作品</Badge>
                  </div>
                ))}
                {activeUsers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">暫無資料</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
