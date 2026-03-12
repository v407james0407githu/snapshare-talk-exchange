import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users, Image, MessageSquare, Eye, Star, Heart, TrendingUp, ShoppingBag,
  Loader2, Globe, FileText, Link2, Monitor, MapPin, HardDrive, Download, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { format, subDays, differenceInDays, startOfDay } from "date-fns";
import { zhTW } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ── Types ──
interface Stats {
  totalUsers: number; totalPhotos: number; totalTopics: number;
  totalReplies: number; totalListings: number; pendingReports: number;
}
interface TopPhoto { id: string; title: string; view_count: number; like_count: number; average_rating: number; author_name: string; }
interface ActiveUser { user_id: string; username: string; display_name: string; photo_count: number; }
interface TrendPoint { date: string; count: number; }
interface RankItem { name: string; count: number; }
interface BandwidthData {
  totalEstimatedMB: number;
  photoViewsMB: number;
  pageViewsMB: number;
  dailyTrend: { date: string; mb: number }[];
  totalPhotoViews: number;
  totalStoragePhotos: number;
}

// Estimated weights
const AVG_PAGE_WEIGHT_KB = 350; // average page load ~350KB (HTML+CSS+JS cached)
const AVG_PHOTO_WEIGHT_KB = 1800; // average photo view ~1.8MB
const AVG_THUMBNAIL_WEIGHT_KB = 80; // thumbnail in gallery ~80KB

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [topPhotos, setTopPhotos] = useState<TopPhoto[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [photoTrend, setPhotoTrend] = useState<TrendPoint[]>([]);
  const [topicTrend, setTopicTrend] = useState<TrendPoint[]>([]);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    const [usersR, photosR, topicsR, repliesR, listingsR, pendingR] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("photos").select("id", { count: "exact", head: true }),
      supabase.from("forum_topics").select("id", { count: "exact", head: true }),
      supabase.from("forum_replies").select("id", { count: "exact", head: true }),
      supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setStats({
      totalUsers: usersR.count || 0, totalPhotos: photosR.count || 0,
      totalTopics: topicsR.count || 0, totalReplies: repliesR.count || 0,
      totalListings: listingsR.count || 0, pendingReports: pendingR.count || 0,
    });
  }

  async function fetchTopPhotos() {
    const { data: photos } = await supabase
      .from("photos").select("id, title, view_count, like_count, average_rating, user_id")
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

  function getDateRange(): { startDate: string; days: number } {
    if (rangeMode === "custom" && customFrom && customTo) {
      const days = Math.max(1, differenceInDays(customTo, customFrom) + 1);
      return { startDate: startOfDay(customFrom).toISOString(), days };
    }
    return { startDate: subDays(new Date(), rangeDays).toISOString(), days: rangeDays };
  }

  async function fetchTrends() {
    const { startDate, days } = getDateRange();
    const [{ data: recentPhotos }, { data: recentTopics }] = await Promise.all([
      supabase.from("photos").select("created_at").gte("created_at", startDate),
      supabase.from("forum_topics").select("created_at").gte("created_at", startDate),
    ]);
    const buildTrend = (items: { created_at: string }[] | null): TrendPoint[] => {
      const map = new Map<string, number>();
      for (let i = 0; i < days; i++) { const d = format(subDays(new Date(), days - 1 - i), "MM/dd"); map.set(d, 0); }
      items?.forEach((item) => { const d = format(new Date(item.created_at), "MM/dd"); if (map.has(d)) map.set(d, map.get(d)! + 1); });
      return [...map.entries()].map(([date, count]) => ({ date, count }));
    };
    setPhotoTrend(buildTrend(recentPhotos));
    setTopicTrend(buildTrend(recentTopics));
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
    const allSessions = new Set(views.map((v: any) => v.session_id));
    setTotalUV(allSessions.size);

    const todayViews = views.filter((v: any) => new Date(v.created_at) >= todayStart);
    setTodayPV(todayViews.length);
    setTodayUV(new Set(todayViews.map((v: any) => v.session_id)).size);

    // PV/UV trend
    const pvMap = new Map<string, number>();
    const uvMap = new Map<string, Set<string>>();
    for (let i = 0; i < days; i++) { const d = format(subDays(new Date(), days - 1 - i), "MM/dd"); pvMap.set(d, 0); uvMap.set(d, new Set()); }
    views.forEach((v: any) => { const d = format(new Date(v.created_at), "MM/dd"); if (pvMap.has(d)) pvMap.set(d, pvMap.get(d)! + 1); if (uvMap.has(d)) uvMap.get(d)!.add(v.session_id); });
    setPvTrend([...pvMap.entries()].map(([date, count]) => ({ date, count })));
    setUvTrend([...uvMap.entries()].map(([date, sessions]) => ({ date, count: sessions.size })));

    // Top pages
    const pageCount = new Map<string, number>();
    views.forEach((v: any) => pageCount.set(v.page_path, (pageCount.get(v.page_path) || 0) + 1));
    setTopPages([...pageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name: formatPageName(name), count })));

    // Referrers
    const refCount = new Map<string, number>();
    views.forEach((v: any) => { const domain = v.referrer_domain || "直接訪問"; refCount.set(domain, (refCount.get(domain) || 0) + 1); });
    setTopReferrers([...refCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })));

    // Countries
    const countryCount = new Map<string, number>();
    views.forEach((v: any) => { const c = v.country || "未知"; countryCount.set(c, (countryCount.get(c) || 0) + 1); });
    setTopCountries([...countryCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })));

    // Languages
    const langCount = new Map<string, number>();
    views.forEach((v: any) => { const lang = v.language?.split("-")[0] || "未知"; langCount.set(lang, (langCount.get(lang) || 0) + 1); });
    setTopLanguages([...langCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name: formatLang(name), count })));

    // Devices
    let mobile = 0, tablet = 0, desktop = 0;
    views.forEach((v: any) => { const w = v.screen_width || 0; if (w < 768) mobile++; else if (w < 1024) tablet++; else desktop++; });
    setDeviceBreakdown([{ name: "手機", count: mobile }, { name: "平板", count: tablet }, { name: "桌面", count: desktop }].filter(d => d.count > 0));
  }

  async function fetchBandwidth() {
    const { startDate, days } = getDateRange();

    // Get page views with page_path to distinguish photo detail pages
    const { data: views } = await (supabase.from("page_views") as any)
      .select("page_path, created_at")
      .gte("created_at", startDate)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!views || views.length === 0) {
      setBandwidth(null);
      return;
    }

    // Count photo detail views vs regular page views
    let photoDetailViews = 0;
    let regularViews = 0;
    views.forEach((v: any) => {
      if (v.page_path?.startsWith("/gallery/") && v.page_path !== "/gallery") {
        photoDetailViews++;
      } else {
        regularViews++;
      }
    });

    // Get total photos count for storage estimation
    const { count: totalPhotos } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true });

    // Estimate bandwidth
    const photoViewsMB = (photoDetailViews * AVG_PHOTO_WEIGHT_KB) / 1024;
    const pageViewsMB = (regularViews * AVG_PAGE_WEIGHT_KB) / 1024;
    const totalEstimatedMB = photoViewsMB + pageViewsMB;

    // Daily bandwidth trend
    const dailyMap = new Map<string, { photoViews: number; pageViews: number }>();
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), "MM/dd");
      dailyMap.set(d, { photoViews: 0, pageViews: 0 });
    }
    views.forEach((v: any) => {
      const d = format(new Date(v.created_at), "MM/dd");
      const entry = dailyMap.get(d);
      if (entry) {
        if (v.page_path?.startsWith("/gallery/") && v.page_path !== "/gallery") {
          entry.photoViews++;
        } else {
          entry.pageViews++;
        }
      }
    });
    const dailyTrend = [...dailyMap.entries()].map(([date, data]) => ({
      date,
      mb: Number(((data.photoViews * AVG_PHOTO_WEIGHT_KB + data.pageViews * AVG_PAGE_WEIGHT_KB) / 1024).toFixed(1)),
    }));

    setBandwidth({
      totalEstimatedMB,
      photoViewsMB,
      pageViewsMB,
      dailyTrend,
      totalPhotoViews: photoDetailViews,
      totalStoragePhotos: totalPhotos || 0,
    });
  }

  if (loading) {
    return (
      <AdminLayout title="數據分析" subtitle="全站數據統計與趨勢分析">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </AdminLayout>
    );
  }

  const rangeLabel = rangeMode === "custom" && customFrom && customTo
    ? `${format(customFrom, "MM/dd")} ~ ${format(customTo, "MM/dd")}`
    : RANGE_OPTIONS.find(r => r.value === String(rangeDays))?.label || `近 ${rangeDays} 天`;

  const statCards = [
    { label: "總會員", value: stats?.totalUsers || 0, icon: <Users className="h-5 w-5" /> },
    { label: "總作品", value: stats?.totalPhotos || 0, icon: <Image className="h-5 w-5" /> },
    { label: "討論主題", value: stats?.totalTopics || 0, icon: <MessageSquare className="h-5 w-5" /> },
    { label: "討論回覆", value: stats?.totalReplies || 0, icon: <MessageSquare className="h-5 w-5" /> },
    { label: "二手商品", value: stats?.totalListings || 0, icon: <ShoppingBag className="h-5 w-5" /> },
    { label: "待處理檢舉", value: stats?.pendingReports || 0, icon: <TrendingUp className="h-5 w-5" /> },
  ];

  const trafficCards = [
    { label: `${rangeLabel}總瀏覽`, value: totalPV, icon: <Eye className="h-5 w-5" /> },
    { label: `${rangeLabel}獨立訪客`, value: totalUV, icon: <Users className="h-5 w-5" /> },
    { label: "今日瀏覽", value: todayPV, icon: <FileText className="h-5 w-5" /> },
    { label: "今日訪客", value: todayUV, icon: <Globe className="h-5 w-5" /> },
  ];

  return (
    <AdminLayout title="數據分析" subtitle="全站數據統計與趨勢分析">
      {/* Content stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date range selector */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h3 className="text-lg font-semibold">流量分析</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={rangeMode} onValueChange={(v) => {
            setRangeMode(v);
            if (v !== "custom") setRangeDays(Number(v));
          }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
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
      </div>

      {/* Traffic stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {trafficCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center mb-2">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Traffic Trends */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> 瀏覽量趨勢（{rangeLabel}）</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={pvTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip /><Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="PV" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> 獨立訪客趨勢（{rangeLabel}）</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={uvTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip /><Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="UV" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bandwidth Estimation */}
      {bandwidth && (
        <>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Activity className="h-5 w-5" /> 頻寬流量估算</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2"><Download className="h-5 w-5" /></div>
                <div className="text-2xl font-bold">{formatSize(bandwidth.totalEstimatedMB)}</div>
                <div className="text-xs text-muted-foreground">{rangeLabel}估算總流量</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center mb-2"><Image className="h-5 w-5" /></div>
                <div className="text-2xl font-bold">{formatSize(bandwidth.photoViewsMB)}</div>
                <div className="text-xs text-muted-foreground">圖片瀏覽流量</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center mb-2"><FileText className="h-5 w-5" /></div>
                <div className="text-2xl font-bold">{formatSize(bandwidth.pageViewsMB)}</div>
                <div className="text-xs text-muted-foreground">頁面瀏覽流量</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="mx-auto w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center mb-2"><HardDrive className="h-5 w-5" /></div>
                <div className="text-2xl font-bold">{formatSize((bandwidth.totalStoragePhotos * AVG_PHOTO_WEIGHT_KB) / 1024)}</div>
                <div className="text-xs text-muted-foreground">估算儲存空間（{bandwidth.totalStoragePhotos} 張）</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-8">
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
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">尚無資料</div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground mb-8">
            * 頻寬為估算值，基於平均頁面大小 {AVG_PAGE_WEIGHT_KB}KB 和平均圖片大小 {(AVG_PHOTO_WEIGHT_KB / 1024).toFixed(1)}MB 計算。實際流量可能因快取、CDN 和壓縮而有所不同。
          </p>
        </>
      )}

      {/* Pages, Referrers, Countries, Devices */}
      <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-8 mb-8">
        {/* Top Pages */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> 熱門頁面</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {topPages.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{p.name}</span>
                  <Badge variant="secondary" className="text-xs">{p.count}</Badge>
                </div>
              ))}
              {topPages.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">尚無資料</div>}
            </div>
          </CardContent>
        </Card>

        {/* Referrers */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" /> 流量來源</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {topReferrers.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{r.name}</span>
                  <Badge variant="secondary" className="text-xs">{r.count}</Badge>
                </div>
              ))}
              {topReferrers.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">尚無資料</div>}
            </div>
          </CardContent>
        </Card>

        {/* Countries */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> 訪客國家/地區</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {topCountries.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="flex-1 text-sm truncate">{c.name}</span>
                  <Badge variant="secondary" className="text-xs">{c.count}</Badge>
                </div>
              ))}
              {topCountries.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">尚無資料</div>}
            </div>
          </CardContent>
        </Card>

        {/* Devices */}
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
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">尚無資料</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Language breakdown */}
      {topLanguages.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
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
        </div>
      )}

      {/* Content Trends */}
      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader><CardTitle className="text-base">每日新增作品（{rangeLabel}）</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={photoTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip /><Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="作品數" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">每日新增討論（{rangeLabel}）</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topicTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="討論數" />
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
                {activeUsers.map((user, i) => (
                  <div key={user.user_id} className="flex items-center gap-4 p-4">
                    <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{user.display_name}</p>
                      <p className="text-xs text-muted-foreground">@{user.username}</p>
                    </div>
                    <Badge variant="secondary">{user.photo_count} 件作品</Badge>
                  </div>
                ))}
                {activeUsers.length === 0 && <div className="p-8 text-center text-muted-foreground">暫無資料</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
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
