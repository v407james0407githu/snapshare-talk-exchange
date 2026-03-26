import { useEffect, useState } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Image, MessageSquare, Eye, Star, Heart, TrendingUp, ShoppingBag,
  Loader2, Globe, FileText, Link2, Monitor, MapPin, HardDrive, Download, Activity,
  Pencil, Check, X, UserPlus, ImagePlus, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { format, subDays, differenceInDays, startOfDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ── Types ──
interface Stats {
  totalUsers: number; totalPhotos: number; totalTopics: number;
  totalReplies: number; totalListings: number; pendingReports: number;
  todayNewUsers: number; todayNewPhotos: number;
  weekNewUsers: number; weekNewPhotos: number;
}
interface TopPhoto { id: string; title: string; view_count: number; like_count: number; average_rating: number; author_name: string; }
interface ActiveUser { user_id: string; username: string; display_name: string; photo_count: number; }
interface TrendPoint { date: string; count: number; }
interface RankItem { name: string; count: number; }
interface BandwidthData {
  totalEstimatedMB: number; photoViewsMB: number; pageViewsMB: number;
  dailyTrend: { date: string; mb: number }[];
  totalPhotoViews: number; totalStoragePhotos: number;
}

const AVG_PAGE_WEIGHT_KB = 350;
const AVG_PHOTO_WEIGHT_KB = 1800;
const DEFAULT_BANDWIDTH_GB = 2;
const DEFAULT_STORAGE_GB = 8;

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--accent-foreground))",
  "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6",
];

const RANGE_OPTIONS = [
  { value: "7", label: "近 7 天" },
  { value: "14", label: "近 14 天" },
  { value: "30", label: "近 30 天" },
  { value: "custom", label: "自訂範圍" },
];

