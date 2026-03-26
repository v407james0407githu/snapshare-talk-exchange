import { useEffect, useState } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, Users, Crown, Loader2, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface RoleUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
}

const roleLabels: Record<string, string> = { user: "一般會員", moderator: "版主", admin: "管理員" };
const roleDescriptions: Record<string, string> = {
  admin: "擁有完整後台權限，可管理所有內容、會員與系統設定",
  moderator: "可管理社群內容，包含置頂/鎖定討論、隱藏作品與處理檢舉",
  user: "一般使用者，可發表作品、討論與市集商品",
};

export default function MemberRoles() {
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [changeDialog, setChangeDialog] = useState<{ open: boolean; user: RoleUser | null }>({ open: false, user: null });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { fetchRoleUsers(); }, []);

  async function fetchRoleUsers() {
    try {
      const [rolesRes, profilesRes] = await Promise.all([
        supabase.from("user_roles").select("user_id, role, created_at"),
        supabase.from("profiles").select("user_id, username, display_name, avatar_url"),
      ]);
      if (rolesRes.error) throw rolesRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profileMap = new Map(profilesRes.data?.map(p => [p.user_id, p]) || []);
      const mapped: RoleUser[] = (rolesRes.data || [])
        .filter(r => r.role !== "user")
        .map(r => {
          const p = profileMap.get(r.user_id);
          return {
            user_id: r.user_id,
            role: r.role,
            created_at: r.created_at,
            username: p?.username || "未知",
            display_name: p?.display_name || null,
            avatar_url: p?.avatar_url || null,
          };
        });
      setRoleUsers(mapped);
    } catch {
      toast.error("載入角色資料失敗");
    } finally {
      setLoading(false);
    }
  }

  const handleChangeRole = async (newRole: AppRole) => {
    if (!changeDialog.user) return;
    setActionLoading(true);
    const u = changeDialog.user;

    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", u.user_id);
    if (error) toast.error("變更角色失敗");
    else toast.success(`已將 ${u.username} 變更為${roleLabels[newRole]}`);

    setChangeDialog({ open: false, user: null });
    setActionLoading(false);
    fetchRoleUsers();
  };

  const admins = roleUsers.filter(u => u.role === "admin");
  const moderators = roleUsers.filter(u => u.role === "moderator");

  return (
    <AdminLayout title="權限角色" subtitle="管理管理員與版主角色分配">
      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {([
          { role: "admin", icon: Shield, count: admins.length, desc: roleDescriptions.admin },
          { role: "moderator", icon: Crown, count: moderators.length, desc: roleDescriptions.moderator },
          { role: "user", icon: Users, count: null, desc: roleDescriptions.user },
        ] as const).map(item => (
          <Card key={item.role}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-muted"><item.icon className="h-4 w-4 text-muted-foreground" /></div>
                <CardTitle className="text-base">{roleLabels[item.role]}</CardTitle>
                {item.count !== null && <Badge variant="secondary" className="ml-auto">{item.count}</Badge>}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admins */}
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Shield className="h-5 w-5" />管理員</h3>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : admins.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-xl mb-8">尚無管理員</div>
      ) : (
        <div className="border rounded-xl overflow-hidden mb-8">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>會員</TableHead>
                <TableHead className="w-28">指派時間</TableHead>
                <TableHead className="w-20 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm overflow-hidden shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-sm">{u.display_name || u.username}</span>
                        <span className="text-xs text-muted-foreground ml-2">@{u.username}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(u.created_at), "yyyy/MM/dd")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setChangeDialog({ open: true, user: u })}>
                      <UserCog className="h-3.5 w-3.5" />變更
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Moderators */}
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Crown className="h-5 w-5" />版主</h3>
      {loading ? null : moderators.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-xl">尚無版主</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>會員</TableHead>
                <TableHead className="w-28">指派時間</TableHead>
                <TableHead className="w-20 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {moderators.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm overflow-hidden shrink-0">
                        {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.username[0]?.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-sm">{u.display_name || u.username}</span>
                        <span className="text-xs text-muted-foreground ml-2">@{u.username}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(u.created_at), "yyyy/MM/dd")}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setChangeDialog({ open: true, user: u })}>
                      <UserCog className="h-3.5 w-3.5" />變更
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Role Change Dialog */}
      <Dialog open={changeDialog.open} onOpenChange={open => setChangeDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>變更角色</DialogTitle>
            <DialogDescription>將「{changeDialog.user?.username}」的角色變更為：</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 py-4">
            {(["user", "moderator", "admin"] as AppRole[]).map(role => (
              <Button key={role} variant={changeDialog.user?.role === role ? "default" : "outline"} className="flex-1" onClick={() => handleChangeRole(role)} disabled={actionLoading || changeDialog.user?.role === role}>
                {roleLabels[role]}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
