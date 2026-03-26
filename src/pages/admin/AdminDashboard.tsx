import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Image,
  MessageSquare,
  Flag,
  Settings,
  TrendingUp,
  Eye,
  AlertTriangle,
  CheckCircle,
  Ban,
  Store,
  Home,
  Globe,
  FileText,
  Shield,
  ArrowRight,
  Activity,
  HardDrive,
  BarChart3,
} from "lucide-react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format, subDays } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  loading?: boolean;
  accent?: boolean;
}

function KpiCard({ title, value, subtitle, icon, loading, accent }: KpiCardProps) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${accent ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
          {icon}
        </div>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-muted animate-pulse rounded" />
      ) : (
        <div className="text-2xl font-bold tracking-tight">{value}</div>
      )}
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

interface Report {
  id: string;
  content_type: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_profile?: { username: string };
}

const contentTypeLabels: Record<string, string> = {
  photo: "照片",
  comment: "留言",
  forum_topic: "討論主題",
  forum_reply: "討論回覆",
  listing: "商品",
};

export default function AdminDashboard() {
  const { get, getNum } = useSystemSettings();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPhotos: 0,
    totalTopics: 0,
    totalListings: 0,
    pendingReports: 0,
    todayUsers: 0,
    todayPhotos: 0,
    todayTopics: 0,
    todayListings: 0,
    todayViews: 0,
  });
  const [trendData, setTrendData] = useState<{ date: string; 新會員: number; 新作品: number; 瀏覽量: number }[]>([]);
  const [trendRange, setTrendRange] = useState(7);
  const [trendLoading, setTrendLoading] = useState(false);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [healthWarnings, setHealthWarnings] = useState<{ text: string; link: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();

        const [
          usersRes, photosRes, topicsRes, listingsRes,
          pendingReportsRes, reportsRes,
          todayUsersRes, todayPhotosRes, todayTopicsRes, todayListingsRes,
          todayViewsRes,
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("photos").select("id", { count: "exact", head: true }),
          supabase.from("forum_topics").select("id", { count: "exact", head: true }),
          supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("reports").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
          supabase.from("photos").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
          supabase.from("forum_topics").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
          supabase.from("marketplace_listings").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
          supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          totalPhotos: photosRes.count || 0,
          totalTopics: topicsRes.count || 0,
          totalListings: listingsRes.count || 0,
          pendingReports: pendingReportsRes.count || 0,
          todayUsers: todayUsersRes.count || 0,
          todayPhotos: todayPhotosRes.count || 0,
          todayTopics: todayTopicsRes.count || 0,
          todayListings: todayListingsRes.count || 0,
          todayViews: todayViewsRes.count || 0,
        });

        // Reports with profiles
        if (reportsRes.data?.length) {
          const reporterIds = [...new Set(reportsRes.data.map((r) => r.reporter_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username")
            .in("user_id", reporterIds);
          const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
          setRecentReports(
            reportsRes.data.map((r) => ({
              ...r,
              reporter_profile: profileMap.get(r.reporter_id),
            }))
          );
        }

        // Health warnings with links
        const warnings: { text: string; link: string }[] = [];
        const seoTitle = get("seo_title", "");
        const seoDesc = get("seo_description", "");
        const ogImage = get("seo_og_image_url", "");
        const favicon = get("site_favicon_url", "");
        if (!seoTitle || seoTitle.includes("IP543")) warnings.push({ text: "SEO 標題尚未自訂", link: "/admin/content/seo" });
        if (!seoDesc) warnings.push({ text: "SEO 描述尚未設定", link: "/admin/content/seo" });
        if (!ogImage) warnings.push({ text: "OG 社群分享圖片未設定", link: "/admin/content/seo" });
        if (!favicon) warnings.push({ text: "Favicon 尚未設定", link: "/admin/content/seo" });

        // Check static pages
        const { data: pages } = await supabase
          .from("site_content")
          .select("section_key, content_value")
          .in("section_key", ["about_content", "contact_content", "terms_content", "privacy_content"]);
        const pageLabels: Record<string, string> = {
          about_content: "關於我們",
          contact_content: "聯絡我們",
          terms_content: "使用條款",
          privacy_content: "隱私政策",
        };
        pages?.forEach((p) => {
          if (!p.content_value || p.content_value.trim().length < 10) {
            warnings.push({ text: `${pageLabels[p.section_key] || p.section_key} 頁面內容為空`, link: "/admin/content/pages" });
          }
        });

        // Check banners
        const { count: bannerCount } = await supabase
          .from("hero_banners")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true);
        if (!bannerCount) warnings.push({ text: "首頁 Banner 尚未設定", link: "/admin/homepage/banners" });

        // Check feature toggles vs homepage sections
        const galleryEnabled = get("gallery_enabled", "true") === "true";
        const forumEnabled = get("forum_enabled", "true") === "true";
        const marketplaceEnabled = get("marketplace_enabled", "true") === "true";
        const { data: homeSections } = await supabase.from("homepage_sections").select("section_key, is_visible");
        if (homeSections) {
          const visibleKeys = homeSections.filter((s) => s.is_visible).map((s) => s.section_key);
          if (!galleryEnabled && visibleKeys.includes("featured_gallery")) {
            warnings.push({ text: "作品功能已關閉，但首頁仍顯示「精選作品」區塊", link: "/admin/settings/features" });
          }
          if (!forumEnabled && visibleKeys.includes("forum_preview")) {
            warnings.push({ text: "討論功能已關閉，但首頁仍顯示「熱門討論」區塊", link: "/admin/settings/features" });
          }
          if (!marketplaceEnabled && visibleKeys.includes("marketplace_preview")) {
            warnings.push({ text: "市集功能已關閉，但首頁仍顯示「二手市集」區塊", link: "/admin/settings/features" });
          }
        }

        setHealthWarnings(warnings);

        // Trend data is fetched separately via trendRange effect
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [get]);

  // Separate effect for trend data driven by trendRange
  useEffect(() => {
    async function fetchTrend() {
      setTrendLoading(true);
      try {
        const now = new Date();
        const rangeStart = subDays(now, trendRange - 1);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeISO = rangeStart.toISOString();

        const [trendUsers, trendPhotos, trendViews] = await Promise.all([
          supabase.from("profiles").select("created_at").gte("created_at", rangeISO),
          supabase.from("photos").select("created_at").gte("created_at", rangeISO),
          supabase.from("page_views").select("created_at").gte("created_at", rangeISO),
        ]);

        const days: { date: string; 新會員: number; 新作品: number; 瀏覽量: number }[] = [];
        for (let i = trendRange - 1; i >= 0; i--) {
          const day = subDays(now, i);
          const dayStr = format(day, "yyyy-MM-dd");
          const label = format(day, "MM/dd");
          days.push({
            date: label,
            新會員: (trendUsers.data || []).filter((r) => r.created_at.startsWith(dayStr)).length,
            新作品: (trendPhotos.data || []).filter((r) => r.created_at.startsWith(dayStr)).length,
            瀏覽量: (trendViews.data || []).filter((r) => r.created_at.startsWith(dayStr)).length,
          });
        }
        setTrendData(days);
      } catch (error) {
        console.error("Error fetching trend data:", error);
      } finally {
        setTrendLoading(false);
      }
    }
    fetchTrend();
  }, [trendRange]);

  const storageUsed = getNum("storage_used_mb", 0);
  const storageQuota = getNum("storage_quota_mb", 8192);
  const storagePercent = storageQuota > 0 ? Math.round((storageUsed / storageQuota) * 100) : 0;

  const handleResolveReport = async (reportId: string, resolution: "resolved" | "dismissed") => {
    const { error } = await supabase
      .from("reports")
      .update({ status: resolution, resolved_at: new Date().toISOString() })
      .eq("id", reportId);
    if (!error) {
      setRecentReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((prev) => ({ ...prev, pendingReports: Math.max(0, prev.pendingReports - 1) }));
    }
  };

  const quickActions = [
    { label: "管理 Banner", href: "/admin/homepage/banners", icon: Home },
    { label: "編輯首頁文案", href: "/admin/homepage/copy", icon: FileText },
    { label: "待審核內容", href: "/admin/moderation/photos", icon: Shield },
    { label: "檢舉處理", href: "/admin/moderation/reports", icon: Flag, badge: stats.pendingReports },
    { label: "SEO 設定", href: "/admin/content/seo", icon: Globe },
    { label: "靜態頁面", href: "/admin/content/pages", icon: FileText },
    { label: "會員管理", href: "/admin/members", icon: Users },
    { label: "數據分析", href: "/admin/analytics", icon: BarChart3 },
  ];

  useAdminPage("管理總覽", "網站營運狀態一覽");

  return (
    <>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          title="今日新會員"
          value={stats.todayUsers.toLocaleString()}
          subtitle={`累計 ${stats.totalUsers.toLocaleString()}`}
          icon={<Users className="h-4 w-4" />}
          loading={loading}
        />
        <KpiCard
          title="今日新作品"
          value={stats.todayPhotos.toLocaleString()}
          subtitle={`累計 ${stats.totalPhotos.toLocaleString()}`}
          icon={<Image className="h-4 w-4" />}
          loading={loading}
        />
        <KpiCard
          title="今日新討論"
          value={stats.todayTopics.toLocaleString()}
          subtitle={`累計 ${stats.totalTopics.toLocaleString()}`}
          icon={<MessageSquare className="h-4 w-4" />}
          loading={loading}
        />
        <KpiCard
          title="今日新刊登"
          value={stats.todayListings.toLocaleString()}
          subtitle={`累計 ${stats.totalListings.toLocaleString()}`}
          icon={<Store className="h-4 w-4" />}
          loading={loading}
        />
        <KpiCard
          title="今日瀏覽量"
          value={stats.todayViews.toLocaleString()}
          icon={<Eye className="h-4 w-4" />}
          loading={loading}
        />
      </div>

      {/* Alerts Row */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {/* Pending Reports */}
        {stats.pendingReports > 0 && (
          <Link
            to="/admin/moderation/reports"
            className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors"
          >
            <div className="p-2 rounded-lg bg-destructive/15 text-destructive">
              <Flag className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{stats.pendingReports} 則待處理檢舉</p>
              <p className="text-xs text-muted-foreground">點擊前往處理</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}

        {/* Storage */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <HardDrive className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">儲存空間</p>
            <Progress value={storagePercent} className="h-1.5 mt-1.5" />
            <p className="text-xs text-muted-foreground mt-1">
              {(storageUsed / 1024).toFixed(1)} / {(storageQuota / 1024).toFixed(1)} GB
            </p>
          </div>
        </div>

        {/* System Health */}
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">系統狀態</p>
            <p className="text-xs text-green-600 font-medium">正常運作</p>
          </div>
        </div>
      </div>

      {/* Health Warnings */}
      {healthWarnings.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">內容健康檢查</span>
          </div>
          <ul className="space-y-1.5">
            {healthWarnings.map((w, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                <Link to={w.link} className="text-yellow-700/80 hover:text-yellow-900 hover:underline transition-colors">
                  {w.text}
                </Link>
                <ArrowRight className="h-3 w-3 text-yellow-500/60 shrink-0" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trend Chart */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">近 {trendRange} 天趨勢</h2>
          </div>
          <div className="flex gap-1">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setTrendRange(d)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  trendRange === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {d} 天
              </button>
            ))}
          </div>
        </div>
        {loading || trendLoading ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">載入中...</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="新會員" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="新作品" stroke="hsl(210, 80%, 55%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="瀏覽量" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Quick Actions - left 3 cols */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">快速操作</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Link key={action.href} to={action.href}>
                <div className="relative p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors text-center group">
                  <action.icon className="h-5 w-5 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs font-medium">{action.label}</span>
                  {action.badge ? (
                    <Badge className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] h-5 min-w-5 flex items-center justify-center">
                      {action.badge}
                    </Badge>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Reports - right 2 cols */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">最新檢舉</h2>
            <Link to="/admin/moderation/reports">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                全部 <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">載入中...</div>
            ) : recentReports.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-50" />
                目前無待處理檢舉
              </div>
            ) : (
              recentReports.map((report) => (
                <div key={report.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {contentTypeLabels[report.content_type] || report.content_type}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {report.reason} · {report.reporter_profile?.username || "匿名"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: zhTW })}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleResolveReport(report.id, "resolved")}
                      title="標記已處理"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleResolveReport(report.id, "dismissed")}
                      title="駁回"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
