import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Shield,
} from "lucide-react";

interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role: "user" | "vip" | "moderator" | "admin";
  status: "active" | "suspended" | "banned";
  posts: number;
  photos: number;
  joinedAt: string;
  lastActive: string;
}

const users: User[] = [
  {
    id: "1",
    username: "攝影達人",
    email: "photo_master@email.com",
    avatar: "🎨",
    role: "vip",
    status: "active",
    posts: 234,
    photos: 89,
    joinedAt: "2023-06-15",
    lastActive: "10 分鐘前",
  },
  {
    id: "2",
    username: "山野客",
    email: "mountain@email.com",
    avatar: "🏔️",
    role: "user",
    status: "active",
    posts: 156,
    photos: 45,
    joinedAt: "2023-08-20",
    lastActive: "1 小時前",
  },
  {
    id: "3",
    username: "街拍手",
    email: "street@email.com",
    avatar: "📸",
    role: "moderator",
    status: "active",
    posts: 567,
    photos: 234,
    joinedAt: "2022-12-01",
    lastActive: "5 分鐘前",
  },
  {
    id: "4",
    username: "問題用戶",
    email: "trouble@email.com",
    avatar: "⚠️",
    role: "user",
    status: "suspended",
    posts: 23,
    photos: 5,
    joinedAt: "2024-01-10",
    lastActive: "3 天前",
  },
  {
    id: "5",
    username: "違規者",
    email: "banned@email.com",
    avatar: "🚫",
    role: "user",
    status: "banned",
    posts: 12,
    photos: 2,
    joinedAt: "2024-02-01",
    lastActive: "1 週前",
  },
];

const roleColors = {
  user: "bg-muted text-muted-foreground",
  vip: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const roleLabels = {
  user: "一般會員",
  vip: "VIP會員",
  moderator: "版主",
  admin: "管理員",
};

const statusColors = {
  active: "bg-green-500/10 text-green-600 border-green-500/20",
  suspended: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  banned: "bg-red-500/10 text-red-600 border-red-500/20",
};

const statusLabels = {
  active: "正常",
  suspended: "停權中",
  banned: "永久封禁",
};

const navItems = [
  { label: "總覽", href: "/admin", icon: LayoutDashboard },
  { label: "會員管理", href: "/admin/users", icon: Users },
  { label: "作品審核", href: "/admin/photos", icon: Image },
  { label: "討論管理", href: "/admin/forums", icon: MessageSquare },
  { label: "檢舉處理", href: "/admin/reports", icon: Flag },
  { label: "數據分析", href: "/admin/analytics", icon: BarChart3 },
  { label: "系統設定", href: "/admin/settings", icon: Settings },
];

export default function UserManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const location = useLocation();

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-serif font-bold">會員管理</span>
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
          <div className="p-6 lg:p-8">
            <div className="mb-8">
              <h1 className="font-serif text-2xl lg:text-3xl font-bold mb-2">
                會員<span className="text-gradient">管理</span>
              </h1>
              <p className="text-muted-foreground">
                管理會員帳號、權限與狀態
              </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋會員名稱或信箱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="角色篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有角色</SelectItem>
                  <SelectItem value="user">一般會員</SelectItem>
                  <SelectItem value="vip">VIP會員</SelectItem>
                  <SelectItem value="moderator">版主</SelectItem>
                  <SelectItem value="admin">管理員</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="狀態篩選" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有狀態</SelectItem>
                  <SelectItem value="active">正常</SelectItem>
                  <SelectItem value="suspended">停權中</SelectItem>
                  <SelectItem value="banned">永久封禁</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>會員</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>狀態</TableHead>
                    <TableHead className="text-center">發文數</TableHead>
                    <TableHead className="text-center">作品數</TableHead>
                    <TableHead>最後活動</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{user.avatar}</span>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[user.status]}>
                          {statusLabels[user.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{user.posts}</TableCell>
                      <TableCell className="text-center">{user.photos}</TableCell>
                      <TableCell className="text-muted-foreground">{user.lastActive}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                              <Eye className="h-4 w-4" />
                              查看詳情
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2">
                              <Shield className="h-4 w-4" />
                              變更角色
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {user.status === "active" ? (
                              <DropdownMenuItem className="gap-2 text-yellow-600">
                                <AlertTriangle className="h-4 w-4" />
                                停權一週
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem className="gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                解除停權
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2 text-destructive">
                              <Ban className="h-4 w-4" />
                              永久封禁
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                沒有找到符合條件的會員
              </div>
            )}
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
