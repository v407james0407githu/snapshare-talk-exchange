import { useState, useEffect } from "react";
import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Pin, Lock, EyeOff, Loader2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface TopicRow {
  id: string; title: string; category: string; user_id: string;
  reply_count: number; view_count: number;
  is_pinned: boolean; is_locked: boolean; is_hidden: boolean;
  created_at: string; last_reply_at: string | null; author_name?: string;
}

const PAGE_SIZE = 30;
const STALE_TIME = 3 * 60 * 1000;

async function fetchTopicsPage(debouncedSearch: string, filter: string, page: number): Promise<TopicRow[]> {
  const from = page * PAGE_SIZE;
  let query = supabase.from("forum_topics").select("*").order("created_at", { ascending: false }).range(from, from + PAGE_SIZE - 1);
  if (filter === "pinned") query = query.eq("is_pinned", true);
  if (filter === "locked") query = query.eq("is_locked", true);
  if (filter === "hidden") query = query.eq("is_hidden", true);
  if (debouncedSearch) query = query.ilike("title", `%${debouncedSearch}%`);

  const { data, error } = await query;
  if (error) throw error;

  const userIds = [...new Set((data || []).map((t: any) => t.user_id))];
  const profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", userIds);
    profiles?.forEach((p: any) => profileMap.set(p.user_id, p.display_name || p.username));
  }

  return (data || []).map((t: any) => ({
    ...t,
    is_pinned: t.is_pinned ?? false, is_locked: t.is_locked ?? false, is_hidden: t.is_hidden ?? false,
    reply_count: t.reply_count ?? 0, view_count: t.view_count ?? 0,
    author_name: profileMap.get(t.user_id) || "未知",
  }));
}

export default function CommunityForums() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "locked" | "hidden">("all");
  const [page, setPage] = useState(0);
  const [allTopics, setAllTopics] = useState<TopicRow[]>([]);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useAdminPage("社群討論管理", "管理論壇討論主題");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setAllTopics([]);
    setPage(0);
  }, [debouncedSearch, filter]);

  const { data: pageData, isLoading: loading } = useQuery({
    queryKey: ["admin-forums", debouncedSearch, filter, page],
    queryFn: () => fetchTopicsPage(debouncedSearch, filter, page),
    staleTime: STALE_TIME,
  });

  // Accumulate pages
  useEffect(() => {
    if (pageData) {
      if (page === 0) setAllTopics(pageData);
      else setAllTopics(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        return [...prev, ...pageData.filter(t => !existingIds.has(t.id))];
      });
    }
  }, [pageData, page]);

  const hasMore = (pageData?.length || 0) === PAGE_SIZE;

  const toggle = async (topic: TopicRow, field: "is_pinned" | "is_locked" | "is_hidden") => {
    setTogglingIds(prev => new Set(prev).add(topic.id));
    const newVal = !topic[field];
    const { error } = await supabase.from("forum_topics").update({ [field]: newVal }).eq("id", topic.id);
    if (error) {
      toast.error("操作失敗");
    } else {
      setAllTopics(prev => prev.map(t => t.id === topic.id ? { ...t, [field]: newVal } : t));
      const labels: Record<string, [string, string]> = {
        is_pinned: ["已置頂", "已取消置頂"], is_locked: ["已鎖定", "已解鎖"], is_hidden: ["已隱藏", "已恢復顯示"],
      };
      toast.success(newVal ? labels[field][0] : labels[field][1]);
    }
    setTogglingIds(prev => { const n = new Set(prev); n.delete(topic.id); return n; });
  };

  const stats = {
    total: allTopics.length,
    pinned: allTopics.filter(t => t.is_pinned).length,
    locked: allTopics.filter(t => t.is_locked).length,
    hidden: allTopics.filter(t => t.is_hidden).length,
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "討論主題", value: stats.total, icon: MessageSquare },
          { label: "置頂中", value: stats.pinned, icon: Pin },
          { label: "已鎖定", value: stats.locked, icon: Lock },
          { label: "已隱藏", value: stats.hidden, icon: EyeOff },
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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜尋主題標題..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pinned">置頂中</SelectItem>
            <SelectItem value="locked">已鎖定</SelectItem>
            <SelectItem value="hidden">已隱藏</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading && allTopics.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : allTopics.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">沒有找到符合條件的討論</div>
      ) : (
        <>
          <div className="border rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[250px]">主題</TableHead>
                  <TableHead className="w-20 text-center">回覆</TableHead>
                  <TableHead className="w-20 text-center">瀏覽</TableHead>
                  <TableHead className="w-24 text-center">置頂</TableHead>
                  <TableHead className="w-24 text-center">鎖定</TableHead>
                  <TableHead className="w-24 text-center">隱藏</TableHead>
                  <TableHead className="w-28">發表時間</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTopics.map(topic => (
                  <TableRow key={topic.id} className={topic.is_hidden ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm line-clamp-1">{topic.title}</span>
                          {topic.is_pinned && <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0"><Pin className="h-2.5 w-2.5" />置頂</Badge>}
                          {topic.is_locked && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 shrink-0"><Lock className="h-2.5 w-2.5" />鎖定</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{topic.author_name} · {topic.category}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">{topic.reply_count}</TableCell>
                    <TableCell className="text-center text-sm">{topic.view_count}</TableCell>
                    <TableCell className="text-center"><Switch checked={topic.is_pinned} onCheckedChange={() => toggle(topic, "is_pinned")} disabled={togglingIds.has(topic.id)} /></TableCell>
                    <TableCell className="text-center"><Switch checked={topic.is_locked} onCheckedChange={() => toggle(topic, "is_locked")} disabled={togglingIds.has(topic.id)} /></TableCell>
                    <TableCell className="text-center"><Switch checked={topic.is_hidden} onCheckedChange={() => toggle(topic, "is_hidden")} disabled={togglingIds.has(topic.id)} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(topic.created_at), "yyyy/MM/dd")}</TableCell>
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
    </>
  );
}
