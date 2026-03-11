import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Save, Loader2, Eye, EyeOff, Pencil, Check, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

interface HomepageSection {
  id: string;
  section_key: string;
  section_label: string;
  sort_order: number;
  is_visible: boolean;
}

function SortableRow({
  section,
  onToggleVisible,
  onRenameLabel,
}: {
  section: HomepageSection;
  onToggleVisible: (id: string, val: boolean) => void;
  onRenameLabel: (id: string, newLabel: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(section.section_label);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  const handleConfirm = () => {
    const trimmed = tempLabel.trim();
    if (trimmed && trimmed !== section.section_label) {
      onRenameLabel(section.id, trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setTempLabel(section.section_label);
    setEditing(false);
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={tempLabel}
                onChange={(e) => setTempLabel(e.target.value)}
                className="h-8 w-40 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirm();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleConfirm}>
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel}>
                <X className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-medium">{section.section_label}</span>
              <button
                onClick={() => { setTempLabel(section.section_label); setEditing(true); }}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="編輯名稱"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <Badge variant="outline" className="text-[10px]">
            {section.section_key}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">排序：{section.sort_order}</span>
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

export default function HomepageSectionManagement() {
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [dirty, setDirty] = useState(false);

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
    if (fetchedSections && !dirty) {
      setSections(fetchedSections);
    }
  }, [fetchedSections, dirty]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        await supabase
          .from("homepage_sections")
          .update({ sort_order: i + 1, is_visible: s.is_visible, updated_at: new Date().toISOString() })
          .eq("id", s.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      setDirty(false);
      toast.success("首頁區塊排序已儲存");
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
    setDirty(true);
  };

  const toggleVisible = (id: string, val: boolean) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_visible: val } : s))
    );
    setDirty(true);
  };

  return (
    <AdminLayout title="區塊排序" subtitle="拖拉調整首頁各區塊的顯示順序與可見性">
      {dirty && (
        <div className="mb-6 flex items-center gap-4 p-4 bg-primary/10 rounded-xl border border-primary/20">
          <span className="text-sm font-medium flex-1">您有未儲存的變更</span>
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
              {sections.map((section) => (
                <SortableRow
                  key={section.id}
                  section={section}
                  onToggleVisible={toggleVisible}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </AdminLayout>
  );
}
