import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Category {
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

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  color: "green",
  parent_id: "",
  sort_order: 0,
  is_active: true,
};

export default function CategoryManagement() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data as unknown as Category[]) ?? [];
    },
  });

  const mainCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof emptyForm & { id?: string }) => {
      const payload = {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        icon: values.icon || null,
        color: values.color || null,
        parent_id: values.parent_id || null,
        sort_order: values.sort_order,
        is_active: values.is_active,
      };
      if (values.id) {
        const { error } = await supabase.from("forum_categories" as any).update(payload as any).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("forum_categories" as any).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success(editingId ? "分類已更新" : "分類已新增");
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error("操作失敗"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_categories" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("分類已刪除");
    },
    onError: () => toast.error("刪除失敗"),
  });

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      icon: cat.icon ?? "",
      color: cat.color ?? "green",
      parent_id: cat.parent_id ?? "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug) { toast.error("名稱與代碼為必填"); return; }
    saveMutation.mutate(editingId ? { ...form, id: editingId } : form);
  };

  return (
    <AdminLayout title="分類管理" subtitle="管理討論區分類與子分類">
      <div className="flex justify-end mb-6">
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />新增分類</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "編輯分類" : "新增分類"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>名稱 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>代碼 (slug) *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="例如：mobile-apple" />
              </div>
              <div>
                <Label>說明</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>圖示（Emoji 或圖示名稱）</Label>
                  <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="例如：🍎 或 Camera" />
                </div>
                <div>
                  <Label>顏色</Label>
                  <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
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
                <Label>父分類（留空為主分類）</Label>
                <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="主分類" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">主分類</SelectItem>
                    {mainCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>排序</Label>
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
      ) : (
        <div className="space-y-4">
          {mainCategories.map((cat) => (
            <div key={cat.id}>
              <Card className={!cat.is_active ? "opacity-50" : ""}>
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{cat.name}</h3>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                    <span className="text-xs text-muted-foreground">slug: {cat.slug} · 排序: {cat.sort_order}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="icon" onClick={() => openEdit(cat)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="text-destructive" onClick={() => { if (confirm("確定刪除？子分類也會一併刪除")) deleteMutation.mutate(cat.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              {/* Sub-categories */}
              {getChildren(cat.id).length > 0 && (
                <div className="ml-8 mt-2 space-y-2">
                  {getChildren(cat.id).map((sub) => (
                    <Card key={sub.id} className={`${!sub.is_active ? "opacity-50" : ""}`}>
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
    </AdminLayout>
  );
}
