import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Loader2, Smartphone, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export default function ModelManagement() {
  useAdminPage("型號管理", "管理各品牌的產品型號清單");

  const { toast } = useToast();
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
        .from("brand_models" as any)
        .select("*")
        .eq("category", selectedCategory)
        .eq("brand", selectedBrand)
        .order("sort_order");
      if (error) throw error;
      return (data as unknown as BrandModel[]) || [];
    },
    enabled: !!selectedBrand,
    staleTime: 60 * 1000,
  });

  const handleAdd = async () => {
    if (!newModelName.trim() || !selectedBrand) return;
    setAdding(true);
    try {
      const maxSort = models?.length ? Math.max(...models.map((m) => m.sort_order)) : 0;
      const { error } = await supabase.from("brand_models" as any).insert({
        category: selectedCategory,
        brand: selectedBrand,
        model_name: newModelName.trim(),
        sort_order: maxSort + 1,
      } as any);
      if (error) throw error;
      setNewModelName("");
      queryClient.invalidateQueries({ queryKey: ["admin-brand-models", selectedCategory, selectedBrand] });
      queryClient.invalidateQueries({ queryKey: ["brand-models"] });
      toast({ title: "新增成功" });
    } catch (err: any) {
      toast({ title: "新增失敗", description: err.message?.includes("unique") ? "此型號已存在" : err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？`)) return;
    const { error } = await supabase.from("brand_models" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "刪除失敗", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-brand-models", selectedCategory, selectedBrand] });
    queryClient.invalidateQueries({ queryKey: ["brand-models"] });
    toast({ title: "已刪除" });
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
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
                  onClick={() => { setSelectedCategory("phone"); setSelectedBrand(""); }}
                >
                  <Smartphone className="mr-1.5 h-4 w-4" /> 手機
                </Button>
                <Button
                  type="button"
                  variant={selectedCategory === "camera" ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setSelectedCategory("camera"); setSelectedBrand(""); }}
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
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Models List */}
      {selectedBrand && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {brands?.find((b) => b.value === selectedBrand)?.label || selectedBrand} 型號列表
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new */}
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

            {/* List */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : models && models.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border">
                {models.map((model, idx) => (
                  <div key={model.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-6 text-right">{idx + 1}.</span>
                      <span className="text-sm font-medium">{model.model_name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(model.id, model.model_name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
