import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  Users,
  Image,
  ImageIcon,
  MessageSquare,
  Flag,
  Settings,
  BarChart3,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const navItems = [
  { label: "總覽", href: "/admin", icon: LayoutDashboard },
  { label: "會員管理", href: "/admin/users", icon: Users },
  { label: "Banner管理", href: "/admin/banners", icon: ImageIcon },
  { label: "檢舉處理", href: "/admin/reports", icon: Flag },
  { label: "作品審核", href: "/admin/photos", icon: Image },
  { label: "討論管理", href: "/admin/forums", icon: MessageSquare },
  { label: "數據分析", href: "/admin/analytics", icon: BarChart3 },
  { label: "系統設定", href: "/admin/settings", icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, user, isAdmin, isModerator } = useAdmin();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin && !isModerator) {
      navigate("/");
    }
  }, [loading, user, isAdmin, isModerator, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || !user || (!isAdmin && !isModerator)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif font-bold">{title}</span>
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
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    登出
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="font-serif text-2xl lg:text-3xl font-bold mb-2">
                {title.split("").map((char, i) => 
                  i === 0 ? char : <span key={i} className={i === 1 ? "text-gradient" : ""}>{char}</span>
                )}
              </h1>
              {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
            </div>
            {children}
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
