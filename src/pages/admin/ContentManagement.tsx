import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Save, Image, Type, FileText, Loader2, Search, Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SiteContent {
  id: string;
  section_key: string;
  section_label: string;
  content_type: string;
  content_value: string;
  content_meta: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  html: <FileText className="h-4 w-4" />,
};

const typeLabels: Record<string, string> = {
  text: "文字",
  image: "圖片",
  html: "HTML",
  json: "JSON",
};

// Group sections by prefix
function groupContents(contents: SiteContent[]) {
  const groups: Record<string, SiteContent[]> = {};
  contents.forEach((c) => {
    const prefix = c.section_key.split("_")[0];
    const groupName = {
      hero: "首頁橫幅",
      cta: "CTA 行動呼籲",
      gallery: "作品分享區",
      forum: "討論區",
      featured: "精選作品",
      footer: "頁尾",
      site: "全站設定",
    }[prefix] || "其他";
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(c);
  });
  return groups;
}

export default function ContentManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editingItem, setEditingItem] = useState<SiteContent | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editMeta, setEditMeta] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    section_key: "",
    section_label: "",
    content_type: "text",
    content_value: "",
    sort_order: 0,
  });

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as unknown as SiteContent[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content_value, content_meta, is_active }: { id: string; content_value: string; content_meta: Record<string, any>; is_active: boolean }) => {
      const { error } = await supabase
        .from("site_content" as any)
        .update({
          content_value,
          content_meta,
          is_active,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      queryClient.invalidateQueries({ queryKey: ["site-content"] });
      toast.success("內容已更新");
      setEditingItem(null);
    },
    onError: () => toast.error("更新失敗"),
  });

  const createMutation = useMutation({
    mutationFn: async (values: typeof newForm) => {
      const { error } = await supabase
        .from("site_content" as any)
        .insert({
          ...values,
          content_meta: {},
          is_active: true,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      toast.success("已新增內容項目");
      setAddDialogOpen(false);
      setNewForm({ section_key: "", section_label: "", content_type: "text", content_value: "", sort_order: 0 });
    },
    onError: () => toast.error("新增失敗"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("site_content" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      toast.success("已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });

  const openEdit = (item: SiteContent) => {
    setEditingItem(item);
    setEditValue(item.content_value);
    setEditMeta(JSON.stringify(item.content_meta, null, 2));
    setEditActive(item.is_active);
  };

  const handleSave = () => {
    if (!editingItem) return;
    let meta = {};
    try {
      meta = JSON.parse(editMeta || "{}");
    } catch {
      toast.error("Meta JSON 格式錯誤");
      return;
    }
    updateMutation.mutate({
      id: editingItem.id,
      content_value: editValue,
      content_meta: meta,
      is_active: editActive,
    });
  };

  const filtered = contents.filter(
    (c) =>
      c.section_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content_value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = groupContents(filtered);

  return (
    <AdminLayout title="內容管理" subtitle="管理頁面文字、圖片與版位設定">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋內容項目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新增項目
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName}>
              <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                {groupName}
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </h2>
              <div className="grid gap-3">
                {items.map((item) => (
                  <Card key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        {typeIcons[item.content_type] || <Type className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{item.section_label}</span>
                          <Badge variant="outline" className="text-[10px]">{typeLabels[item.content_type] || item.content_type}</Badge>
                          {!item.is_active && <Badge variant="destructive" className="text-[10px]">停用</Badge>}
                        </div>
                        {item.content_type === "image" ? (
                          <div className="flex items-center gap-2">
                            <img src={item.content_value} alt="" className="h-8 w-14 rounded object-cover" />
                            <span className="text-xs text-muted-foreground truncate">{item.content_value}</span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground truncate">{item.content_value || "(空白)"}</p>
                        )}
                        <span className="text-[10px] text-muted-foreground">key: {item.section_key}</span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("確定刪除此項目？")) deleteMutation.mutate(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯：{editingItem?.section_label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>識別鍵</Label>
              <Input value={editingItem?.section_key || ""} disabled className="bg-muted" />
            </div>

            <div>
              <Label>內容</Label>
              {editingItem?.content_type === "image" ? (
                <div className="space-y-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="圖片網址 https://..."
                  />
                  {editValue && (
                    <img src={editValue} alt="Preview" className="rounded-lg h-40 w-full object-cover" />
                  )}
                </div>
              ) : editingItem?.content_type === "html" ? (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                />
              ) : (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                />
              )}
            </div>

            <div>
              <Label>附加資料 (JSON)</Label>
              <Textarea
                value={editMeta}
                onChange={(e) => setEditMeta(e.target.value)}
                rows={3}
                className="font-mono text-sm"
                placeholder='{}'
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={editActive} onCheckedChange={setEditActive} />
              <Label>啟用</Label>
            </div>

            <Button onClick={handleSave} className="w-full gap-2" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              儲存變更
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>新增內容項目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>識別鍵 (英文，如 cta_title)</Label>
              <Input value={newForm.section_key} onChange={(e) => setNewForm({ ...newForm, section_key: e.target.value })} />
            </div>
            <div>
              <Label>顯示名稱</Label>
              <Input value={newForm.section_label} onChange={(e) => setNewForm({ ...newForm, section_label: e.target.value })} />
            </div>
            <div>
              <Label>類型</Label>
              <select
                value={newForm.content_type}
                onChange={(e) => setNewForm({ ...newForm, content_type: e.target.value })}
                className="w-full border border-input rounded-md px-3 py-2 bg-background"
              >
                <option value="text">文字</option>
                <option value="image">圖片</option>
                <option value="html">HTML</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <Label>內容</Label>
              <Textarea value={newForm.content_value} onChange={(e) => setNewForm({ ...newForm, content_value: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>排序</Label>
              <Input type="number" value={newForm.sort_order} onChange={(e) => setNewForm({ ...newForm, sort_order: parseInt(e.target.value) || 0 })} />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!newForm.section_key || !newForm.section_label) {
                  toast.error("識別鍵與顯示名稱為必填");
                  return;
                }
                createMutation.mutate(newForm);
              }}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "新增中..." : "新增"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
