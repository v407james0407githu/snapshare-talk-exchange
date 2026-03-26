import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Image, MessageSquare, Eye, CheckCircle, XCircle, ExternalLink, ShoppingBag, AlertTriangle, Search, Loader2, Flag, Clock, Ban } from "lucide-react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useAdmin } from "@/hooks/useAdmin";

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
  reporter_id: string;
  reported_user_id: string | null;
  reporter_name?: string;
  reported_user_name?: string;
}

const statusLabels: Record<string, string> = { pending: "待處理", resolved: "已處理", dismissed: "已駁回" };
const contentTypeLabels: Record<string, string> = { photo: "照片", comment: "留言", forum_topic: "討論主題", forum_reply: "討論回覆", listing: "商品" };
const reasonLabels: Record<string, string> = { spam: "垃圾訊息", harassment: "騷擾行為", inappropriate: "不當內容", copyright: "版權問題", other: "其他" };

const contentTypeIcons: Record<string, typeof Image> = { photo: Image, comment: MessageSquare, forum_topic: MessageSquare, forum_reply: MessageSquare, listing: ShoppingBag };

export default function ReportManagement() {
  const { user } = useAdmin();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    report: Report | null;
    action: "resolve" | "dismiss" | "hide" | "warn";
  }>({ open: false, report: null, action: "resolve" });
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => { fetchReports(); }, [statusFilter, typeFilter]);

  async function fetchReports() {
    setLoading(true);
    try {
      let query = supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (typeFilter !== "all") query = query.eq("content_type", typeFilter);

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const allIds = [...new Set([...data.map(r => r.reporter_id), ...data.filter(r => r.reported_user_id).map(r => r.reported_user_id!)])];
        const profileMap = new Map<string, string>();
        if (allIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", allIds);
          profiles?.forEach(p => profileMap.set(p.user_id, p.display_name || p.username));
        }
        setReports(data.map(r => ({
          ...r,
          reporter_name: profileMap.get(r.reporter_id) || "未知",
          reported_user_name: r.reported_user_id ? profileMap.get(r.reported_user_id) || "未知" : undefined,
        })));
      }
    } catch {
      toast.error("載入檢舉記錄失敗");
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async () => {
    if (!actionDialog.report || !user) return;
    setActionLoading(true);
    const { report, action } = actionDialog;

    try {
      if (action === "warn" && report.reported_user_id) {
        const { data: profile } = await supabase.from("profiles").select("warning_count").eq("user_id", report.reported_user_id).single();
        const newCount = (profile?.warning_count || 0) + 1;
        await supabase.from("profiles").update({ warning_count: newCount }).eq("user_id", report.reported_user_id);

        // Auto-suspend at 3 warnings
        if (newCount >= 3) {
          const until = new Date();
          until.setDate(until.getDate() + 7);
          await supabase.from("profiles").update({
            is_suspended: true, suspended_until: until.toISOString(),
            suspension_reason: `累計 ${newCount} 次警告，自動停權 7 天`,
          }).eq("user_id", report.reported_user_id);
        }

        await supabase.from("reports").update({
          status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id,
          resolution_note: resolutionNote || "已對用戶發出警告",
        }).eq("id", report.id);
        toast.success(`已對用戶發出警告（累計 ${newCount} 次）`);
      } else if (action === "hide") {
        const tableMap: Record<string, string> = { photo: "photos", comment: "comments", forum_topic: "forum_topics", forum_reply: "forum_replies", listing: "marketplace_listings" };
        const table = tableMap[report.content_type];
        if (table) await supabase.from(table as any).update({ is_hidden: true } as any).eq("id", report.content_id);

        await supabase.from("reports").update({
          status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id,
          resolution_note: resolutionNote || "內容已隱藏",
        }).eq("id", report.id);
        toast.success("內容已隱藏，檢舉已處理");
      } else if (action === "resolve") {
        await supabase.from("reports").update({
          status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id,
          resolution_note: resolutionNote || "已處理",
        }).eq("id", report.id);
        toast.success("檢舉已標記為已處理");
      } else if (action === "dismiss") {
        await supabase.from("reports").update({
          status: "dismissed", resolved_at: new Date().toISOString(), resolved_by: user.id,
          resolution_note: resolutionNote || "檢舉不成立",
        }).eq("id", report.id);
        toast.success("檢舉已駁回");
      }

      setActionDialog({ open: false, report: null, action: "resolve" });
      setResolutionNote("");
      fetchReports();
    } catch {
      toast.error("操作失敗");
    } finally {
      setActionLoading(false);
    }
  };

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === "pending").length,
    resolved: reports.filter(r => r.status === "resolved").length,
    dismissed: reports.filter(r => r.status === "dismissed").length,
  };

  const filteredReports = searchQuery
    ? reports.filter(r => r.reporter_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.reported_user_name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : reports;

  const getContentUrl = (r: Report) => {
    const map: Record<string, string> = { photo: `/gallery/${r.content_id}`, forum_topic: `/forums/${r.content_id}`, listing: `/marketplace/${r.content_id}` };
    return map[r.content_type];
  };

  return (
    <AdminLayout title="檢舉處理中心" subtitle="審核和處理用戶提交的檢舉，維護社群秩序">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "全部檢舉", value: stats.total, icon: Flag },
          { label: "待處理", value: stats.pending, icon: Clock },
          { label: "已處理", value: stats.resolved, icon: CheckCircle },
          { label: "已駁回", value: stats.dismissed, icon: XCircle },
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
          <Input placeholder="搜尋檢舉人或被檢舉人..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="pending">待處理</SelectItem>
            <SelectItem value="resolved">已處理</SelectItem>
            <SelectItem value="dismissed">已駁回</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有類型</SelectItem>
            <SelectItem value="photo">照片</SelectItem>
            <SelectItem value="comment">留言</SelectItem>
            <SelectItem value="forum_topic">討論主題</SelectItem>
            <SelectItem value="forum_reply">討論回覆</SelectItem>
            <SelectItem value="listing">商品</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl">沒有找到符合條件的檢舉記錄</div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-20 text-center">類型</TableHead>
                <TableHead className="min-w-[120px]">原因</TableHead>
                <TableHead className="min-w-[100px]">檢舉人</TableHead>
                <TableHead className="min-w-[100px]">被檢舉人</TableHead>
                <TableHead className="min-w-[150px]">描述</TableHead>
                <TableHead className="w-24 text-center">狀態</TableHead>
                <TableHead className="w-28">時間</TableHead>
                <TableHead className="w-48 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map(report => {
                const Icon = contentTypeIcons[report.content_type] || Eye;
                return (
                  <TableRow key={report.id}>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">{contentTypeLabels[report.content_type] || report.content_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{reasonLabels[report.reason] || report.reason}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{report.reporter_name}</TableCell>
                    <TableCell className="text-sm">{report.reported_user_name || "-"}</TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground line-clamp-2">{report.description || "-"}</p>
                      {report.resolution_note && (
                        <p className="text-xs text-primary mt-1 line-clamp-1">處理：{report.resolution_note}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={report.status === "pending" ? "outline" : "secondary"} className={`text-xs ${report.status === "pending" ? "border-amber-500/30 text-amber-600" : ""}`}>
                        {statusLabels[report.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(report.created_at), "MM/dd HH:mm")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {getContentUrl(report) && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => window.open(getContentUrl(report), "_blank")}>
                            <ExternalLink className="h-3 w-3" />查看
                          </Button>
                        )}
                        {report.status === "pending" && (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-destructive" onClick={() => setActionDialog({ open: true, report, action: "hide" })}>
                              <XCircle className="h-3 w-3" />隱藏
                            </Button>
                            {report.reported_user_id && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setActionDialog({ open: true, report, action: "warn" })}>
                                <AlertTriangle className="h-3 w-3" />警告
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setActionDialog({ open: true, report, action: "resolve" })}>
                              <CheckCircle className="h-3 w-3" />處理
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => setActionDialog({ open: true, report, action: "dismiss" })}>
                              駁回
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={open => { setActionDialog(prev => ({ ...prev, open })); if (!open) setResolutionNote(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "hide" && "確認隱藏內容"}
              {actionDialog.action === "resolve" && "標記為已處理"}
              {actionDialog.action === "dismiss" && "駁回檢舉"}
              {actionDialog.action === "warn" && "對用戶發出警告"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "hide" && "這將隱藏被檢舉的內容，其他用戶將無法看到。"}
              {actionDialog.action === "resolve" && "將此檢舉標記為已處理（不隱藏內容）。"}
              {actionDialog.action === "dismiss" && "駁回此檢舉，判定內容沒有違規。"}
              {actionDialog.action === "warn" && "對被檢舉用戶發出警告通知，累計 3 次將自動停權 7 天。"}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-2 block">處理備註（選填）</label>
            <Textarea placeholder="輸入處理備註..." value={resolutionNote} onChange={e => setResolutionNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(prev => ({ ...prev, open: false })); setResolutionNote(""); }}>取消</Button>
            <Button variant={actionDialog.action === "hide" || actionDialog.action === "warn" ? "destructive" : "default"} onClick={handleAction} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
