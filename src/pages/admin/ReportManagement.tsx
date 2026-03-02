import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Image,
  MessageSquare,
  Eye,
  CheckCircle,
  XCircle,
  ExternalLink,
  ShoppingBag,
  AlertTriangle,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
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
  reporter_profile?: {
    username: string;
  };
  reported_user_profile?: {
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

const reasonLabels: Record<string, string> = {
  spam: "垃圾訊息",
  harassment: "騷擾行為",
  inappropriate: "不當內容",
  copyright: "版權問題",
  other: "其他",
};

export default function ReportManagement() {
  const { user } = useAdmin();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    report: Report | null;
    action: "resolve" | "dismiss" | "hide" | "warn";
  }>({ open: false, report: null, action: "resolve" });
  const [resolutionNote, setResolutionNote] = useState("");

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter]);

  async function fetchReports() {
    try {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (typeFilter !== "all") {
        query = query.eq("content_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles for reporters and reported users
      if (data) {
        const reporterIds = [...new Set(data.map((r) => r.reporter_id))];
        const reportedIds = [...new Set(data.filter((r) => r.reported_user_id).map((r) => r.reported_user_id!))];
        const allIds = [...new Set([...reporterIds, ...reportedIds])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", allIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        const reportsWithProfiles = data.map((report) => ({
          ...report,
          reporter_profile: profileMap.get(report.reporter_id),
          reported_user_profile: report.reported_user_id
            ? profileMap.get(report.reported_user_id)
            : undefined,
        }));

        setReports(reportsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("載入檢舉記錄失敗");
    } finally {
      setLoading(false);
    }
  }

  const handleAction = async () => {
    if (!actionDialog.report || !user) return;

    const { report, action } = actionDialog;

    try {
      if (action === "warn") {
        // Warn the reported user: increment warning_count
        if (report.reported_user_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("warning_count")
            .eq("user_id", report.reported_user_id)
            .single();

          const newCount = (profile?.warning_count || 0) + 1;
          await supabase
            .from("profiles")
            .update({ warning_count: newCount })
            .eq("user_id", report.reported_user_id);

          // Send notification to warned user
          await supabase.from("notifications").insert({
            user_id: report.reported_user_id,
            type: "warning",
            title: "您收到一則警告",
            content: resolutionNote || "您的內容因違反社群規範而收到警告，請注意遵守規則。",
            related_type: report.content_type,
            related_id: report.content_id,
          });

          // Auto-suspend if warnings >= 3
          if (newCount >= 3) {
            const suspendUntil = new Date();
            suspendUntil.setDate(suspendUntil.getDate() + 7);
            await supabase
              .from("profiles")
              .update({
                is_suspended: true,
                suspended_until: suspendUntil.toISOString(),
                suspension_reason: `累計 ${newCount} 次警告，自動停權 7 天`,
              })
              .eq("user_id", report.reported_user_id);
          }
        }

        // Mark report as resolved
        await supabase
          .from("reports")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            resolution_note: resolutionNote || "已對用戶發出警告",
          })
          .eq("id", report.id);

        toast.success("已對用戶發出警告");
      } else if (action === "hide") {
        // Hide the content based on type
        if (report.content_type === "photo") {
          await supabase.from("photos").update({ is_hidden: true }).eq("id", report.content_id);
        } else if (report.content_type === "comment") {
          await supabase.from("comments").update({ is_hidden: true }).eq("id", report.content_id);
        } else if (report.content_type === "forum_topic") {
          await supabase.from("forum_topics").update({ is_hidden: true }).eq("id", report.content_id);
        } else if (report.content_type === "forum_reply") {
          await supabase.from("forum_replies").update({ is_hidden: true }).eq("id", report.content_id);
        } else if (report.content_type === "listing") {
          await supabase.from("marketplace_listings").update({ is_hidden: true }).eq("id", report.content_id);
        }

        await supabase
          .from("reports")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            resolution_note: resolutionNote || "內容已隱藏",
          })
          .eq("id", report.id);

        toast.success("內容已隱藏，檢舉已處理");
      } else if (action === "resolve") {
        await supabase
          .from("reports")
          .update({
            status: "resolved",
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            resolution_note: resolutionNote || "已處理",
          })
          .eq("id", report.id);

        toast.success("檢舉已標記為已處理");
      } else if (action === "dismiss") {
        await supabase
          .from("reports")
          .update({
            status: "dismissed",
            resolved_at: new Date().toISOString(),
            resolved_by: user.id,
            resolution_note: resolutionNote || "檢舉不成立",
          })
          .eq("id", report.id);

        toast.success("檢舉已駁回");
      }

      setActionDialog({ open: false, report: null, action: "resolve" });
      setResolutionNote("");
      fetchReports();
    } catch (error) {
      console.error("Error handling report:", error);
      toast.error("操作失敗");
    }
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case "photo":
        return <Image className="h-5 w-5" />;
      case "comment":
      case "forum_topic":
      case "forum_reply":
        return <MessageSquare className="h-5 w-5" />;
      case "listing":
        return <ShoppingBag className="h-5 w-5" />;
      default:
        return <Eye className="h-5 w-5" />;
    }
  };

  return (
    <AdminLayout title="檢舉處理" subtitle="審核和處理用戶提交的檢舉">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="狀態篩選" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="pending">待處理</SelectItem>
            <SelectItem value="resolved">已處理</SelectItem>
            <SelectItem value="dismissed">已駁回</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="類型篩選" />
          </SelectTrigger>
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

      {/* Reports List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
            載入中...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground">
            沒有找到符合條件的檢舉記錄
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="bg-card rounded-xl border border-border p-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-muted">
                  {getContentIcon(report.content_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant="outline">
                      {contentTypeLabels[report.content_type] || report.content_type}
                    </Badge>
                    <Badge variant="outline" className={statusColors[report.status]}>
                      {statusLabels[report.status]}
                    </Badge>
                    <Badge variant="outline">
                      {reasonLabels[report.reason] || report.reason}
                    </Badge>
                  </div>

                  <p className="text-sm mb-2">
                    <span className="text-muted-foreground">檢舉人：</span>
                    <span className="font-medium">{report.reporter_profile?.username || "未知"}</span>
                    {report.reported_user_profile && (
                      <>
                        <span className="text-muted-foreground"> → 被檢舉：</span>
                        <span className="font-medium">{report.reported_user_profile.username}</span>
                      </>
                    )}
                  </p>

                  {report.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {report.description}
                    </p>
                  )}

                  {report.resolution_note && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="text-foreground">處理備註：</span>
                      {report.resolution_note}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(report.created_at), {
                      addSuffix: true,
                      locale: zhTW,
                    })}
                    {report.resolved_at && (
                      <>
                        {" "}
                        · 處理於{" "}
                        {formatDistanceToNow(new Date(report.resolved_at), {
                          addSuffix: true,
                          locale: zhTW,
                        })}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // Navigate to content based on type
                      const urlMap: Record<string, string> = {
                        photo: `/gallery/${report.content_id}`,
                        forum_topic: `/forums/${report.content_id}`,
                        listing: `/marketplace/${report.content_id}`,
                      };
                      const url = urlMap[report.content_type];
                      if (url) {
                        window.open(url, "_blank");
                      }
                    }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    查看內容
                  </Button>

                  {report.status === "pending" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() =>
                          setActionDialog({ open: true, report, action: "hide" })
                        }
                      >
                        <XCircle className="h-4 w-4" />
                        隱藏內容
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() =>
                          setActionDialog({ open: true, report, action: "resolve" })
                        }
                      >
                        <CheckCircle className="h-4 w-4" />
                        已處理
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() =>
                          setActionDialog({ open: true, report, action: "dismiss" })
                        }
                      >
                        駁回
                      </Button>
                      {report.reported_user_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() =>
                            setActionDialog({ open: true, report, action: "warn" })
                          }
                        >
                          <AlertTriangle className="h-4 w-4" />
                          警告用戶
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => {
          setActionDialog({ ...actionDialog, open });
          if (!open) setResolutionNote("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "hide" && "確認隱藏內容"}
              {actionDialog.action === "resolve" && "標記為已處理"}
              {actionDialog.action === "dismiss" && "駁回檢舉"}
              {actionDialog.action === "warn" && "對用戶發出警告"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "hide" &&
                "這將隱藏被檢舉的內容，其他用戶將無法看到。"}
              {actionDialog.action === "resolve" &&
                "將此檢舉標記為已處理（不隱藏內容）。"}
              {actionDialog.action === "dismiss" &&
                "駁回此檢舉，判定內容沒有違規。"}
              {actionDialog.action === "warn" &&
                "對被檢舉用戶發出警告通知，累計 3 次警告將自動停權 7 天。"}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">處理備註（選填）</label>
            <Textarea
              placeholder="輸入處理備註..."
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ ...actionDialog, open: false });
                setResolutionNote("");
              }}
            >
              取消
            </Button>
            <Button
              variant={actionDialog.action === "hide" || actionDialog.action === "warn" ? "destructive" : "default"}
              onClick={handleAction}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
