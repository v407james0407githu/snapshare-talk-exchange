import { useState, useEffect } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Pencil, Save, Loader2, GripVertical, Eye, EyeOff, Check, X, AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HomepageSection {
  id: string;
  section_key: string;
  section_label: string;
  section_subtitle: string;
  sort_order: number;
  is_visible: boolean;
  updated_at: string | null;
}

const sectionFeatureMap: Record<string, string> = {
  featured_gallery: "gallery_enabled",
  featured_carousel: "gallery_enabled",
  forum_preview: "forum_enabled",
  equipment_categories: "forum_enabled",
  marketplace_preview: "marketplace_enabled",
};

const sectionDescriptions: Record<string, string> = {
  hero: "首頁主視覺橫幅輪播區",
  equipment_categories: "攝影討論區 / 器材分類入口",
  featured_carousel: "精選作品輪播展示",
  featured_gallery: "最新作品格柵展示",
  forum_preview: "熱門討論串預覽",
  marketplace_preview: "二手市集商品預覽",
  cta: "CTA 行動呼籲區塊",
};

function SortableRow({
  section,
  onToggleVisible,
  onRenameLabel,
  onRenameSubtitle,
  featureDisabled,
  featureDisabledReason,
}: {
  section: HomepageSection;
  onToggleVisible: (id: string, val: boolean) => void;
  onRenameLabel: (id: string, newLabel: string) => void;
  onRenameSubtitle: (id: string, newSubtitle: string) => void;
  featureDisabled: boolean;
  featureDisabledReason?: string;
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
    if (trimmed && trimmed !== section.section_label) onRenameLabel(section.id, trimmed);
    setEditingLabel(false);
  };
  const handleCancelLabel = () => { setTempLabel(section.section_label); setEditingLabel(false); };
  const handleConfirmSubtitle = () => {
    const trimmed = tempSubtitle.trim();
    if (trimmed !== (section.section_subtitle || "")) onRenameSubtitle(section.id, trimmed);
    setEditingSubtitle(false);
  };
  const handleCancelSubtitle = () => { setTempSubtitle(section.section_subtitle || ""); setEditingSubtitle(false); };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-4 p-4 bg-card rounded-xl border ${
        isDragging ? "shadow-xl border-primary" : "border-border"
      } ${!section.is_visible ? "opacity-60" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted mt-1"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
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
          <Badge variant="outline" className="text-[10px] font-mono">
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

        {/* Description */}
        {sectionDescriptions[section.section_key] && (
          <p className="text-xs text-muted-foreground/70">{sectionDescriptions[section.section_key]}</p>
        )}

        {/* Feature disabled warning */}
        {featureDisabled && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2 py-1 mt-1">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>{featureDisabledReason}</span>
          </div>
        )}

        {/* Last updated */}
        {section.updated_at && (
          <p className="text-[10px] text-muted-foreground/50">
            更新於 {new Date(section.updated_at).toLocaleString("zh-TW")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 mt-1">
        <span className="text-xs text-muted-foreground">
          {section.is_visible ? "顯示" : "隱藏"}
        </span>
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

export default function HomepageSections() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { galleryEnabled, forumEnabled, marketplaceEnabled } = useSystemSettings();

  const featureFlags: Record<string, boolean> = {
    gallery_enabled: galleryEnabled,
    forum_enabled: forumEnabled,
    marketplace_enabled: marketplaceEnabled,
  };

  const featureLabels: Record<string, string> = {
    gallery_enabled: "作品分享功能已關閉，此區塊不會在前台顯示",
    forum_enabled: "討論區功能已關閉，此區塊不會在前台顯示",
    marketplace_enabled: "市集功能已關閉，此區塊不會在前台顯示",
  };

  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [sectionsDirty, setSectionsDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: fetchedSections, isLoading } = useQuery({
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
    if (fetchedSections && !sectionsDirty) setSections(fetchedSections);
  }, [fetchedSections, sectionsDirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        await supabase
          .from("homepage_sections")
          .update({
            sort_order: i + 1,
            is_visible: s.is_visible,
            section_label: s.section_label,
            section_subtitle: s.section_subtitle || "",
            updated_at: new Date().toISOString(),
          } as any)
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

  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          拖拉調整首頁各區塊的顯示順序，點擊鉛筆圖示可自訂區塊在前台顯示的名稱與副標題。
        </p>

        {sectionsDirty && (
          <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
            <span className="text-sm font-medium flex-1">排序已變更，尚未儲存</span>
            <Button
              variant="outline"
              onClick={() => {
                setSectionsDirty(false);
                if (fetchedSections) setSections(fetchedSections);
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              儲存排序
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((section) => {
                  const featureKey = sectionFeatureMap[section.section_key];
                  const isFeatureDisabled = featureKey ? featureFlags[featureKey] === false : false;
                  return (
                    <SortableRow
                      key={section.id}
                      section={section}
                      onToggleVisible={toggleVisible}
                      onRenameLabel={renameLabel}
                      onRenameSubtitle={renameSubtitle}
                      featureDisabled={isFeatureDisabled}
                      featureDisabledReason={featureKey ? featureLabels[featureKey] : undefined}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </>
  );
}
