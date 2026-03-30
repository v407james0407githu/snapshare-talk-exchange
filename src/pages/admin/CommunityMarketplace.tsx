import { useState, useEffect } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, ShoppingBag, CheckCircle, Eye, Package, ShieldCheck, Smartphone, Camera, Plus, X, Tag, Pencil, Trash2, ChevronRight, FolderTree, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface ListingRow {
  id: string;
  title: string;
  category: string;
  condition: string;
  price: number;
  currency: string;
  user_id: string;
  is_sold: boolean;
  is_hidden: boolean;
  is_verified: boolean;
  view_count: number;
  verification_image_url: string;
  created_at: string;
  author_name?: string;
  brand?: string | null;
  model?: string | null;
}

const PAGE_SIZE = 30;
const STALE_TIME = 3 * 60 * 1000;

async function fetchListingsPage(debouncedSearch: string, filter: string, page: number): Promise<ListingRow[]> {
  const from = page * PAGE_SIZE;
  let query = supabase
    .from("marketplace_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filter === "pending") query = query.eq("is_verified", false).eq("is_sold", false);
  if (filter === "verified") query = query.eq("is_verified", true);
  if (filter === "sold") query = query.eq("is_sold", true);
  if (filter === "hidden") query = query.eq("is_hidden", true);
  if (debouncedSearch) query = query.ilike("title", `%${debouncedSearch}%`);

  const { data, error } = await query;
  if (error) throw error;

  const userIds = [...new Set((data || []).map((l: any) => l.user_id))];
  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", userIds);
    profiles?.forEach((p: any) => profileMap.set(p.user_id, p.display_name || p.username));
  }

  return (data || []).map((l: any) => ({
    ...l,
    is_sold: l.is_sold ?? false,
    is_hidden: l.is_hidden ?? false,
    is_verified: l.is_verified ?? false,
    view_count: l.view_count ?? 0,
    currency: l.currency ?? "TWD",
    author_name: profileMap.get(l.user_id) || "未知",
  }));
}

/* ─── Model Management (inline) ─── */

interface BrandModel {
  id: string;
  category: string;
  brand: string;
  model_name: string;
  sort_order: number;
}

