import { useState, useEffect } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pencil, Save, Image, Type, FileText, Loader2, Search, Plus, Trash2,
  GripVertical, Eye, EyeOff, Check, X, Layers, Settings2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Site Content Types ───
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

function groupContents(contents: SiteContent[]) {
  const groups: Record<string, SiteContent[]> = {};
  const groupName: Record<string, string> = {
    cta: "CTA 行動呼籲",
    gallery: "作品分享區",
    forum: "討論區",
    featured: "精選作品",
    footer: "頁尾",
    site: "全站設定",
  };
  // Exclude hero (managed in Banner管理) and page_ prefixed items (managed in their own pages)
  const excludedPrefixes = ["hero", "page"];
  contents.forEach((c) => {
    const prefix = c.section_key.split("_")[0];
    if (excludedPrefixes.includes(prefix)) return;
    const name = groupName[prefix] || "其他";
    if (!groups[name]) groups[name] = [];
    groups[name].push(c);
  });
  return groups;
}

// ─── Homepage Section Types ───
interface HomepageSection {
  id: string;
  section_key: string;
  section_label: string;
  section_subtitle: string;
  sort_order: number;
  is_visible: boolean;
}

// ─── Sortable Row ───
function SortableRow({
  section,
  onToggleVisible,
  onRenameLabel,
  onRenameSubtitle,
}: {
  section: HomepageSection;
  onToggleVisible: (id: string, val: boolean) => void;
  onRenameLabel: (id: string, newLabel: string) => void;
  onRenameSubtitle: (id: string, newSubtitle: string) => void;
}) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const [tempLabel, setTempLabel] = useState(section.section_label);
  const [tempSubtitle, setTempSubtitle] = useState(section.section_subtitle || "");

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  const handleConfirmLabel = () => {
    const trimmed = tempLabel.trim();
    if (trimmed && trimmed !== section.section_label) {
      onRenameLabel(section.id, trimmed);
    }
    setEditingLabel(false);
  };

  const handleCancelLabel = () => {
    setTempLabel(section.section_label);
    setEditingLabel(false);
  };

  const handleConfirmSubtitle = () => {
    const trimmed = tempSubtitle.trim();
    if (trimmed !== (section.section_subtitle || "")) {
      onRenameSubtitle(section.id, trimmed);
    }
    setEditingSubtitle(false);
  };

  const handleCancelSubtitle = () => {
    setTempSubtitle(section.section_subtitle || "");
    setEditingSubtitle(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-4 bg-card rounded-xl border ${
        isDragging ? "shadow-xl border-primary" : "border-border"
      } ${!section.is_visible ? "opacity-50" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          {editingLabel ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                className="h-8 w-40 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmLabel();
                  if (e.key === "Escape") handleCancelLabel();
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleConfirmLabel}>
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelLabel}>
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-medium">{section.section_label}</span>
              <button
                onClick={() => { setTempLabel(section.section_label); setEditingLabel(true); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="編輯標題"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <Badge variant="outline" className="text-[10px]">
            {section.section_key}
          </Badge>
        </div>

        {/* Subtitle row */}
        <div className="flex items-center gap-2 flex-wrap">
          {editingSubtitle ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={tempSubtitle}
                onChange={(e) => setTempSubtitle(e.target.value)}
                placeholder="輸入副標題..."
                className="h-7 w-52 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmSubtitle();
                  if (e.key === "Escape") handleCancelSubtitle();
                }}
              />
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleConfirmSubtitle}>
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelSubtitle}>
                <X className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">
                {section.section_subtitle ? `副標題：${section.section_subtitle}` : "未設定副標題"}
              </span>
              <button
                onClick={() => { setTempSubtitle(section.section_subtitle || ""); setEditingSubtitle(true); }}
                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="編輯副標題"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {section.is_visible ? (
          <Eye className="h-4 w-4 text-muted-foreground" />
        ) : (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        )}
        <Switch
          checked={section.is_visible}
          onCheckedChange={(val) => onToggleVisible(section.id, val)}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───
export default function ContentManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ── Site Content state ──
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

  // ── Homepage Sections state ──
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [sectionsDirty, setSectionsDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Queries ──
  const { data: contents = [], isLoading: contentsLoading } = useQuery({
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

  const { data: fetchedSections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["admin-homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as HomepageSection[];
    },
  });

  useEffect(() => {
    if (fetchedSections && !sectionsDirty) {
      setSections(fetchedSections);
    }
  }, [fetchedSections, sectionsDirty]);

  // ── Site Content mutations ──
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
        .insert({ ...values, content_meta: {}, is_active: true } as any);
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
      const { error } = await supabase.from("site_content" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      toast.success("已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });

  // ── Homepage Sections mutations ──
  const saveSectionsMutation = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        await supabase
          .from("homepage_sections")
          .update({ sort_order: i + 1, is_visible: s.is_visible, section_label: s.section_label, section_subtitle: s.section_subtitle || "", updated_at: new Date().toISOString() } as any)
          .eq("id", s.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      setSectionsDirty(false);
      toast.success("區塊設定已儲存");
    },
    onError: () => toast.error("儲存失敗"),
  });

  // ── Handlers ──
  const openEdit = (item: SiteContent) => {
    setEditingItem(item);
    setEditValue(item.content_value);
    setEditMeta(JSON.stringify(item.content_meta, null, 2));
    setEditActive(item.is_active);
  };

  const handleSave = () => {
    if (!editingItem) return;
    let meta = {};
    try { meta = JSON.parse(editMeta || "{}"); }
    catch { toast.error("Meta JSON 格式錯誤"); return; }
    updateMutation.mutate({ id: editingItem.id, content_value: editValue, content_meta: meta, is_active: editActive });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIdx = prev.findIndex((s) => s.id === active.id);
      const newIdx = prev.findIndex((s) => s.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    setSectionsDirty(true);
  };

  const toggleVisible = (id: string, val: boolean) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, is_visible: val } : s)));
    setSectionsDirty(true);
  };

  const renameLabel = (id: string, newLabel: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, section_label: newLabel } : s)));
    setSectionsDirty(true);
  };

  const renameSubtitle = (id: string, newSubtitle: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, section_subtitle: newSubtitle } : s)));
    setSectionsDirty(true);
  };

  // ── Filtered & Grouped ──
  const filtered = contents.filter(
    (c) =>
      c.section_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.section_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.content_value.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const grouped = groupContents(filtered);

  return (
    <>
      <Tabs defaultValue="sections" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sections" className="gap-2">
            <Layers className="h-4 w-4" />
            區塊排序
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Settings2 className="h-4 w-4" />
            內容設定
          </TabsTrigger>
        </TabsList>

        {/* ── 區塊排序 Tab ── */}
        <TabsContent value="sections" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            拖拉調整首頁各區塊的顯示順序，點擊鉛筆圖示可自訂區塊在前台顯示的名稱。
          </p>

          {sectionsDirty && (
            <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
              <span className="text-sm font-medium flex-1">您有未儲存的變更</span>
              <Button
                onClick={() => saveSectionsMutation.mutate()}
                disabled={saveSectionsMutation.isPending}
                className="gap-2"
              >
                {saveSectionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                儲存變更
              </Button>
            </div>
          )}

          {sectionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sections.map((section) => (
                    <SortableRow
                      key={section.id}
                      section={section}
                      onToggleVisible={toggleVisible}
                      onRenameLabel={renameLabel}
                      onRenameSubtitle={renameSubtitle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        {/* ── 內容設定 Tab ── */}
        <TabsContent value="content" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
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

          {contentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([groupName, items]) => (
                <div key={groupName}>
                  <h3 className="font-serif text-lg font-bold mb-3 flex items-center gap-2">
                    {groupName}
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </h3>
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
                              onClick={() => { if (confirm("確定刪除此項目？")) deleteMutation.mutate(item.id); }}
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
        </TabsContent>
      </Tabs>

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
                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="圖片網址 https://..." />
                  {editValue && <img src={editValue} alt="Preview" className="rounded-lg h-40 w-full object-cover" />}
                </div>
              ) : editingItem?.content_type === "html" ? (
                <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={8} className="font-mono text-sm" />
              ) : (
                <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={3} />
              )}
            </div>
            <div>
              <Label>附加資料 (JSON)</Label>
              <Textarea value={editMeta} onChange={(e) => setEditMeta(e.target.value)} rows={3} className="font-mono text-sm" placeholder="{}" />
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
    </>
  );
}
