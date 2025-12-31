import { useEffect, useState } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_suspended: boolean | null;
  suspended_until: string | null;
  is_vip: boolean | null;
  created_at: string;
  role: AppRole;
}

const roleColors: Record<string, string> = {
  user: "bg-muted text-muted-foreground",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

const roleLabels: Record<string, string> = {
  user: "一般會員",
  moderator: "版主",
  admin: "管理員",
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "suspend" | "unsuspend" | "ban" | "changeRole";
    user: UserWithRole | null;
    newRole?: AppRole;
  }>({ open: false, type: "suspend", user: null });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r.role]) || []);

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => ({
        ...profile,
        role: roleMap.get(profile.user_id) || "user",
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("載入用戶列表失敗");
    } finally {
      setLoading(false);
    }
  }

  const getStatus = (user: UserWithRole) => {
    if (user.suspended_until && new Date(user.suspended_until) > new Date()) {
      return "banned";
    }
    if (user.is_suspended) {
      return "suspended";
    }
    return "active";
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const status = getStatus(user);
    const matchesStatus = statusFilter === "all" || status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleSuspend = async (user: UserWithRole) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: true })
      .eq("user_id", user.user_id);

    if (error) {
      toast.error("停權失敗");
    } else {
      toast.success(`已停權 ${user.username}`);
      fetchUsers();
    }
    setActionDialog({ open: false, type: "suspend", user: null });
  };

  const handleUnsuspend = async (user: UserWithRole) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: false, suspended_until: null })
      .eq("user_id", user.user_id);

    if (error) {
      toast.error("解除停權失敗");
    } else {
      toast.success(`已解除 ${user.username} 的停權`);
      fetchUsers();
    }
    setActionDialog({ open: false, type: "unsuspend", user: null });
  };

  const handleBan = async (user: UserWithRole) => {
    const banUntil = new Date();
    banUntil.setFullYear(banUntil.getFullYear() + 100); // Permanent ban

    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: true, suspended_until: banUntil.toISOString() })
      .eq("user_id", user.user_id);

    if (error) {
      toast.error("封禁失敗");
    } else {
      toast.success(`已永久封禁 ${user.username}`);
      fetchUsers();
    }
    setActionDialog({ open: false, type: "ban", user: null });
  };

  const handleChangeRole = async (user: UserWithRole, newRole: AppRole) => {
    // First check if user has a role entry
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.user_id)
      .single();

    let error;
    if (existingRole) {
      const result = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", user.user_id);
      error = result.error;
    } else {
      const result = await supabase
        .from("user_roles")
        .insert({ user_id: user.user_id, role: newRole });
      error = result.error;
    }

    if (error) {
      toast.error("變更角色失敗");
    } else {
      toast.success(`已將 ${user.username} 的角色變更為 ${roleLabels[newRole]}`);
      fetchUsers();
    }
    setActionDialog({ open: false, type: "changeRole", user: null });
  };

  return (
    <AdminLayout title="會員管理" subtitle="管理會員帳號、權限與狀態">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋會員名稱..."
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
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">載入中...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>會員</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead>加入時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const status = getStatus(user);
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-lg">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            user.username[0]?.toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{user.display_name || user.username}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          status === "active"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : status === "suspended"
                            ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        }
                      >
                        {status === "active" ? "正常" : status === "suspended" ? "停權中" : "永久封禁"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_vip && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">VIP</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(user.created_at), { addSuffix: true, locale: zhTW })}
                    </TableCell>
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
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: "changeRole",
                                user,
                              })
                            }
                          >
                            <Shield className="h-4 w-4" />
                            變更角色
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {status === "active" ? (
                            <DropdownMenuItem
                              className="gap-2 text-yellow-600"
                              onClick={() =>
                                setActionDialog({ open: true, type: "suspend", user })
                              }
                            >
                              <AlertTriangle className="h-4 w-4" />
                              停權
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2 text-green-600"
                              onClick={() =>
                                setActionDialog({ open: true, type: "unsuspend", user })
                              }
                            >
                              <CheckCircle className="h-4 w-4" />
                              解除停權
                            </DropdownMenuItem>
                          )}
                          {status !== "banned" && (
                            <DropdownMenuItem
                              className="gap-2 text-destructive"
                              onClick={() =>
                                setActionDialog({ open: true, type: "ban", user })
                              }
                            >
                              <Ban className="h-4 w-4" />
                              永久封禁
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {!loading && filteredUsers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          沒有找到符合條件的會員
        </div>
      )}

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "suspend" && "確認停權"}
              {actionDialog.type === "unsuspend" && "確認解除停權"}
              {actionDialog.type === "ban" && "確認永久封禁"}
              {actionDialog.type === "changeRole" && "變更用戶角色"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "suspend" &&
                `確定要停權用戶「${actionDialog.user?.username}」嗎？`}
              {actionDialog.type === "unsuspend" &&
                `確定要解除用戶「${actionDialog.user?.username}」的停權嗎？`}
              {actionDialog.type === "ban" &&
                `確定要永久封禁用戶「${actionDialog.user?.username}」嗎？此操作無法撤銷。`}
              {actionDialog.type === "changeRole" &&
                `選擇要將「${actionDialog.user?.username}」變更為的角色：`}
            </DialogDescription>
          </DialogHeader>

          {actionDialog.type === "changeRole" && (
            <div className="flex gap-2 py-4">
              {(["user", "moderator", "admin"] as AppRole[]).map((role) => (
                <Button
                  key={role}
                  variant={actionDialog.user?.role === role ? "default" : "outline"}
                  onClick={() => actionDialog.user && handleChangeRole(actionDialog.user, role)}
                >
                  {roleLabels[role]}
                </Button>
              ))}
            </div>
          )}

          {actionDialog.type !== "changeRole" && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionDialog({ ...actionDialog, open: false })}
              >
                取消
              </Button>
              <Button
                variant={actionDialog.type === "ban" ? "destructive" : "default"}
                onClick={() => {
                  if (!actionDialog.user) return;
                  if (actionDialog.type === "suspend") handleSuspend(actionDialog.user);
                  if (actionDialog.type === "unsuspend") handleUnsuspend(actionDialog.user);
                  if (actionDialog.type === "ban") handleBan(actionDialog.user);
                }}
              >
                確認
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
