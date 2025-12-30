import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Image,
  MessageSquare,
  Flag,
  Settings,
  BarChart3,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { label: "總覽", href: "/admin", icon: LayoutDashboard },
  { label: "會員管理", href: "/admin/users", icon: Users },
  { label: "作品審核", href: "/admin/photos", icon: Image },
  { label: "討論管理", href: "/admin/forums", icon: MessageSquare },
  { label: "檢舉處理", href: "/admin/reports", icon: Flag },
  { label: "數據分析", href: "/admin/analytics", icon: BarChart3 },
  { label: "系統設定", href: "/admin/settings", icon: Settings },
];

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
}

function StatCard({ title, value, change, icon }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="bg-card rounded-xl border border-border p-6 hover-lift">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );
}

interface ReportItem {
  id: string;
  type: "photo" | "comment" | "topic";
  target: string;
  reporter: string;
  reason: string;
  status: "pending" | "resolved" | "dismissed";
  createdAt: string;
}

const recentReports: ReportItem[] = [
  {
    id: "1",
    type: "photo",
    target: "不當照片 #12345",
    reporter: "user123",
    reason: "包含不當內容",
    status: "pending",
    createdAt: "10 分鐘前",
  },
  {
    id: "2",
    type: "comment",
    target: "留言 #67890",
    reporter: "photographer88",
    reason: "惡意攻擊",
    status: "pending",
    createdAt: "30 分鐘前",
  },
  {
    id: "3",
    type: "topic",
    target: "主題 #11111",
    reporter: "admin_helper",
    reason: "違反政治禁令",
    status: "resolved",
    createdAt: "1 小時前",
  },
];

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  resolved: "bg-green-500/10 text-green-600 border-green-500/20",
  dismissed: "bg-muted text-muted-foreground border-border",
};

const statusLabels = {
  pending: "待處理",
  resolved: "已處理",
  dismissed: "已駁回",
};

export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif font-bold">管理後台</span>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform lg:translate-x-0 lg:static ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-border flex items-center justify-between">
              <Link to="/admin" className="font-serif text-xl font-bold">
                光影<span className="text-gradient">管理</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Back to Site */}
            <div className="p-4 border-t border-border">
              <Link to="/">
                <Button variant="outline" className="w-full">
                  返回前台
                </Button>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Top Bar */}
          <header className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-border bg-card">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="搜尋..." className="pl-10" />
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-zinc-900 font-bold text-sm">
                      A
                    </div>
                    <span>管理員</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>個人設定</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">登出</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="font-serif text-2xl lg:text-3xl font-bold mb-2">
                歡迎回來，<span className="text-gradient">管理員</span>
              </h1>
              <p className="text-muted-foreground">
                以下是今日的網站概況
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="今日訪客"
                value="2,345"
                change={12.5}
                icon={<Eye className="h-5 w-5" />}
              />
              <StatCard
                title="新註冊會員"
                value="156"
                change={8.3}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                title="新上傳作品"
                value="423"
                change={-2.1}
                icon={<Image className="h-5 w-5" />}
              />
              <StatCard
                title="待處理檢舉"
                value="12"
                change={-15.4}
                icon={<AlertTriangle className="h-5 w-5" />}
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
                  {recentReports.map((report) => (
                    <div key={report.id} className="p-4 flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {report.type === "photo" && <Image className="h-4 w-4" />}
                        {report.type === "comment" && <MessageSquare className="h-4 w-4" />}
                        {report.type === "topic" && <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{report.target}</span>
                          <Badge variant="outline" className={statusColors[report.status]}>
                            {statusLabels[report.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {report.reason} · 由 {report.reporter} 檢舉
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.createdAt}
                        </p>
                      </div>
                      {report.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
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
                        <Badge className="absolute -top-2 -right-2 bg-destructive">12</Badge>
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

                {/* Activity Log */}
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-semibold mb-4">最近活動</h2>
                  <div className="space-y-4">
                    {[
                      { action: "新會員註冊", user: "photo_lover99", time: "5 分鐘前" },
                      { action: "作品被檢舉", user: "suspicious_post", time: "12 分鐘前" },
                      { action: "會員被停權", user: "rule_breaker", time: "1 小時前" },
                    ].map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">
                          <span className="text-muted-foreground">{activity.action}：</span>
                          <span className="font-medium">{activity.user}</span>
                        </span>
                        <span className="text-muted-foreground text-xs">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
