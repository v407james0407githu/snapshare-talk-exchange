import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Image,
  MessageSquare,
  Flag,
  Settings,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ title, value, change, icon, loading }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <div className="bg-card rounded-xl border border-border p-6 hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">
        {loading ? <div className="h-8 w-16 bg-muted animate-pulse rounded" /> : value}
      </div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );
}

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_profile?: {
    username: string;
  };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-600 border-green-500/20",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const statusLabels: Record<string, string> = {
  pending: "待處理",
  resolved: "已處理",
  dismissed: "已駁回",
};

const contentTypeLabels: Record<string, string> = {
  photo: "照片",
  comment: "留言",
  forum_topic: "討論主題",
  forum_reply: "討論回覆",
  listing: "商品",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPhotos: 0,
    pendingReports: 0,
    totalTopics: 0,
  });
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch stats in parallel
        const [usersRes, photosRes, reportsRes, topicsRes, pendingReportsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("photos").select("id", { count: "exact", head: true }),
          supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(5),
          supabase.from("forum_topics").select("id", { count: "exact", head: true }),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          totalPhotos: photosRes.count || 0,
          pendingReports: pendingReportsRes.count || 0,
          totalTopics: topicsRes.count || 0,
        });

        // Fetch reporter profiles separately
        if (reportsRes.data) {
          const reporterIds = [...new Set(reportsRes.data.map((r) => r.reporter_id))];
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, username")
            .in("user_id", reporterIds);

          const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
          
          const reportsWithProfiles = reportsRes.data.map((report) => ({
            ...report,
            reporter_profile: profileMap.get(report.reporter_id),
          }));

          setRecentReports(reportsWithProfiles);
        }
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleResolveReport = async (reportId: string, resolution: "resolved" | "dismissed") => {
    const { error } = await supabase
      .from("reports")
      .update({ 
        status: resolution, 
        resolved_at: new Date().toISOString() 
      })
      .eq("id", reportId);

    if (!error) {
      setRecentReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: resolution } : r))
      );
      setStats((prev) => ({ ...prev, pendingReports: prev.pendingReports - 1 }));
    }
  };

  return (
    <AdminLayout title="歡迎回來" subtitle="以下是今日的網站概況">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="總會員數"
          value={stats.totalUsers.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="總作品數"
          value={stats.totalPhotos.toLocaleString()}
          icon={<Image className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="討論主題"
          value={stats.totalTopics.toLocaleString()}
          icon={<MessageSquare className="h-5 w-5" />}
          loading={loading}
        />
        <StatCard
          title="待處理檢舉"
          value={stats.pendingReports.toLocaleString()}
          icon={<AlertTriangle className="h-5 w-5" />}
          loading={loading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Reports */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">最新檢舉</h2>
            <Link to="/admin/reports">
              <Button variant="ghost" size="sm">
                查看全部
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">載入中...</div>
            ) : recentReports.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">暫無檢舉記錄</div>
            ) : (
              recentReports.map((report) => (
                <div key={report.id} className="p-4 flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-muted">
                    {report.content_type === "photo" && <Image className="h-4 w-4" />}
                    {(report.content_type === "comment" || 
                      report.content_type === "forum_topic" || 
                      report.content_type === "forum_reply") && <MessageSquare className="h-4 w-4" />}
                    {report.content_type === "listing" && <Eye className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {contentTypeLabels[report.content_type] || report.content_type}
                      </span>
                      <Badge variant="outline" className={statusColors[report.status] || statusColors.pending}>
                        {statusLabels[report.status] || report.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {report.reason} · 由 {report.reporter_profile?.username || "匿名"} 檢舉
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: zhTW })}
                    </p>
                  </div>
                  {report.status === "pending" && (
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-green-600"
                        onClick={() => handleResolveReport(report.id, "resolved")}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleResolveReport(report.id, "dismissed")}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold mb-4">快速操作</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/admin/users">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Users className="h-5 w-5" />
                  <span>會員管理</span>
                </Button>
              </Link>
              <Link to="/admin/reports">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 relative">
                  <Flag className="h-5 w-5" />
                  <span>檢舉處理</span>
                  {stats.pendingReports > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-destructive">
                      {stats.pendingReports}
                    </Badge>
                  )}
                </Button>
              </Link>
              <Link to="/admin/photos">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Image className="h-5 w-5" />
                  <span>作品審核</span>
                </Button>
              </Link>
              <Link to="/admin/settings">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Settings className="h-5 w-5" />
                  <span>系統設定</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Activity Log - placeholder for now */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-semibold mb-4">系統資訊</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">
                  <span className="text-muted-foreground">資料庫狀態：</span>
                  <span className="font-medium text-green-600">正常運作</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">
                  <span className="text-muted-foreground">儲存空間：</span>
                  <span className="font-medium">正常</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
