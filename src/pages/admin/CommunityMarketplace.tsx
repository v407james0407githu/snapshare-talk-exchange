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
import {
  Search,
  Loader2,
  ShoppingBag,
  CheckCircle,
  Eye,
  Package,
  ShieldCheck,
  Smartphone,
  Camera,
  Plus,
  X,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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
      const { data: parents } = await supabase.from("forum_categories").select("id, slug").is("parent_id", null);
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
      toastHook({
        title: "新增失敗",
        description: err.message?.includes("unique") ? "此型號已存在" : err.message,
        variant: "destructive",
      });
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
                <Button
                  type="button"
                  variant={selectedCategory === "phone" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("phone");
                    setSelectedBrand("");
                  }}
                >
                  <Smartphone className="mr-1.5 h-4 w-4" /> 手機
                </Button>
                <Button
                  type="button"
                  variant={selectedCategory === "camera" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("camera");
                    setSelectedBrand("");
                  }}
                >
                  <Camera className="mr-1.5 h-4 w-4" /> 相機
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">品牌</label>
              <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇品牌" />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
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
              <Input
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="輸入新型號名稱"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
              />
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
                    <button
                      onClick={() => handleDelete(model.id, model.model_name)}
                      className="ml-0.5 hover:text-destructive transition-colors"
                    >
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

  useAdminPage("二手文管理", "管理市集商品、審核與型號");

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
        <TabsTrigger value="listings" className="gap-1.5">
          <ShoppingBag className="h-4 w-4" />
          商品管理
        </TabsTrigger>
        <TabsTrigger value="models" className="gap-1.5">
          <Tag className="h-4 w-4" />
          型號管理
        </TabsTrigger>
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

    </Tabs>
  );
}
