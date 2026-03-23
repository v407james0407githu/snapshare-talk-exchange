import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Save, X, Plus, Trash2, ImagePlus, Loader2, GripVertical } from "lucide-react";

interface ContentBlock {
  id: string;
  section_key: string;
  section_label: string;
  content_type: string;
  content_value: string;
  content_meta: Record<string, any> | null;
  sort_order: number | null;
  is_active: boolean | null;
}

interface EditableContentPageProps {
  pageKey: string;        // e.g. "about", "contact", "terms", "privacy"
  pageTitle: string;      // 頁面標題
  pageDescription?: string;
}

export default function EditableContentPage({ pageKey, pageTitle, pageDescription }: EditableContentPageProps) {
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const prefix = `page_${pageKey}_`;

  const { data: blocks = [], isLoading } = useQuery({
    queryKey: ["page-content", pageKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content" as any)
        .select("*")
        .like("section_key", `${prefix}%`)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as ContentBlock[]) || [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const upsertMutation = useMutation({
    mutationFn: async (block: Partial<ContentBlock> & { section_key: string }) => {
      if (block.id) {
        const { error } = await supabase
          .from("site_content" as any)
          .update({
            content_value: block.content_value,
            section_label: block.section_label,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", block.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_content" as any)
          .insert({
            section_key: block.section_key,
            section_label: block.section_label || "內容區塊",
            content_type: block.content_type || "text",
            content_value: block.content_value || "",
            sort_order: block.sort_order ?? (blocks.length + 1) * 10,
            is_active: true,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content", pageKey] });
      setEditingBlockId(null);
      toast({ title: "已儲存" });
    },
    onError: (err: any) => {
      toast({ title: "儲存失敗", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("site_content" as any)
        .update({ is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page-content", pageKey] });
      toast({ title: "已刪除" });
    },
  });

  const handleUploadImage = useCallback(async (file: File) => {
    setUploading(true);
    try {
      // Resize image before upload for consistency
      const { resizeImage, getOutputExtension, getOutputMimeType } = await import("@/lib/imageResize");
      const resized = await resizeImage(file);
      const ext = getOutputExtension();
      const mimeType = getOutputMimeType();

      const path = `content/${pageKey}/${Date.now()}.${ext}`;
      console.log("[ContentUpload] uploading to path:", path, "size:", resized.blob.size, "type:", mimeType);

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("photos")
        .upload(path, resized.blob, { cacheControl: "3600", upsert: true, contentType: mimeType });

      if (uploadError) {
        console.error("[ContentUpload] upload error:", JSON.stringify(uploadError));
        throw uploadError;
      }
      console.log("[ContentUpload] upload success:", uploadData);

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      // Insert as image block
      const newKey = `${prefix}img_${Date.now()}`;
      await upsertMutation.mutateAsync({
        section_key: newKey,
        section_label: "圖片",
        content_type: "image",
        content_value: imageUrl,
        sort_order: (blocks.length + 1) * 10,
      });
    } catch (err: any) {
      console.error("[ContentUpload] full error:", err);
      toast({ title: "上傳失敗", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [pageKey, blocks.length, upsertMutation, toast]);

  const startEdit = (block: ContentBlock) => {
    setEditingBlockId(block.id);
    setEditValue(block.content_value);
    setEditLabel(block.section_label);
  };

  const saveEdit = (block: ContentBlock) => {
    upsertMutation.mutate({
      ...block,
      content_value: editValue,
      section_label: editLabel,
    });
  };

  const addTextBlock = () => {
    const newKey = `${prefix}text_${Date.now()}`;
    upsertMutation.mutate({
      section_key: newKey,
      section_label: "新段落",
      content_type: "text",
      content_value: "請在此輸入內容...",
      sort_order: (blocks.length + 1) * 10,
    });
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl py-10 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{pageTitle}</h1>
          {pageDescription && (
            <p className="text-muted-foreground text-lg">{pageDescription}</p>
          )}
          {isAdmin && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant={editing ? "default" : "outline"}
                size="sm"
                onClick={() => setEditing(!editing)}
                className="gap-2"
              >
                {editing ? <><X className="h-4 w-4" /> 退出編輯</> : <><Pencil className="h-4 w-4" /> 編輯頁面</>}
              </Button>
            </div>
          )}
        </div>

        {/* Content Blocks */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : blocks.length === 0 && !editing ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>此頁面尚無內容。</p>
            {isAdmin && <p className="mt-2 text-sm">點擊上方「編輯頁面」按鈕開始新增內容。</p>}
          </div>
        ) : (
          <div className="space-y-6">
            {blocks.map((block) => (
              <div key={block.id} className="group relative">
                {editing && editingBlockId === block.id ? (
                  /* Editing mode */
                  <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 space-y-3">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="區塊標題（可選）"
                      className="text-sm font-medium"
                    />
                    {block.content_type === "image" ? (
                      <div>
                        <img src={editValue} alt="" className="max-h-64 rounded-lg object-contain" />
                        <p className="text-xs text-muted-foreground mt-2">圖片區塊 — 刪除後重新上傳以更換</p>
                      </div>
                    ) : (
                      <Textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        rows={8}
                        className="min-h-[120px] text-base leading-relaxed"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEdit(block)} disabled={upsertMutation.isPending} className="gap-1">
                        <Save className="h-3.5 w-3.5" /> 儲存
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingBlockId(null)}>取消</Button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="relative">
                    {editing && (
                      <div className="absolute -left-10 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(block)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive"
                          onClick={() => {
                            if (confirm("確定要刪除此區塊嗎？")) deleteMutation.mutate(block.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {block.content_type === "image" ? (
                      <figure className="my-4">
                        <img
                          src={block.content_value}
                          alt={block.section_label}
                          className="w-full rounded-xl object-cover max-h-[500px]"
                          loading="lazy"
                        />
                        {block.section_label && block.section_label !== "圖片" && (
                          <figcaption className="mt-2 text-sm text-muted-foreground text-center">
                            {block.section_label}
                          </figcaption>
                        )}
                      </figure>
                    ) : (
                      <div className={`${editing ? "cursor-pointer hover:bg-accent/30 rounded-lg p-3 -m-3 transition-colors" : ""}`}
                           onClick={() => editing && startEdit(block)}>
                        {block.section_label && !block.section_label.startsWith("新段落") && block.section_label !== "內容區塊" && (
                          <h2 className="text-xl font-semibold text-foreground mb-2">{block.section_label}</h2>
                        )}
                        <div className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-base">
                          {block.content_value}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Admin: Add content */}
        {editing && (
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            <Button variant="outline" size="sm" onClick={addTextBlock} className="gap-2">
              <Plus className="h-4 w-4" /> 新增文字段落
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              上傳圖片
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadImage(file);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