export default function AnalyticsDashboard() {
  const { getNum } = useSystemSettings();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const PLAN_BANDWIDTH_GB = getNum("plan_bandwidth_gb", DEFAULT_BANDWIDTH_GB);
  const PLAN_STORAGE_GB = getNum("plan_storage_gb", DEFAULT_STORAGE_GB);

  const [editingBw, setEditingBw] = useState(false);
  const [editingStorage, setEditingStorage] = useState(false);
  const [editBwValue, setEditBwValue] = useState("");
  const [editStorageValue, setEditStorageValue] = useState("");
  const [savingQuota, setSavingQuota] = useState(false);

  const saveQuotaSetting = async (key: string, value: string) => {
    setSavingQuota(true);
    try {
      const { error } = await supabase.from("system_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString(), updated_by: user?.id })
        .eq("setting_key", key);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["system-settings-public"] });
      toast.success("已更新");
    } catch { toast.error("更新失敗"); }
    finally { setSavingQuota(false); }
  };

  const [stats, setStats] = useState<Stats | null>(null);
  const [topPhotos, setTopPhotos] = useState<TopPhoto[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [photoTrend, setPhotoTrend] = useState<TrendPoint[]>([]);
  const [topicTrend, setTopicTrend] = useState<TrendPoint[]>([]);
  const [userTrend, setUserTrend] = useState<TrendPoint[]>([]);
  const [pvTrend, setPvTrend] = useState<TrendPoint[]>([]);
  const [uvTrend, setUvTrend] = useState<TrendPoint[]>([]);
  const [topPages, setTopPages] = useState<RankItem[]>([]);
  const [topReferrers, setTopReferrers] = useState<RankItem[]>([]);
  const [topCountries, setTopCountries] = useState<RankItem[]>([]);
  const [topLanguages, setTopLanguages] = useState<RankItem[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<RankItem[]>([]);
  const [totalPV, setTotalPV] = useState(0);
  const [totalUV, setTotalUV] = useState(0);
  const [todayPV, setTodayPV] = useState(0);
  const [todayUV, setTodayUV] = useState(0);
  const [bandwidth, setBandwidth] = useState<BandwidthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(14);
  const [rangeMode, setRangeMode] = useState<string>("14");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(subDays(new Date(), 14));
  const [customTo, setCustomTo] = useState<Date | undefined>(new Date());

  useEffect(() => { fetchAll(); }, [rangeDays, customFrom, customTo]);

  async function fetchAll() {
    setLoading(true);
    try {
      await Promise.all([fetchStats(), fetchTopPhotos(), fetchActiveUsers(), fetchTrends(), fetchTrafficData(), fetchBandwidth()]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function getDateRange(): { startDate: string; days: number } {
    if (rangeMode === "custom" && customFrom && customTo) {
      const days = Math.max(1, differenceInDays(customTo, customFrom) + 1);
      return { startDate: startOfDay(customFrom).toISOString(), days };
    }
    return { startDate: subDays(new Date(), rangeDays).toISOString(), days: rangeDays };
  }

  async function fetchStats() {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart = subDays(new Date(), 7).toISOString();
    const todayISO = todayStart.toISOString();
    
    const [usersR, photosR, topicsR, repliesR, listingsR, pendingR, todayUsersR, todayPhotosR, weekUsersR, weekPhotosR] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("photos").select("id", { count: "exact", head: true }),
      supabase.from("forum_topics").select("id", { count: "exact", head: true }),
      supabase.from("forum_replies").select("id", { count: "exact", head: true }),
      supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("photos").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      supabase.from("photos").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    ]);
    setStats({
      totalUsers: usersR.count || 0, totalPhotos: photosR.count || 0,
      totalTopics: topicsR.count || 0, totalReplies: repliesR.count || 0,
      totalListings: listingsR.count || 0, pendingReports: pendingR.count || 0,
      todayNewUsers: todayUsersR.count || 0, todayNewPhotos: todayPhotosR.count || 0,
      weekNewUsers: weekUsersR.count || 0, weekNewPhotos: weekPhotosR.count || 0,
    });
  }

  async function fetchTopPhotos() {
    const { data: photos } = await supabase.from("photos")
      .select("id, title, view_count, like_count, average_rating, user_id")
      .eq("is_hidden", false).order("view_count", { ascending: false }).limit(10);
    if (!photos) return;
    const userIds = [...new Set(photos.map((p) => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", userIds);
    const pMap = new Map(profiles?.map((p) => [p.user_id, p.display_name || p.username]) || []);
    setTopPhotos(photos.map((p) => ({ ...p, view_count: p.view_count || 0, like_count: p.like_count || 0, average_rating: p.average_rating || 0, author_name: pMap.get(p.user_id) || "未知" })));
  }

  async function fetchActiveUsers() {
    const { data: allPhotos } = await supabase.from("photos").select("user_id").eq("is_hidden", false);
    if (!allPhotos) return;
    const countMap = new Map<string, number>();
    allPhotos.forEach((p) => countMap.set(p.user_id, (countMap.get(p.user_id) || 0) + 1));
    const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const uids = sorted.map(([uid]) => uid);
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", uids);
    const pMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
    setActiveUsers(sorted.map(([uid, count]) => ({ user_id: uid, username: pMap.get(uid)?.username || "未知", display_name: pMap.get(uid)?.display_name || "未知", photo_count: count })));
  }

  async function fetchTrends() {
    const { startDate, days } = getDateRange();
    const [{ data: recentPhotos }, { data: recentTopics }, { data: recentUsers }] = await Promise.all([
      supabase.from("photos").select("created_at").gte("created_at", startDate),
      supabase.from("forum_topics").select("created_at").gte("created_at", startDate),
      supabase.from("profiles").select("created_at").gte("created_at", startDate),
    ]);
    const buildTrend = (items: { created_at: string }[] | null): TrendPoint[] => {
      const map = new Map<string, number>();
      for (let i = 0; i < days; i++) { const d = format(subDays(new Date(), days - 1 - i), "MM/dd"); map.set(d, 0); }
      items?.forEach((item) => { const d = format(new Date(item.created_at), "MM/dd"); if (map.has(d)) map.set(d, map.get(d)! + 1); });
      return [...map.entries()].map(([date, count]) => ({ date, count }));
    };
    setPhotoTrend(buildTrend(recentPhotos));
    setTopicTrend(buildTrend(recentTopics));
    setUserTrend(buildTrend(recentUsers));
  }

  async function fetchTrafficData() {
    const { startDate, days } = getDateRange();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data: views } = await (supabase.from("page_views") as any)
      .select("session_id, page_path, referrer_domain, language, screen_width, country, city, created_at")
      .gte("created_at", startDate).order("created_at", { ascending: false }).limit(1000);

    if (!views || views.length === 0) {
      setPvTrend([]); setUvTrend([]); setTopPages([]); setTopReferrers([]);
      setTopCountries([]); setTopLanguages([]); setDeviceBreakdown([]);
      setTotalPV(0); setTotalUV(0); setTodayPV(0); setTodayUV(0);
      return;
    }

    setTotalPV(views.length);
    setTotalUV(new Set(views.map((v: any) => v.session_id)).size);
    const todayViews = views.filter((v: any) => new Date(v.created_at) >= todayStart);
    setTodayPV(todayViews.length);
    setTodayUV(new Set(todayViews.map((v: any) => v.session_id)).size);

    const pvMap = new Map<string, number>();
    const uvMap = new Map<string, Set<string>>();
    for (let i = 0; i < days; i++) { const d = format(subDays(new Date(), days - 1 - i), "MM/dd"); pvMap.set(d, 0); uvMap.set(d, new Set()); }
    views.forEach((v: any) => { const d = format(new Date(v.created_at), "MM/dd"); if (pvMap.has(d)) pvMap.set(d, pvMap.get(d)! + 1); if (uvMap.has(d)) uvMap.get(d)!.add(v.session_id); });
    setPvTrend([...pvMap.entries()].map(([date, count]) => ({ date, count })));
    setUvTrend([...uvMap.entries()].map(([date, sessions]) => ({ date, count: sessions.size })));

    const pageCount = new Map<string, number>();
    views.forEach((v: any) => pageCount.set(v.page_path, (pageCount.get(v.page_path) || 0) + 1));
    setTopPages([...pageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name: formatPageName(name), count })));

    const refCount = new Map<string, number>();
    views.forEach((v: any) => { const domain = v.referrer_domain || "直接訪問"; refCount.set(domain, (refCount.get(domain) || 0) + 1); });
    setTopReferrers([...refCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })));

    const countryCount = new Map<string, number>();
    views.forEach((v: any) => { const c = v.country || "未知"; countryCount.set(c, (countryCount.get(c) || 0) + 1); });
    setTopCountries([...countryCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })));

    const langCount = new Map<string, number>();
    views.forEach((v: any) => { const lang = v.language?.split("-")[0] || "未知"; langCount.set(lang, (langCount.get(lang) || 0) + 1); });
    setTopLanguages([...langCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name: formatLang(name), count })));

    let mobile = 0, tablet = 0, desktop = 0;
    views.forEach((v: any) => { const w = v.screen_width || 0; if (w < 768) mobile++; else if (w < 1024) tablet++; else desktop++; });
    setDeviceBreakdown([{ name: "手機", count: mobile }, { name: "平板", count: tablet }, { name: "桌面", count: desktop }].filter(d => d.count > 0));
  }

  async function fetchBandwidth() {
    const { startDate, days } = getDateRange();
    const { data: views } = await (supabase.from("page_views") as any)
      .select("page_path, created_at").gte("created_at", startDate)
      .order("created_at", { ascending: false }).limit(1000);

    if (!views || views.length === 0) { setBandwidth(null); return; }

    let photoDetailViews = 0, regularViews = 0;
    views.forEach((v: any) => {
      if (v.page_path?.startsWith("/gallery/") && v.page_path !== "/gallery") photoDetailViews++;
      else regularViews++;
    });

    const { count: totalPhotos } = await supabase.from("photos").select("id", { count: "exact", head: true });
    const photoViewsMB = (photoDetailViews * AVG_PHOTO_WEIGHT_KB) / 1024;
    const pageViewsMB = (regularViews * AVG_PAGE_WEIGHT_KB) / 1024;

    const dailyMap = new Map<string, { photoViews: number; pageViews: number }>();
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), "MM/dd");
      dailyMap.set(d, { photoViews: 0, pageViews: 0 });
    }
    views.forEach((v: any) => {
      const d = format(new Date(v.created_at), "MM/dd");
      const entry = dailyMap.get(d);
      if (entry) {
        if (v.page_path?.startsWith("/gallery/") && v.page_path !== "/gallery") entry.photoViews++;
        else entry.pageViews++;
      }
    });

    setBandwidth({
      totalEstimatedMB: photoViewsMB + pageViewsMB, photoViewsMB, pageViewsMB,
      dailyTrend: [...dailyMap.entries()].map(([date, data]) => ({
        date, mb: Number(((data.photoViews * AVG_PHOTO_WEIGHT_KB + data.pageViews * AVG_PAGE_WEIGHT_KB) / 1024).toFixed(1)),
      })),
      totalPhotoViews: photoDetailViews,
      totalStoragePhotos: totalPhotos || 0,
    });
  }

  useAdminPage("數據分析", "全站數據統計與趨勢分析");

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
    );
  }

  const rangeLabel = rangeMode === "custom" && customFrom && customTo
    ? `${format(customFrom, "MM/dd")} ~ ${format(customTo, "MM/dd")}`
    : RANGE_OPTIONS.find(r => r.value === String(rangeDays))?.label || `近 ${rangeDays} 天`;

  return (
    <>
      {/* Today Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <HighlightCard icon={<UserPlus className="h-5 w-5" />} label="今日新會員" value={stats?.todayNewUsers || 0} sub={`本週 +${stats?.weekNewUsers || 0}`} color="text-primary bg-primary/10" />
        <HighlightCard icon={<ImagePlus className="h-5 w-5" />} label="今日新作品" value={stats?.todayNewPhotos || 0} sub={`本週 +${stats?.weekNewPhotos || 0}`} color="text-emerald-600 bg-emerald-500/10" />
        <HighlightCard icon={<Eye className="h-5 w-5" />} label="今日瀏覽" value={todayPV} sub={`${todayUV} 獨立訪客`} color="text-amber-600 bg-amber-500/10" />
        <HighlightCard icon={<TrendingUp className="h-5 w-5" />} label="待處理檢舉" value={stats?.pendingReports || 0} sub="需儘快處理" color={stats?.pendingReports ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted"} />
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: "總會員", value: stats?.totalUsers || 0, icon: <Users className="h-4 w-4" /> },
          { label: "總作品", value: stats?.totalPhotos || 0, icon: <Image className="h-4 w-4" /> },
          { label: "討論主題", value: stats?.totalTopics || 0, icon: <MessageSquare className="h-4 w-4" /> },
          { label: "討論回覆", value: stats?.totalReplies || 0, icon: <MessageSquare className="h-4 w-4" /> },
          { label: "二手商品", value: stats?.totalListings || 0, icon: <ShoppingBag className="h-4 w-4" /> },
          { label: "總瀏覽量", value: totalPV, icon: <Eye className="h-4 w-4" /> },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-xl p-3 text-center">
            <div className="mx-auto w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mb-1.5">{s.icon}</div>
            <div className="text-lg font-bold">{s.value.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-lg font-semibold">詳細分析</h3>
        <DateRangeSelector
          rangeMode={rangeMode}
          setRangeMode={setRangeMode}
          setRangeDays={setRangeDays}
          customFrom={customFrom}
          customTo={customTo}
          setCustomFrom={setCustomFrom}
          setCustomTo={setCustomTo}
        />
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="traffic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="traffic" className="gap-1.5"><Eye className="h-3.5 w-3.5" />流量分析</TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5"><Image className="h-3.5 w-3.5" />內容分析</TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5"><HardDrive className="h-3.5 w-3.5" />資源監控</TabsTrigger>
        </TabsList>

        {/* ─── Traffic Tab ─── */}
        <TabsContent value="traffic" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label={`${rangeLabel}瀏覽`} value={totalPV} icon={<Eye className="h-5 w-5" />} />
            <StatCard label={`${rangeLabel}訪客`} value={totalUV} icon={<Users className="h-5 w-5" />} />
            <StatCard label="今日瀏覽" value={todayPV} icon={<FileText className="h-5 w-5" />} />
            <StatCard label="今日訪客" value={todayUV} icon={<Globe className="h-5 w-5" />} />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <TrendChart title={`瀏覽量趨勢（${rangeLabel}）`} icon={<Eye className="h-4 w-4" />} data={pvTrend} color="hsl(var(--primary))" name="PV" />
            <TrendChart title={`獨立訪客趨勢（${rangeLabel}）`} icon={<Users className="h-4 w-4" />} data={uvTrend} color="#10b981" name="UV" />
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-6">
            <RankCard title="熱門頁面" icon={<FileText className="h-4 w-4" />} items={topPages} />
            <RankCard title="流量來源" icon={<Link2 className="h-4 w-4" />} items={topReferrers} />
            <RankCard title="訪客國家/地區" icon={<MapPin className="h-4 w-4" />} items={topCountries} />
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4" /> 裝置分佈</CardTitle></CardHeader>
              <CardContent>
                {deviceBreakdown.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={deviceBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {deviceBreakdown.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 mt-2">
                      {deviceBreakdown.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          {d.name}: {d.count}
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div className="py-10 text-center text-sm text-muted-foreground">尚無資料</div>}
              </CardContent>
            </Card>
          </div>

          {topLanguages.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> 訪客語言</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topLanguages} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="次數" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Content Tab ─── */}
        <TabsContent value="content" className="space-y-6">
          {/* Growth Trends */}
          <div className="grid lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> 每日新增會員（{rangeLabel}）</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={userTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} name="新會員" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImagePlus className="h-4 w-4" /> 每日新增作品（{rangeLabel}）</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={photoTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} name="作品數" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> 每日新增討論（{rangeLabel}）</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topicTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <Tooltip /><Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="討論數" />
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
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{photo.title}</p>
                          <p className="text-xs text-muted-foreground">{photo.author_name}</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{photo.view_count}</span>
                          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{photo.like_count}</span>
                          {photo.average_rating > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{Number(photo.average_rating).toFixed(1)}</span>}
                        </div>
                      </div>
                    ))}
                    {topPhotos.length === 0 && <div className="p-8 text-center text-muted-foreground">暫無資料</div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="users">
              <Card>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {activeUsers.map((u, i) => (
                      <div key={u.user_id} className="flex items-center gap-4 p-4">
                        <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{u.display_name}</p>
                          <p className="text-xs text-muted-foreground">@{u.username}</p>
                        </div>
                        <Badge variant="secondary">{u.photo_count} 件作品</Badge>
                      </div>
                    ))}
                    {activeUsers.length === 0 && <div className="p-8 text-center text-muted-foreground">暫無資料</div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─── Resources Tab ─── */}
        <TabsContent value="resources" className="space-y-6">
          {bandwidth ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard label={`${rangeLabel}估算總流量`} value={formatSize(bandwidth.totalEstimatedMB)} icon={<Download className="h-5 w-5" />} raw />
                <StatCard label="圖片瀏覽流量" value={formatSize(bandwidth.photoViewsMB)} icon={<Image className="h-5 w-5" />} raw />
                <StatCard label="頁面瀏覽流量" value={formatSize(bandwidth.pageViewsMB)} icon={<FileText className="h-5 w-5" />} raw />
                <StatCard label={`估算儲存（${bandwidth.totalStoragePhotos} 張）`} value={formatSize((bandwidth.totalStoragePhotos * AVG_PHOTO_WEIGHT_KB) / 1024)} icon={<HardDrive className="h-5 w-5" />} raw />
                
                {/* Remaining Bandwidth */}
                <QuotaCard
                  label="剩餘流量"
                  limitGB={PLAN_BANDWIDTH_GB}
                  usedMB={bandwidth.totalEstimatedMB}
                  icon={<Activity className="h-5 w-5" />}
                  editing={editingBw}
                  editValue={editBwValue}
                  setEditValue={setEditBwValue}
                  saving={savingQuota}
                  onEdit={() => { setEditBwValue(String(PLAN_BANDWIDTH_GB)); setEditingBw(true); }}
                  onCancel={() => setEditingBw(false)}
                  onSave={async () => {
                    const v = Number(editBwValue);
                    if (v > 0) { await saveQuotaSetting("plan_bandwidth_gb", String(v)); setEditingBw(false); }
                  }}
                />
                
                {/* Remaining Storage */}
                <QuotaCard
                  label="剩餘儲存"
                  limitGB={PLAN_STORAGE_GB}
                  usedMB={(bandwidth.totalStoragePhotos * AVG_PHOTO_WEIGHT_KB) / 1024}
                  icon={<HardDrive className="h-5 w-5" />}
                  editing={editingStorage}
                  editValue={editStorageValue}
                  setEditValue={setEditStorageValue}
                  saving={savingQuota}
                  onEdit={() => { setEditStorageValue(String(PLAN_STORAGE_GB)); setEditingStorage(true); }}
                  onCancel={() => setEditingStorage(false)}
                  onSave={async () => {
                    const v = Number(editStorageValue);
                    if (v > 0) { await saveQuotaSetting("plan_storage_gb", String(v)); setEditingStorage(false); }
                  }}
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> 每日頻寬估算（{rangeLabel}）</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={bandwidth.dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} unit=" MB" />
                        <Tooltip formatter={(value: number) => [`${value} MB`, "頻寬"]} />
                        <Bar dataKey="mb" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="MB" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4" /> 流量組成分析</CardTitle></CardHeader>
                  <CardContent>
                    {(() => {
                      const bwBreakdown = [
                        { name: "圖片瀏覽", count: Math.round(bandwidth.photoViewsMB) },
                        { name: "頁面載入", count: Math.round(bandwidth.pageViewsMB) },
                      ].filter(d => d.count > 0);
                      return bwBreakdown.length > 0 ? (
                        <>
                          <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                              <Pie data={bwBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                {bwBreakdown.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                              </Pie>
                              <Tooltip formatter={(value: number) => [`${value} MB`, "流量"]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex justify-center gap-4 mt-2">
                            {bwBreakdown.map((d, i) => (
                              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {d.name}: {formatSize(d.count)}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : <div className="py-10 text-center text-sm text-muted-foreground">尚無資料</div>;
                    })()}
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs text-muted-foreground">
                * 頻寬為估算值，基於平均頁面大小 {AVG_PAGE_WEIGHT_KB}KB 和平均圖片大小 {(AVG_PHOTO_WEIGHT_KB / 1024).toFixed(1)}MB 計算。實際流量可能因快取、CDN 和壓縮而有所不同。
              </p>
            </>
          ) : (
            <div className="text-center py-20 text-muted-foreground border rounded-xl">尚無頻寬資料</div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

// ── Sub Components ──

function HighlightCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: number; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
          <div className="min-w-0">
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
          <Clock className="h-3 w-3" />{sub}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, icon, raw }: { label: string; value: number | string; icon: React.ReactNode; raw?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className="mx-auto w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mb-2">{icon}</div>
        <div className="text-2xl font-bold">{raw ? value : (value as number).toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function TrendChart({ title, icon, data, color, name }: { title: string; icon: React.ReactNode; data: TrendPoint[]; color: string; name: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
            <Tooltip /><Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} name={name} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RankCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: RankItem[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {items.map((p, i) => (
            <div key={p.name} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span className="flex-1 text-sm truncate">{p.name}</span>
              <Badge variant="secondary" className="text-xs">{p.count}</Badge>
            </div>
          ))}
          {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">尚無資料</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function QuotaCard({ label, limitGB, usedMB, icon, editing, editValue, setEditValue, saving, onEdit, onCancel, onSave }: {
  label: string; limitGB: number; usedMB: number; icon: React.ReactNode;
  editing: boolean; editValue: string; setEditValue: (v: string) => void;
  saving: boolean; onEdit: () => void; onCancel: () => void; onSave: () => void;
}) {
  const limitMB = limitGB * 1024;
  const remainMB = Math.max(0, limitMB - usedMB);
  const usedPct = Math.min(100, (usedMB / limitMB) * 100);
  const isWarning = usedPct > 80;

  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`mx-auto w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${isWarning ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
          {icon}
        </div>
        <div className={`text-2xl font-bold ${isWarning ? 'text-destructive' : ''}`}>{formatSize(remainMB)}</div>
        {editing ? (
          <div className="flex items-center justify-center gap-1 mt-1">
            <Input type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-6 w-16 text-xs text-center px-1" min={1} autoFocus />
            <span className="text-[10px] text-muted-foreground">GB</span>
            <button className="p-0.5 rounded hover:bg-primary/10 text-primary disabled:opacity-50" disabled={saving} onClick={onSave}><Check className="h-3.5 w-3.5" /></button>
            <button className="p-0.5 rounded hover:bg-muted" onClick={onCancel}><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1 cursor-pointer group" onClick={onEdit}>
            {label}（{limitGB}GB）
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
        <Progress value={usedPct} className="h-2" />
        <div className="text-[10px] text-muted-foreground mt-1">已用 {usedPct.toFixed(1)}%</div>
      </CardContent>
    </Card>
  );
}

function DateRangeSelector({ rangeMode, setRangeMode, setRangeDays, customFrom, customTo, setCustomFrom, setCustomTo }: {
  rangeMode: string; setRangeMode: (v: string) => void; setRangeDays: (v: number) => void;
  customFrom?: Date; customTo?: Date; setCustomFrom: (v: Date | undefined) => void; setCustomTo: (v: Date | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={rangeMode} onValueChange={(v) => { setRangeMode(v); if (v !== "custom") setRangeDays(Number(v)); }}>
        <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
        </SelectContent>
      </Select>
      {rangeMode === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                {customFrom ? format(customFrom, "yyyy/MM/dd") : "起始日"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} disabled={(date) => date > new Date()} initialFocus className="p-3 pointer-events-auto" locale={zhTW} />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">~</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                {customTo ? format(customTo, "yyyy/MM/dd") : "結束日"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customTo} onSelect={setCustomTo} disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)} initialFocus className="p-3 pointer-events-auto" locale={zhTW} />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}

// ── Helpers ──
function formatPageName(path: string): string {
  const map: Record<string, string> = {
    "/": "首頁", "/gallery": "作品集", "/forums": "討論區", "/marketplace": "二手市集",
    "/upload": "上傳作品", "/auth": "登入/註冊", "/profile": "個人檔案",
    "/favorites": "我的收藏", "/notifications": "通知", "/messages": "訊息",
  };
  if (map[path]) return map[path];
  if (path.startsWith("/gallery/")) return "作品詳情";
  if (path.startsWith("/forums/topic/")) return "討論主題";
  if (path.startsWith("/marketplace/")) return "商品詳情";
  if (path.startsWith("/user/")) return "用戶主頁";
  if (path.startsWith("/admin")) return "後台管理";
  return path;
}

function formatLang(code: string): string {
  const map: Record<string, string> = { zh: "中文", en: "英文", ja: "日文", ko: "韓文", fr: "法文", de: "德文", es: "西班牙文", pt: "葡萄牙文" };
  return map[code] || code;
}

function formatSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(mb * 1024).toFixed(0)} KB`;
}
