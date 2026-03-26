import { useState, useEffect, useCallback } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, ShoppingBag, CheckCircle, EyeOff, Eye, DollarSign, Package, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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

export default function CommunityMarketplace() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "sold" | "hidden">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setListings([]);
    setPage(0);
    setHasMore(true);
  }, [debouncedSearch, filter]);

  const fetchListings = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const from = p * PAGE_SIZE;
      let query = supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);

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
        const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", userIds);
        profiles?.forEach((p: any) => profileMap.set(p.user_id, p.display_name || p.username));
      }

      const mapped: ListingRow[] = (data || []).map((l: any) => ({
        ...l,
        is_sold: l.is_sold ?? false,
        is_hidden: l.is_hidden ?? false,
        is_verified: l.is_verified ?? false,
        view_count: l.view_count ?? 0,
        currency: l.currency ?? "TWD",
        author_name: profileMap.get(l.user_id) || "未知",
      }));

      if (p === 0) setListings(mapped);
      else setListings(prev => [...prev, ...mapped]);
      setHasMore(mapped.length === PAGE_SIZE);
    } catch {
      toast.error("載入商品失敗");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filter]);

  useEffect(() => { fetchListings(page); }, [page, fetchListings]);

  const toggleField = async (listing: ListingRow, field: "is_verified" | "is_hidden" | "is_sold") => {
    setTogglingIds(prev => new Set(prev).add(listing.id));
    const newVal = !listing[field];
    const { error } = await supabase.from("marketplace_listings").update({ [field]: newVal }).eq("id", listing.id);
    if (error) {
      toast.error("操作失敗");
    } else {
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, [field]: newVal } : l));
      const labels: Record<string, [string, string]> = {
        is_verified: ["已審核通過", "已取消審核"],
        is_hidden: ["已下架", "已恢復上架"],
        is_sold: ["已標記售出", "已取消售出"],
      };
      toast.success(newVal ? labels[field][0] : labels[field][1]);
    }
    setTogglingIds(prev => { const n = new Set(prev); n.delete(listing.id); return n; });
  };

  const stats = {
    total: listings.length,
    pending: listings.filter(l => !l.is_verified && !l.is_sold).length,
    verified: listings.filter(l => l.is_verified).length,
    sold: listings.filter(l => l.is_sold).length,
  };

  const conditionLabel: Record<string, string> = {
    new: "全新", like_new: "幾乎全新", good: "良好", fair: "尚可", poor: "較差",
  };

  return (
    <AdminLayout title="市集管理" subtitle="管理二手市集商品：審核、下架、標記售出">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "全部商品", value: stats.total, icon: ShoppingBag },
          { label: "待審核", value: stats.pending, icon: Package },
          { label: "已驗證", value: stats.verified, icon: ShieldCheck },
          { label: "已售出", value: stats.sold, icon: CheckCircle },
        ].map(s => (
          <div key={s.label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted"><s.icon className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜尋商品標題..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待審核</SelectItem>
            <SelectItem value="verified">已驗證</SelectItem>
            <SelectItem value="sold">已售出</SelectItem>
            <SelectItem value="hidden">已下架</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading && listings.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : listings.length === 0 ? (
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
                {listings.map(listing => (
                  <TableRow key={listing.id} className={listing.is_hidden ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm line-clamp-1">{listing.title}</span>
                          {listing.is_sold && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">已售出</Badge>}
                          {listing.is_verified && <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-primary"><ShieldCheck className="h-2.5 w-2.5" />已驗證</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{listing.author_name} · {listing.category}{listing.brand ? ` · ${listing.brand}` : ""}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-medium">${listing.price.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">{conditionLabel[listing.condition] || listing.condition}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setPreviewImage(listing.verification_image_url)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={listing.is_verified} onCheckedChange={() => toggleField(listing, "is_verified")} disabled={togglingIds.has(listing.id)} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={listing.is_hidden} onCheckedChange={() => toggleField(listing, "is_hidden")} disabled={togglingIds.has(listing.id)} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch checked={listing.is_sold} onCheckedChange={() => toggleField(listing, "is_sold")} disabled={togglingIds.has(listing.id)} />
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
              <Button variant="outline" onClick={() => setPage(p => p + 1)} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}載入更多
              </Button>
            </div>
          )}
        </>
      )}

      {/* Verification Image Preview */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>驗證圖片</DialogTitle></DialogHeader>
          {previewImage && <img src={previewImage} alt="驗證圖片" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
