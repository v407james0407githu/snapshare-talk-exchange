import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, MoreHorizontal, Ban, CheckCircle, AlertTriangle, Shield, Users, Crown, UserX, Star, Loader2 } from "lucide-react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  suspension_reason: string | null;
  is_vip: boolean | null;
  is_verified: boolean | null;
  warning_count: number | null;
  created_at: string;
  role: AppRole;
  email?: string;
}

const roleLabels: Record<string, string> = { user: "一般會員", moderator: "版主", admin: "管理員" };

async function fetchAllUsers(): Promise<UserWithRole[]> {
  const [profilesRes, rolesRes, emailsRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
    supabase.rpc("get_user_emails"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;

  const roleMap = new Map(rolesRes.data?.map(r => [r.user_id, r.role]) || []);
  const emailMap = new Map((emailsRes.data as { user_id: string; email: string }[] || []).map(e => [e.user_id, e.email]));

  return (profilesRes.data || []).map(p => ({
    ...p,
    role: roleMap.get(p.user_id) || "user",
    email: emailMap.get(p.user_id) || "",
  }));
}

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);

  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchAllUsers,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Suspend dialog
  const [suspendDialog, setSuspendDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
    type: "suspend" | "unsuspend" | "ban";
    duration: string;
    reason: string;
  }>({ open: false, user: null, type: "suspend", duration: "7", reason: "" });

  // Role dialog
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    user: UserWithRole | null;
  }>({ open: false, user: null });

  const getStatus = (u: UserWithRole) => {
    if (u.suspended_until && new Date(u.suspended_until) > new Date()) {
      const far = new Date();
      far.setFullYear(far.getFullYear() + 50);
      return new Date(u.suspended_until) > far ? "banned" : "suspended";
    }
    if (u.is_suspended) return "suspended";
    return "active";
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchSearch = u.username.toLowerCase().includes(q) || (u.display_name?.toLowerCase().includes(q) ?? false) || (u.email?.toLowerCase().includes(q) ?? false);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || getStatus(u) === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const stats = {
    total: users.length,
    admin: users.filter(u => u.role === "admin").length,
    moderator: users.filter(u => u.role === "moderator").length,
    suspended: users.filter(u => getStatus(u) !== "active").length,
    vip: users.filter(u => u.is_vip).length,
  };

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const handleSuspend = async () => {
    if (!suspendDialog.user) return;
    setActionLoading(true);
    const u = suspendDialog.user;

    if (suspendDialog.type === "unsuspend") {
      const { error } = await supabase.from("profiles").update({ is_suspended: false, suspended_until: null, suspension_reason: null }).eq("user_id", u.user_id);
      if (error) toast.error("解除停權失敗");
      else toast.success(`已解除 ${u.username} 的停權`);
    } else {
      const until = new Date();
      if (suspendDialog.type === "ban") {
        until.setFullYear(until.getFullYear() + 100);
      } else {
        until.setDate(until.getDate() + parseInt(suspendDialog.duration));
      }
      const { error } = await supabase.from("profiles").update({
        is_suspended: true,
        suspended_until: until.toISOString(),
        suspension_reason: suspendDialog.reason || null,
      }).eq("user_id", u.user_id);
      if (error) toast.error("停權失敗");
      else toast.success(suspendDialog.type === "ban" ? `已永久封禁 ${u.username}` : `已停權 ${u.username} ${suspendDialog.duration} 天`);
    }

    setSuspendDialog({ open: false, user: null, type: "suspend", duration: "7", reason: "" });
    setActionLoading(false);
    invalidate();
  };

  const handleChangeRole = async (newRole: AppRole) => {
    if (!roleDialog.user) return;
    setActionLoading(true);
    const u = roleDialog.user;

    const { data: existing } = await supabase.from("user_roles").select("id").eq("user_id", u.user_id).maybeSingle();
    const { error } = existing
      ? await supabase.from("user_roles").update({ role: newRole }).eq("user_id", u.user_id)
      : await supabase.from("user_roles").insert({ user_id: u.user_id, role: newRole });

    if (error) toast.error("變更角色失敗");
    else toast.success(`已將 ${u.username} 變更為${roleLabels[newRole]}`);

    setRoleDialog({ open: false, user: null });
    setActionLoading(false);
    invalidate();
  };

  const toggleVip = async (u: UserWithRole) => {
    const newVal = !u.is_vip;
    const { error } = await supabase.from("profiles").update({ is_vip: newVal }).eq("user_id", u.user_id);
    if (error) toast.error("更新 VIP 失敗");
    else {
      toast.success(newVal ? `已設定 ${u.username} 為 VIP` : `已取消 ${u.username} 的 VIP`);
      queryClient.setQueryData<UserWithRole[]>(["admin-users"], old =>
        old?.map(p => p.user_id === u.user_id ? { ...p, is_vip: newVal } : p) ?? []
      );
    }
  };

  const statusBadge = (status: string) => {
    if (status === "active") return <Badge variant="outline" className="border-primary/30 text-primary">正常</Badge>;
    if (status === "suspended") return <Badge variant="outline" className="border-destructive/30 text-destructive">停權中</Badge>;
    return <Badge variant="destructive">永久封禁</Badge>;
  };

  useAdminPage("會員管理", "管理會員帳號、角色、VIP 與停權狀態");

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: "總會員", value: stats.total, icon: Users },
          { label: "管理員", value: stats.admin, icon: Shield },
          { label: "版主", value: stats.moderator, icon: Shield },
          { label: "VIP", value: stats.vip, icon: Crown },
          { label: "停權/封禁", value: stats.suspended, icon: UserX },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><s.icon className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜尋會員名稱或 Email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有角色</SelectItem>
            <SelectItem value="user">一般會員</SelectItem>
            <SelectItem value="moderator">版主</SelectItem>
            <SelectItem value="admin">管理員</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="active">正常</SelectItem>
            <SelectItem value="suspended">停權中</SelectItem>
            <SelectItem value="banned">永久封禁</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="min-w-[200px]">會員</TableHead>
                <TableHead className="min-w-[180px]">Email</TableHead>
                <TableHead className="w-24 text-center">角色</TableHead>
                <TableHead className="w-24 text-center">狀態</TableHead>
                <TableHead className="w-16 text-center">VIP</TableHead>
                <TableHead className="w-16 text-center">警告</TableHead>
                <TableHead className="w-28">加入時間</TableHead>
                <TableHead className="w-16 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => {
                const status = getStatus(user);
                return (
                  <TableRow key={user.id} className={status !== "active" ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0 overflow-hidden">
                          {user.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" /> : user.username[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{user.display_name || user.username}</div>
                          <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm text-muted-foreground truncate block">{user.email}</span></TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{roleLabels[user.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{statusBadge(status)}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={!!user.is_vip} onCheckedChange={() => toggleVip(user)} />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`text-sm font-medium ${(user.warning_count ?? 0) >= 3 ? "text-destructive" : (user.warning_count ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground"}`}>
                        {user.warning_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(user.created_at), "yyyy/MM/dd")}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => setRoleDialog({ open: true, user })}>
                            <Shield className="h-4 w-4" />變更角色
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {status === "active" ? (
                            <>
                              <DropdownMenuItem className="gap-2" onClick={() => setSuspendDialog({ open: true, user, type: "suspend", duration: "7", reason: "" })}>
                                <AlertTriangle className="h-4 w-4" />停權
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setSuspendDialog({ open: true, user, type: "ban", duration: "0", reason: "" })}>
                                <Ban className="h-4 w-4" />永久封禁
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem className="gap-2" onClick={() => setSuspendDialog({ open: true, user, type: "unsuspend", duration: "0", reason: "" })}>
                              <CheckCircle className="h-4 w-4" />解除停權
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
        <div className="text-center py-12 text-muted-foreground">沒有找到符合條件的會員</div>
      )}

      {/* Suspend/Ban Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={open => setSuspendDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {suspendDialog.type === "suspend" && "停權會員"}
              {suspendDialog.type === "unsuspend" && "解除停權"}
              {suspendDialog.type === "ban" && "永久封禁"}
            </DialogTitle>
            <DialogDescription>
              {suspendDialog.type === "unsuspend"
                ? `確定要解除「${suspendDialog.user?.username}」的停權嗎？`
                : suspendDialog.type === "ban"
                ? `確定要永久封禁「${suspendDialog.user?.username}」嗎？此操作需手動解除。`
                : `設定「${suspendDialog.user?.username}」的停權期限與原因：`
              }
            </DialogDescription>
          </DialogHeader>
          {suspendDialog.type === "suspend" && (
            <div className="space-y-4 py-2">
              <div>
                <Label>停權天數</Label>
                <Select value={suspendDialog.duration} onValueChange={v => setSuspendDialog(prev => ({ ...prev, duration: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 天</SelectItem>
                    <SelectItem value="3">3 天</SelectItem>
                    <SelectItem value="7">7 天</SelectItem>
                    <SelectItem value="14">14 天</SelectItem>
                    <SelectItem value="30">30 天</SelectItem>
                    <SelectItem value="90">90 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>停權原因</Label>
                <Textarea placeholder="請輸入停權原因..." value={suspendDialog.reason} onChange={e => setSuspendDialog(prev => ({ ...prev, reason: e.target.value }))} />
              </div>
            </div>
          )}
          {suspendDialog.type === "ban" && (
            <div className="py-2">
              <Label>封禁原因</Label>
              <Textarea placeholder="請輸入封禁原因..." value={suspendDialog.reason} onChange={e => setSuspendDialog(prev => ({ ...prev, reason: e.target.value }))} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(prev => ({ ...prev, open: false }))}>取消</Button>
            <Button variant={suspendDialog.type === "ban" ? "destructive" : "default"} onClick={handleSuspend} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialog.open} onOpenChange={open => setRoleDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>變更角色</DialogTitle>
            <DialogDescription>選擇要將「{roleDialog.user?.username}」變更為的角色：</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 py-4">
            {(["user", "moderator", "admin"] as AppRole[]).map(role => (
              <Button key={role} variant={roleDialog.user?.role === role ? "default" : "outline"} className="flex-1" onClick={() => handleChangeRole(role)} disabled={actionLoading || roleDialog.user?.role === role}>
                {roleLabels[role]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
