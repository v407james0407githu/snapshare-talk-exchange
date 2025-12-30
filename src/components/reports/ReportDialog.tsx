import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Flag, AlertTriangle } from "lucide-react";

interface ReportDialogProps {
  contentType: "photo" | "comment" | "forum_topic" | "forum_reply" | "listing";
  contentId: string;
  reportedUserId?: string;
  trigger?: React.ReactNode;
}

const reportReasons = [
  { value: "inappropriate", label: "不當內容" },
  { value: "spam", label: "垃圾訊息 / 廣告" },
  { value: "harassment", label: "騷擾或霸凌" },
  { value: "copyright", label: "侵犯版權" },
  { value: "fraud", label: "詐騙或虛假資訊" },
  { value: "other", label: "其他" },
];

export function ReportDialog({
  contentType,
  contentId,
  reportedUserId,
  trigger,
}: ReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contentTypeLabels: Record<string, string> = {
    photo: "照片",
    comment: "評論",
    forum_topic: "論壇主題",
    forum_reply: "論壇回覆",
    listing: "商品",
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("請先登入");
      return;
    }

    if (!reason) {
      toast.error("請選擇檢舉原因");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        content_type: contentType,
        content_id: contentId,
        reported_user_id: reportedUserId,
        reason,
        description: description.trim() || null,
      });

      if (error) throw error;

      toast.success("檢舉已提交，我們會盡快審核");
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast.error("檢舉失敗，請稍後再試");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-destructive">
            <Flag className="h-4 w-4" />
            檢舉
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            檢舉{contentTypeLabels[contentType]}
          </DialogTitle>
          <DialogDescription>
            請選擇檢舉原因，我們會盡快審核處理
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>檢舉原因</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reportReasons.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="font-normal cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">補充說明（選填）</Label>
            <Textarea
              id="description"
              placeholder="請提供更多細節，幫助我們了解情況..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason}
          >
            {isSubmitting ? "提交中..." : "提交檢舉"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
