import { memo, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Shield,
  Store,
  Layers,
  Globe,
  Tag,
  UserCog,
  AlertTriangle,
  ScrollText,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { cn } from "@/lib/utils";
import { AdminPageProvider, useAdminPageMeta } from "./AdminPageContext";
import { useQueryClient } from "@tanstack/react-query";
import { prefetchAdminDestination, scheduleAdminWarmup } from "@/lib/adminPrefetch";

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

const navGroups: NavGroup[] = [
  {
    label: "總覽",
    icon: LayoutDashboard,
    items: [{ label: "管理總覽", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "首頁管理",
    icon: Home,
    items: [
      { label: "區塊排序", href: "/admin/homepage/sections", icon: Layers },
      { label: "Banner 管理", href: "/admin/homepage/banners", icon: Image },
      { label: "首頁文案", href: "/admin/homepage/copy", icon: FileText },
    ],
  },
  {
    label: "社群管理",
    icon: MessageSquare,
    items: [
      { label: "作品管理", href: "/admin/community/photos", icon: Image },
      { label: "討論管理", href: "/admin/community/forums", icon: MessageSquare },
      { label: "二手管理", href: "/admin/community/marketplace", icon: Store },
      
      { label: "討論分類", href: "/admin/community/categories", icon: Tag },
      
    ],
  },
  {
    label: "會員管理",
    icon: Users,
    items: [
      { label: "會員列表", href: "/admin/members", icon: Users },
      { label: "權限角色", href: "/admin/members/roles", icon: UserCog },
    ],
  },
  {
    label: "審核與風控",
    icon: Shield,
    items: [{ label: "檢舉處理", href: "/admin/moderation/reports", icon: Flag }],
  },
  {
    label: "數據分析",
    icon: BarChart3,
    items: [{ label: "流量概況", href: "/admin/analytics", icon: BarChart3 }],
  },
  {
    label: "系統設定",
    icon: Settings,
    items: [
      { label: "基本設定", href: "/admin/settings", icon: Settings },
      { label: "功能開關", href: "/admin/settings/features", icon: AlertTriangle },
    ],
  },
];

/* ─── Memoized Sidebar ─── */
const Sidebar = memo(function Sidebar({
  pathname,
  siteLogo,
  isSidebarOpen,
  onClose,
  onPrefetch,
}: {
  pathname: string;
  siteLogo: string | null;
  isSidebarOpen: boolean;
  onClose: () => void;
  onPrefetch: (href: string) => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const active = navGroups.find((g) => g.items.some((i) => i.href === pathname));
    return active ? new Set([active.label]) : new Set<string>();
  });

  // Auto-expand group when navigating
  useEffect(() => {
    const active = navGroups.find((g) => g.items.some((i) => i.href === pathname));
    if (active && !expandedGroups.has(active.label)) {
      setExpandedGroups((prev) => new Set(prev).add(active.label));
    }
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border transform transition-transform lg:translate-x-0 lg:static flex flex-col",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="p-5 border-b border-border flex items-center justify-between shrink-0">
        <Link to="/admin" className="flex items-center gap-2">
          {siteLogo ? (
            <img src={siteLogo} alt="Logo" className="h-7 max-w-[120px] object-contain" />
          ) : (
            <span className="font-semibold text-lg tracking-tight">後台管理</span>
          )}
        </Link>
        <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 min-h-0">
        {navGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.label);
          const isActiveGroup = group.items.some((i) => i.href === pathname);
          const isSingle = group.items.length === 1;

          if (isSingle) {
            const item = group.items[0];
            const isActive = pathname === item.href;
            return (
              <Link
                key={group.label}
                to={item.href}
                onClick={onClose}
                onMouseEnter={() => onPrefetch(item.href)}
                onFocus={() => onPrefetch(item.href)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <group.icon className="h-4 w-4 shrink-0" />
                {group.label}
              </Link>
            );
          }

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActiveGroup ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <group.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-90")} />
              </button>
              {isExpanded && (
                <div className="ml-4 pl-3 border-l border-border space-y-0.5 mt-0.5 mb-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        onMouseEnter={() => onPrefetch(item.href)}
                        onFocus={() => onPrefetch(item.href)}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-3 mt-2 border-t border-border">
          <Link
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4 shrink-0" />
            返回前台
          </Link>
        </div>
      </nav>
    </aside>
  );
});

/* ─── Top Bar (memoized) ─── */
const TopBar = memo(function TopBar({
  title,
  subtitle,
  onSignOut,
}: {
  title: string;
  subtitle?: string;
  onSignOut: () => void;
}) {
  return (
    <header className="hidden lg:flex items-center justify-between px-8 py-3 border-b border-border bg-card">
      <div>
        <h1 className="text-lg font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9 px-3">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs">
                A
              </div>
              <span className="text-sm">管理員</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onSignOut} className="text-destructive gap-2">
              <LogOut className="h-4 w-4" />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

/* ─── Inner Layout (reads context) ─── */
function AdminLayoutInner() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, user, isAdmin, isModerator } = useAdmin();
  const { siteLogo } = useSystemSettings();
  const { title, subtitle } = useAdminPageMeta();
  const queryClient = useQueryClient();

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

  useEffect(() => {
    if (loading || !user || (!isAdmin && !isModerator)) return;
    scheduleAdminWarmup(queryClient);
    prefetchAdminDestination(queryClient, location.pathname);
  }, [loading, user, isAdmin, isModerator, location.pathname, queryClient]);

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
        <span className="font-semibold text-sm">{title}</span>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </header>

      <div className="flex">
        <Sidebar
          pathname={location.pathname}
          siteLogo={siteLogo}
          isSidebarOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onPrefetch={(href) => prefetchAdminDestination(queryClient, href)}
        />

        <main className="flex-1 min-h-screen min-w-0">
          <TopBar title={title} subtitle={subtitle} onSignOut={handleSignOut} />
          <div className="p-5 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Route-level layout component (use as <Route element>) ─── */
export function AdminLayout() {
  return (
    <AdminPageProvider>
      <AdminLayoutInner />
    </AdminPageProvider>
  );
}
