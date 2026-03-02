import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, Eye, Heart, MessageCircle, Loader2, EyeOff, CheckSquare, X, StarOff, EyeIcon, GripVertical, Save } from "lucide-react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PhotoRow {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url: string | null;
  user_id: string;
  category: string;
  brand: string | null;
  camera_body: string | null;
  phone_model: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  average_rating: number;
  is_featured: boolean;
  is_hidden: boolean;
  featured_order: number;
  created_at: string;
  author_name?: string;
}

const PAGE_SIZE = 50;

// Sortable photo card for featured mode
function SortablePhotoCard({
  photo,
  isSelected,
  onToggleSelect,
  onToggleFeatured,
  onToggleHidden,
  toggling,
}: {
  photo: PhotoRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleFeatured: () => void;
  onToggleHidden: () => void;
  toggling: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : photo.is_hidden ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card rounded-xl border overflow-hidden transition-shadow ${
        isDragging ? "shadow-xl" : ""
      } ${
        isSelected
          ? "border-primary ring-2 ring-primary/40"
          : photo.is_featured
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border"
      }`}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing border border-border/50 hover:bg-background"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <img
          src={photo.thumbnail_url || photo.image_url}
          alt={photo.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="h-5 w-5 bg-background/80 backdrop-blur-sm border-2"
          />
        </div>
        {photo.is_featured && (
          <div className="absolute top-2 left-9">
            <Badge className="bg-primary text-primary-foreground gap-1">
              <Star className="h-3 w-3 fill-current" /> 精選
            </Badge>
          </div>
        )}
        {photo.is_hidden && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="destructive" className="gap-1">
              <EyeOff className="h-3 w-3" /> 已隱藏
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-medium text-sm truncate mb-1">{photo.title}</h3>
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {photo.author_name} · {photo.phone_model || photo.camera_body || photo.brand || "未知裝備"}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{photo.like_count}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{photo.comment_count}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{photo.view_count}</span>
          {photo.average_rating > 0 && (
            <span className="flex items-center gap-1"><Star className="h-3 w-3" />{Number(photo.average_rating).toFixed(1)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={photo.is_featured}
              onCheckedChange={onToggleFeatured}
              disabled={toggling}
            />
            <span className="text-xs text-muted-foreground">精選</span>
          </div>
          <Button
            variant={photo.is_hidden ? "outline" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={onToggleHidden}
            disabled={toggling}
          >
            {photo.is_hidden ? "恢復顯示" : "隱藏"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Regular photo card (non-sortable)
function PhotoCard({
  photo,
  isSelected,
  onToggleSelect,
  onToggleFeatured,
  onToggleHidden,
  toggling,
}: {
  photo: PhotoRow;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleFeatured: () => void;
  onToggleHidden: () => void;
  toggling: boolean;
}) {
  return (
    <div
      className={`bg-card rounded-xl border overflow-hidden transition-all cursor-pointer ${
        isSelected
          ? "border-primary ring-2 ring-primary/40"
          : photo.is_featured
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-border"
      } ${photo.is_hidden ? "opacity-60" : ""}`}
      onClick={onToggleSelect}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        <img
          src={photo.thumbnail_url || photo.image_url}
          alt={photo.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="h-5 w-5 bg-background/80 backdrop-blur-sm border-2"
          />
        </div>
        {photo.is_featured && (
          <div className="absolute top-2 left-9">
            <Badge className="bg-primary text-primary-foreground gap-1">
              <Star className="h-3 w-3 fill-current" /> 精選
            </Badge>
          </div>
        )}
        {photo.is_hidden && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="gap-1">
              <EyeOff className="h-3 w-3" /> 已隱藏
            </Badge>
          </div>
        )}
      </div>
      <div className="p-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-medium text-sm truncate mb-1">{photo.title}</h3>
        <p className="text-xs text-muted-foreground mb-2 truncate">
          {photo.author_name} · {photo.phone_model || photo.camera_body || photo.brand || "未知裝備"}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{photo.like_count}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" />{photo.comment_count}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{photo.view_count}</span>
          {photo.average_rating > 0 && (
            <span className="flex items-center gap-1"><Star className="h-3 w-3" />{Number(photo.average_rating).toFixed(1)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={photo.is_featured}
              onCheckedChange={onToggleFeatured}
              disabled={toggling}
            />
            <span className="text-xs text-muted-foreground">精選</span>
          </div>
          <Button
            variant={photo.is_hidden ? "outline" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={onToggleHidden}
            disabled={toggling}
          >
            {photo.is_hidden ? "恢復顯示" : "隱藏"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PhotoManagement() {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "hidden">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [orderDirty, setOrderDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const isFeaturedMode = filter === "featured";
  const isSelectMode = selectedIds.size > 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPhotos([]);
    setPage(0);
    setHasMore(true);
    setSelectedIds(new Set());
    setOrderDirty(false);
  }, [debouncedSearch, filter]);

  const fetchPhotos = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("photos")
        .select("*");

      if (filter === "featured") {
        query = query.eq("is_featured", true)
          .order("featured_order", { ascending: true })
          .order("like_count", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      if (filter === "hidden") query = query.eq("is_hidden", true);

      if (debouncedSearch) {
        query = query.or(
          `title.ilike.%${debouncedSearch}%,brand.ilike.%${debouncedSearch}%,camera_body.ilike.%${debouncedSearch}%,phone_model.ilike.%${debouncedSearch}%`
        );
      }

      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;

      const userIds = [...new Set((data || []).map((p) => p.user_id))];
      const profileMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", userIds);
        profiles?.forEach((p) => {
          profileMap.set(p.user_id, p.display_name || p.username);
        });
      }

      const mapped: PhotoRow[] = (data || []).map((p: any) => ({
        ...p,
        is_featured: p.is_featured ?? false,
        is_hidden: p.is_hidden ?? false,
        featured_order: p.featured_order ?? 0,
        like_count: p.like_count ?? 0,
        comment_count: p.comment_count ?? 0,
        view_count: p.view_count ?? 0,
        average_rating: p.average_rating ?? 0,
        author_name: profileMap.get(p.user_id) || "未知",
      }));

      if (pageNum === 0) setPhotos(mapped);
      else setPhotos((prev) => [...prev, ...mapped]);
      setHasMore(mapped.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      toast.error("載入作品失敗");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter]);

  useEffect(() => {
    fetchPhotos(page);
  }, [page, fetchPhotos]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setPhotos((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex);
    });
    setOrderDirty(true);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      const updates = photos.map((photo, index) => ({
        id: photo.id,
        featured_order: index,
      }));

      // Update one by one (batch not supported by supabase-js for different rows)
      for (const u of updates) {
        await supabase
          .from("photos")
          .update({ featured_order: u.featured_order })
          .eq("id", u.id);
      }

      setOrderDirty(false);
      toast.success("排序已儲存，首頁將按此順序顯示精選作品");
    } catch (err) {
      console.error(err);
      toast.error("儲存排序失敗");
    } finally {
      setSavingOrder(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map((p) => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const batchUpdate = async (field: "is_featured" | "is_hidden", value: boolean) => {
    if (selectedIds.size === 0) return;
    setBatchLoading(true);
    const ids = Array.from(selectedIds);

    const { error } = await supabase
      .from("photos")
      .update({ [field]: value })
      .in("id", ids);

    if (error) {
      toast.error("批量更新失敗");
    } else {
      setPhotos((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, [field]: value } : p))
      );
      const label = field === "is_featured"
        ? (value ? "設為精選" : "取消精選")
        : (value ? "隱藏" : "恢復顯示");
      toast.success(`已批量${label} ${ids.length} 件作品`);
      setSelectedIds(new Set());
    }
    setBatchLoading(false);
  };

  const toggleFeatured = async (photo: PhotoRow) => {
    setTogglingIds((prev) => new Set(prev).add(photo.id));
    const newVal = !photo.is_featured;
    const { error } = await supabase
      .from("photos")
      .update({ is_featured: newVal })
      .eq("id", photo.id);

    if (error) {
      toast.error("更新失敗");
    } else {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, is_featured: newVal } : p))
      );
      toast.success(newVal ? "已設為精選" : "已取消精選");
    }
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(photo.id);
      return next;
    });
  };

  const toggleHidden = async (photo: PhotoRow) => {
    setTogglingIds((prev) => new Set(prev).add(photo.id));
    const newVal = !photo.is_hidden;
    const { error } = await supabase
      .from("photos")
      .update({ is_hidden: newVal })
      .eq("id", photo.id);

    if (error) {
      toast.error("更新失敗");
    } else {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, is_hidden: newVal } : p))
      );
      toast.success(newVal ? "已隱藏作品" : "已恢復顯示");
    }
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(photo.id);
      return next;
    });
  };

  const featuredCount = photos.filter((p) => p.is_featured).length;

  const renderGrid = () => {
    if (isFeaturedMode) {
      return (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <SortablePhotoCard
                  key={photo.id}
                  photo={photo}
                  isSelected={selectedIds.has(photo.id)}
                  onToggleSelect={() => toggleSelect(photo.id)}
                  onToggleFeatured={() => toggleFeatured(photo)}
                  onToggleHidden={() => toggleHidden(photo)}
                  toggling={togglingIds.has(photo.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedIds.has(photo.id)}
            onToggleSelect={() => toggleSelect(photo.id)}
            onToggleFeatured={() => toggleFeatured(photo)}
            onToggleHidden={() => toggleHidden(photo)}
            toggling={togglingIds.has(photo.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <AdminLayout title="作品管理" subtitle="管理所有作品，設定精選或隱藏作品">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋作品標題、品牌、機型..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部作品</SelectItem>
            <SelectItem value="featured">僅精選</SelectItem>
            <SelectItem value="hidden">已隱藏</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch Action Bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={selectAll} className="gap-1.5">
          <CheckSquare className="h-4 w-4" />
          {selectedIds.size === photos.length && photos.length > 0 ? "取消全選" : "全選"}
        </Button>

        {isSelectMode && (
          <>
            <span className="text-sm text-muted-foreground">
              已選 <span className="font-semibold text-foreground">{selectedIds.size}</span> 件
            </span>
            <div className="h-4 w-px bg-border" />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => batchUpdate("is_featured", true)} disabled={batchLoading}>
              <Star className="h-3.5 w-3.5" /> 設為精選
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => batchUpdate("is_featured", false)} disabled={batchLoading}>
              <StarOff className="h-3.5 w-3.5" /> 取消精選
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => batchUpdate("is_hidden", true)} disabled={batchLoading}>
              <EyeOff className="h-3.5 w-3.5" /> 隱藏
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => batchUpdate("is_hidden", false)} disabled={batchLoading}>
              <EyeIcon className="h-3.5 w-3.5" /> 恢復顯示
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="gap-1">
              <X className="h-3.5 w-3.5" /> 清除
            </Button>
          </>
        )}
      </div>

      {isFeaturedMode && (
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm text-muted-foreground">
            目前共有 <span className="font-semibold text-primary">{featuredCount}</span> 件精選作品
            {isFeaturedMode && " · 拖曳卡片可調整首頁顯示順序"}
          </div>
          {orderDirty && (
            <Button
              size="sm"
              onClick={saveOrder}
              disabled={savingOrder}
              className="gap-1.5"
            >
              {savingOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              儲存排序
            </Button>
          )}
        </div>
      )}

      {/* Photo Grid */}
      {loading && photos.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">載入中...</span>
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          沒有找到符合條件的作品
        </div>
      ) : (
        <>
          {renderGrid()}

          {hasMore && (
            <div className="flex justify-center mt-8">
              <Button
                variant="outline"
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                載入更多
              </Button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
