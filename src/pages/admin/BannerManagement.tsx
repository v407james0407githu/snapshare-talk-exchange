import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_primary_text: string | null;
  cta_primary_link: string | null;
  cta_secondary_text: string | null;
  cta_secondary_link: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const emptyForm = {
  title: "",
  subtitle: "",
  image_url: "",
  cta_primary_text: "",
  cta_primary_link: "",
  cta_secondary_text: "",
  cta_secondary_link: "",
  sort_order: 0,
  is_active: true,
};

export default function BannerManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data as unknown as Banner[]) ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof emptyForm & { id?: string }) => {
      const payload = {
        title: values.title,
        subtitle: values.subtitle || null,
        image_url: values.image_url,
        cta_primary_text: values.cta_primary_text || null,
        cta_primary_link: values.cta_primary_link || null,
        cta_secondary_text: values.cta_secondary_text || null,
        cta_secondary_link: values.cta_secondary_link || null,
        sort_order: values.sort_order,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase
          .from("hero_banners" as any)
          .update(payload as any)
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("hero_banners" as any)
          .insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["hero-banners"] });
      toast.success(editingId ? "Banner 已更新" : "Banner 已新增");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("操作失敗"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hero_banners" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      queryClient.invalidateQueries({ queryKey: ["hero-banners"] });
      toast.success("Banner 已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      image_url: banner.image_url,
      cta_primary_text: banner.cta_primary_text ?? "",
      cta_primary_link: banner.cta_primary_link ?? "",
      cta_secondary_text: banner.cta_secondary_text ?? "",
      cta_secondary_link: banner.cta_secondary_link ?? "",
      sort_order: banner.sort_order,
      is_active: banner.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.image_url) {
      toast.error("標題與圖片網址為必填");
      return;
    }
    saveMutation.mutate(editingId ? { ...form, id: editingId } : form);
  };

  return (
    <AdminLayout title="Banner管理" subtitle="管理首頁輪播橫幅">
      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />新增 Banner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "編輯 Banner" : "新增 Banner"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>標題 *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>副標題</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
              </div>
              <div>
                <Label>圖片網址 *</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="mt-2 rounded-lg h-32 w-full object-cover" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>主按鈕文字</Label>
                  <Input value={form.cta_primary_text} onChange={(e) => setForm({ ...form, cta_primary_text: e.target.value })} />
                </div>
                <div>
                  <Label>主按鈕連結</Label>
                  <Input value={form.cta_primary_link} onChange={(e) => setForm({ ...form, cta_primary_link: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>副按鈕文字</Label>
                  <Input value={form.cta_secondary_text} onChange={(e) => setForm({ ...form, cta_secondary_text: e.target.value })} />
                </div>
                <div>
                  <Label>副按鈕連結</Label>
                  <Input value={form.cta_secondary_link} onChange={(e) => setForm({ ...form, cta_secondary_link: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>排序（數字越小越前面）</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
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
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : banners.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">尚無 Banner，請點擊上方按鈕新增</p>
      ) : (
        <div className="space-y-4">
          {banners.map((banner) => (
            <Card key={banner.id} className={!banner.is_active ? "opacity-50" : ""}>
              <CardContent className="flex items-center gap-4 p-4">
                <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                <img src={banner.image_url} alt={banner.title} className="h-16 w-28 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{banner.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{banner.subtitle}</p>
                  <span className={`text-xs ${banner.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                    {banner.is_active ? "啟用中" : "已停用"} · 排序: {banner.sort_order}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => openEdit(banner)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-destructive"
                    onClick={() => { if (confirm("確定刪除此 Banner？")) deleteMutation.mutate(banner.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