function useBrandList() {
  return useQuery({
    queryKey: ["admin-brand-list"],
    queryFn: async () => {
      const { data: cats } = await supabase
        .from("forum_categories")
        .select("name, slug, parent_id, sort_order")
        .not("parent_id", "is", null)
        .order("sort_order");
      const { data: parents } = await supabase
        .from("forum_categories")
        .select("id, slug")
        .is("parent_id", null);
      const mobileId = parents?.find((p) => p.slug === "mobile")?.id;
      const cameraId = parents?.find((p) => p.slug === "camera")?.id;
      const phoneBrands = (cats || [])
        .filter((c) => c.parent_id === mobileId)
        .map((c) => ({ value: c.slug.replace(/^mobile-/, ""), label: c.name }));
      const cameraBrands = (cats || [])
        .filter((c) => c.parent_id === cameraId)
        .map((c) => ({ value: c.slug.replace(/^camera-/, ""), label: c.name }));
      return { phoneBrands, cameraBrands };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function ModelManagementTab() {
  const { toast: toastHook } = useToast();
  const queryClient = useQueryClient();
  const { data: brandList } = useBrandList();
  const [selectedCategory, setSelectedCategory] = useState<"phone" | "camera">("phone");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [adding, setAdding] = useState(false);

  const brands = selectedCategory === "phone" ? brandList?.phoneBrands : brandList?.cameraBrands;

  const { data: models, isLoading } = useQuery({
    queryKey: ["admin-brand-models", selectedCategory, selectedBrand],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_models")
        .select("*")
        .eq("category", selectedCategory)
        .eq("brand", selectedBrand)
        .order("sort_order");
      if (error) throw error;
      return (data as BrandModel[]) || [];
    },
    enabled: !!selectedBrand,
    staleTime: 60 * 1000,
  });

  const handleAdd = async () => {
    if (!newModelName.trim() || !selectedBrand) return;
    setAdding(true);
    try {
      const maxSort = models?.length ? Math.max(...models.map((m) => m.sort_order)) : 0;
      const { error } = await supabase.from("brand_models").insert({
        category: selectedCategory,
        brand: selectedBrand,
        model_name: newModelName.trim(),
        sort_order: maxSort + 1,
      });
      if (error) throw error;
      setNewModelName("");
      queryClient.invalidateQueries({ queryKey: ["admin-brand-models", selectedCategory, selectedBrand] });
      queryClient.invalidateQueries({ queryKey: ["brand-models"] });
      toastHook({ title: "新增成功" });
    } catch (err: any) {
      toastHook({ title: "新增失敗", description: err.message?.includes("unique") ? "此型號已存在" : err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？`)) return;
    const { error } = await supabase.from("brand_models").delete().eq("id", id);
    if (error) {
      toastHook({ title: "刪除失敗", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-brand-models", selectedCategory, selectedBrand] });
    queryClient.invalidateQueries({ queryKey: ["brand-models"] });
    toastHook({ title: "已刪除" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">類型</label>
              <div className="flex gap-2">
                <Button type="button" variant={selectedCategory === "phone" ? "default" : "outline"} size="sm"
                  onClick={() => { setSelectedCategory("phone"); setSelectedBrand(""); }}>
                  <Smartphone className="mr-1.5 h-4 w-4" /> 手機
                </Button>
                <Button type="button" variant={selectedCategory === "camera" ? "default" : "outline"} size="sm"
                  onClick={() => { setSelectedCategory("camera"); setSelectedBrand(""); }}>
                  <Camera className="mr-1.5 h-4 w-4" /> 相機
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">品牌</label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger><SelectValue placeholder="選擇品牌" /></SelectTrigger>
                <SelectContent>
                  {brands?.map((b) => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedBrand && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {brands?.find((b) => b.value === selectedBrand)?.label || selectedBrand} 型號列表
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={newModelName} onChange={(e) => setNewModelName(e.target.value)}
                placeholder="輸入新型號名稱"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())} />
              <Button onClick={handleAdd} disabled={adding || !newModelName.trim()} size="sm" className="shrink-0">
                {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                新增
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : models && models.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {models.map((model) => (
                  <Badge key={model.id} variant="secondary" className="text-sm py-1.5 px-3 gap-1.5">
                    {model.model_name}
                    <button onClick={() => handleDelete(model.id, model.model_name)}
                      className="ml-0.5 hover:text-destructive transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">尚無型號資料，請新增</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Marketplace Category Management (inline) ─── */

interface MktCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
}

const emptyCatForm = {
  name: "", slug: "", description: "", icon: "", color: "green",
  parent_id: "", sort_order: 0, is_active: true,
};

function MarketplaceCategoryTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCatForm);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-marketplace-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketplace_categories").select("*").order("sort_order");
      if (error) throw error;
      return (data as MktCategory[]) ?? [];
    },
  });

  const mainCategories = categories.filter(c => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof emptyCatForm & { id?: string }) => {
      const payload = {
        name: values.name, slug: values.slug,
        description: values.description || null, icon: values.icon || null,
        color: values.color || null, parent_id: values.parent_id || null,
        sort_order: values.sort_order, is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("marketplace_categories").update(payload as any).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("marketplace_categories").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-categories"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-categories"] });
      toast.success(editingId ? "分類已更新" : "分類已新增");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("操作失敗"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplace-categories"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-categories"] });
      toast.success("分類已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });

  const resetForm = () => { setForm(emptyCatForm); setEditingId(null); };

  const openEdit = (cat: MktCategory) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description ?? "",
      icon: cat.icon ?? "", color: cat.color ?? "green",
      parent_id: cat.parent_id ?? "", sort_order: cat.sort_order, is_active: cat.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) { toast.error("名稱與代碼為必填"); return; }
    saveMutation.mutate(editingId ? { ...form, id: editingId } : form);
  };

  const totalMain = mainCategories.length;
  const totalSub = categories.filter(c => c.parent_id).length;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><FolderTree className="h-4 w-4 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{totalMain}</p><p className="text-xs text-muted-foreground">主分類</p></div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><Layers className="h-4 w-4 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{totalSub}</p><p className="text-xs text-muted-foreground">子分類</p></div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted"><FolderTree className="h-4 w-4 text-muted-foreground" /></div>
          <div><p className="text-2xl font-bold">{categories.length}</p><p className="text-xs text-muted-foreground">總計</p></div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />新增分類</Button>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "編輯分類" : "新增分類"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>名稱 *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>代碼 (slug) *</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="例如：phone" /></div>
              </div>
              <div><Label>說明</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>圖示（Emoji / 圖示名）</Label><Input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="Smartphone" /></div>
                <div>
                  <Label>顏色</Label>
                  <Select value={form.color} onValueChange={v => setForm({ ...form, color: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green">綠色</SelectItem>
                      <SelectItem value="blue">藍色</SelectItem>
                      <SelectItem value="purple">紫色</SelectItem>
                      <SelectItem value="orange">橙色</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>父分類</Label>
                <Select value={form.parent_id} onValueChange={v => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="主分類" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">主分類</SelectItem>
                    {mainCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>排序</Label><Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                  <Label>啟用</Label>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "儲存中..." : "儲存"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="space-y-4">
          {mainCategories.map(cat => (
            <div key={cat.id}>
              <Card className={!cat.is_active ? "opacity-50" : ""}>
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="text-2xl">{cat.icon || "📁"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{cat.name}</h3>
                      {!cat.is_active && <Badge variant="secondary" className="text-[10px]">停用</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                    <span className="text-xs text-muted-foreground">slug: {cat.slug} · 排序: {cat.sort_order} · {getChildren(cat.id).length} 個子分類</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="text-destructive" onClick={() => { if (confirm("確定刪除？子分類也會一併刪除")) deleteMutation.mutate(cat.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {getChildren(cat.id).length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                  {getChildren(cat.id).map(sub => (
                    <Card key={sub.id} className={!sub.is_active ? "opacity-50" : ""}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-lg">{sub.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{sub.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">({sub.slug})</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(sub)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("確定刪除？")) deleteMutation.mutate(sub.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── Main Component ─── */

export default function CommunityMarketplace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "sold" | "hidden">("all");
  const [page, setPage] = useState(0);
  const [allListings, setAllListings] = useState<ListingRow[]>([]);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useAdminPage("市集管理", "管理市集商品、審核與型號");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setAllListings([]);
    setPage(0);
  }, [debouncedSearch, filter]);

  const { data: pageData, isLoading: loading } = useQuery({
    queryKey: ["admin-marketplace", debouncedSearch, filter, page],
    queryFn: () => fetchListingsPage(debouncedSearch, filter, page),
    staleTime: STALE_TIME,
  });

  useEffect(() => {
    if (pageData) {
      if (page === 0) setAllListings(pageData);
      else
        setAllListings((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          return [...prev, ...pageData.filter((l) => !existingIds.has(l.id))];
        });
    }
  }, [pageData, page]);

  const hasMore = (pageData?.length || 0) === PAGE_SIZE;

  const toggleField = async (listing: ListingRow, field: "is_verified" | "is_hidden" | "is_sold") => {
    setTogglingIds((prev) => new Set(prev).add(listing.id));
    const newVal = !listing[field];
    const { error } = await supabase
      .from("marketplace_listings")
      .update({ [field]: newVal })
      .eq("id", listing.id);
    if (error) {
      toast.error("操作失敗");
    } else {
      setAllListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, [field]: newVal } : l)));
      const labels: Record<string, [string, string]> = {
        is_verified: ["已審核通過", "已取消審核"],
        is_hidden: ["已下架", "已恢復上架"],
        is_sold: ["已標記售出", "已取消售出"],
      };
      toast.success(newVal ? labels[field][0] : labels[field][1]);
    }
    setTogglingIds((prev) => {
      const n = new Set(prev);
      n.delete(listing.id);
      return n;
    });
  };

  const stats = {
    total: allListings.length,
    pending: allListings.filter((l) => !l.is_verified && !l.is_sold).length,
    verified: allListings.filter((l) => l.is_verified).length,
    sold: allListings.filter((l) => l.is_sold).length,
  };

  const conditionLabel: Record<string, string> = {
    new: "全新",
    like_new: "幾乎全新",
    good: "良好",
    fair: "尚可",
    poor: "較差",
  };

  return (
    <Tabs defaultValue="listings" className="space-y-6">
      <TabsList>
        <TabsTrigger value="listings" className="gap-1.5"><ShoppingBag className="h-4 w-4" />商品管理</TabsTrigger>
        <TabsTrigger value="models" className="gap-1.5"><Tag className="h-4 w-4" />型號管理</TabsTrigger>
        <TabsTrigger value="categories" className="gap-1.5"><FolderTree className="h-4 w-4" />分類管理</TabsTrigger>
      </TabsList>

      <TabsContent value="listings" className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "全部商品", value: stats.total, icon: ShoppingBag },
          { label: "待審核", value: stats.pending, icon: Package },
          { label: "已驗證", value: stats.verified, icon: ShieldCheck },
          { label: "已售出", value: stats.sold, icon: CheckCircle },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋商品標題..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待審核</SelectItem>
            <SelectItem value="verified">已驗證</SelectItem>
            <SelectItem value="sold">已售出</SelectItem>
            <SelectItem value="hidden">已下架</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && allListings.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : allListings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">沒有找到符合條件的商品</div>
      ) : (
        <>
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[220px]">商品</TableHead>
                  <TableHead className="w-24">價格</TableHead>
                  <TableHead className="w-20 text-center">狀況</TableHead>
                  <TableHead className="w-20 text-center">驗證圖</TableHead>
                  <TableHead className="w-24 text-center">審核</TableHead>
                  <TableHead className="w-24 text-center">下架</TableHead>
                  <TableHead className="w-24 text-center">售出</TableHead>
                  <TableHead className="w-28">刊登時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allListings.map((listing) => (
                  <TableRow key={listing.id} className={listing.is_hidden ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm line-clamp-1">{listing.title}</span>
                          {listing.is_sold && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              已售出
                            </Badge>
                          )}
                          {listing.is_verified && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-primary">
                              <ShieldCheck className="h-2.5 w-2.5" />
                              已驗證
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {listing.author_name} · {listing.category}
                          {listing.brand ? ` · ${listing.brand}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">${listing.price.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {conditionLabel[listing.condition] || listing.condition}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setPreviewImage(listing.verification_image_url)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={listing.is_verified}
                        onCheckedChange={() => toggleField(listing, "is_verified")}
                        disabled={togglingIds.has(listing.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={listing.is_hidden}
                        onCheckedChange={() => toggleField(listing, "is_hidden")}
                        disabled={togglingIds.has(listing.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={listing.is_sold}
                        onCheckedChange={() => toggleField(listing, "is_sold")}
                        disabled={togglingIds.has(listing.id)}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(listing.created_at), "yyyy/MM/dd")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}載入更多
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>驗證圖片</DialogTitle>
          </DialogHeader>
          {previewImage && <img src={previewImage} alt="驗證圖片" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="models">
        <ModelManagementTab />
      </TabsContent>

      <TabsContent value="categories">
        <MarketplaceCategoryTab />
      </TabsContent>
    </Tabs>
  );
}
