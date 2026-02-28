import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MessageSquare, Clock, TrendingUp, Loader2, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useForumCategories, ForumCategorySidebar } from "@/components/forums/ForumCategorySelector";
import { TopicList, type ForumTopic } from "@/components/forums/TopicList";
import { TagInput } from "@/components/forums/TagInput";

export default function Forums() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", content: "", category: "", brand: "" });
  const [newTopicTags, setNewTopicTags] = useState<string[]>([]);

  const { data: categories } = useForumCategories();

  // Fetch topics
  const { data: topics, isLoading } = useQuery({
    queryKey: ["forum-topics"],
    queryFn: async () => {
      const { data: topicsData, error } = await supabase
        .from("forum_topics")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const userIds = [...new Set(topicsData.map((t) => t.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

      // Fetch tags for topics
      const topicIds = topicsData.map((t) => t.id);
      const { data: contentTags } = await supabase
        .from("content_tags" as any)
        .select("content_id, tag_id")
        .eq("content_type", "forum_topic")
        .in("content_id", topicIds);

      let tagMap = new Map<string, string[]>();
      if (contentTags && (contentTags as any[]).length > 0) {
        const tagIds = [...new Set((contentTags as any[]).map((ct: any) => ct.tag_id))];
        const { data: tagsData } = await supabase
          .from("tags" as any)
          .select("id, name")
          .in("id", tagIds);
        const tagNameMap = new Map((tagsData as any[] || []).map((t: any) => [t.id, t.name]));
        for (const ct of contentTags as any[]) {
          const name = tagNameMap.get(ct.tag_id);
          if (name) {
            const existing = tagMap.get(ct.content_id) || [];
            existing.push(name);
            tagMap.set(ct.content_id, existing);
          }
        }
      }

      return topicsData.map((topic) => ({
        ...topic,
        profiles: profilesMap.get(topic.user_id),
        tags: tagMap.get(topic.id) || [],
      })) as ForumTopic[];
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["forum-stats"],
    queryFn: async () => {
      const { count: topicCount } = await supabase.from("forum_topics").select("*", { count: "exact", head: true });
      const { count: replyCount } = await supabase.from("forum_replies").select("*", { count: "exact", head: true });
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return { topics: topicCount || 0, replies: replyCount || 0, users: userCount || 0 };
    },
  });

  // Popular tags
  const { data: popularTags } = useQuery({
    queryKey: ["popular-tags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tags" as any)
        .select("*")
        .order("usage_count", { ascending: false })
        .limit(10);
      return (data as any[] || []) as { id: string; name: string; usage_count: number }[];
    },
  });

  // Create topic
  const createTopicMutation = useMutation({
    mutationFn: async (topicData: typeof newTopic) => {
      if (!user) throw new Error("請先登入");
      const { data, error } = await supabase
        .from("forum_topics")
        .insert({
          title: topicData.title,
          content: topicData.content,
          category: topicData.category,
          brand: topicData.brand || null,
          user_id: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Save tags
      if (newTopicTags.length > 0) {
        for (const tagName of newTopicTags) {
          // Upsert tag
          const { data: existingTag } = await supabase
            .from("tags" as any)
            .select("id")
            .eq("name", tagName)
            .maybeSingle();
          let tagId: string;
          if (existingTag) {
            tagId = (existingTag as any).id;
          } else {
            const { data: newTag } = await supabase
              .from("tags" as any)
              .insert({ name: tagName, slug: tagName.toLowerCase().replace(/\s+/g, "-") } as any)
              .select("id")
              .single();
            tagId = (newTag as any).id;
          }
          await supabase.from("content_tags" as any).insert({
            tag_id: tagId, content_id: data.id, content_type: "forum_topic",
          } as any);
        }
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["forum-topics"] });
      toast.success("主題發表成功");
      setShowCreateDialog(false);
      setNewTopic({ title: "", content: "", category: "", brand: "" });
      setNewTopicTags([]);
      navigate(`/forums/topic/${data.id}`);
    },
    onError: (error) => toast.error("發表失敗：" + (error as Error).message),
  });

  // Filter topics
  const filteredTopics = topics?.filter((topic) => {
    if (searchQuery && !topic.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedTag && !(topic.tags || []).includes(selectedTag)) return false;
    if (selectedCategory) {
      const cat = categories?.find((c) => c.id === selectedCategory);
      if (cat) {
        if (selectedSubCategory) {
          const sub = cat.children?.find((s) => s.id === selectedSubCategory);
          if (sub && topic.brand !== sub.name && topic.category !== sub.name) return false;
        } else if (topic.category !== cat.name) return false;
      }
    }
    return true;
  });

  const hotTopics = filteredTopics?.filter((t) => (t.reply_count || 0) > 10);
  const unansweredTopics = filteredTopics?.filter((t) => (t.reply_count || 0) === 0);

  const topicCounts: Record<string, number> = {};
  topics?.forEach((t) => { topicCounts[t.category] = (topicCounts[t.category] || 0) + 1; });

  const handleCreateTopic = () => {
    if (!user) { toast.error("請先登入"); navigate("/auth"); return; }
    setShowCreateDialog(true);
  };

  const handleSubmitTopic = () => {
    if (!newTopic.title.trim()) { toast.error("請輸入標題"); return; }
    if (!newTopic.content.trim()) { toast.error("請輸入內容"); return; }
    if (!newTopic.category) { toast.error("請選擇分類"); return; }
    createTopicMutation.mutate(newTopic);
  };

  const allCategories = categories?.flatMap((c) => [c, ...(c.children || [])]) || [];

  return (
    <MainLayout>
      <section className="bg-gradient-hero py-16">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-4">
                討論<span className="text-gradient">區</span>
              </h1>
              <p className="text-lg text-muted-foreground">與攝影同好交流心得、分享經驗、討論器材</p>
            </div>
            <Button variant="hero" size="lg" className="gap-2 w-fit" onClick={handleCreateTopic}>
              <Plus className="h-5 w-5" />發表新主題
            </Button>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜尋主題..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>

              <ForumCategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                selectedSubCategory={selectedSubCategory}
                onSelectCategory={setSelectedCategory}
                onSelectSubCategory={setSelectedSubCategory}
                topicCounts={topicCounts}
              />

              {/* Tags */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" />熱門標籤
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTag === tag.name ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                    >
                      #{tag.name}
                      <span className="ml-1 text-xs opacity-60">{tag.usage_count}</span>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-4">論壇統計</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">總主題</span>
                    <span className="font-medium">{stats?.topics?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">總回覆</span>
                    <span className="font-medium">{stats?.replies?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">會員數</span>
                    <span className="font-medium">{stats?.users?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3">
            {selectedTag && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">篩選標籤：</span>
                <Badge variant="default" className="gap-1">
                  #{selectedTag}
                  <button onClick={() => setSelectedTag(null)} className="ml-1 hover:text-destructive">✕</button>
                </Badge>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="latest" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="latest" className="gap-2"><Clock className="h-4 w-4" />最新</TabsTrigger>
                  <TabsTrigger value="hot" className="gap-2"><TrendingUp className="h-4 w-4" />熱門</TabsTrigger>
                  <TabsTrigger value="unanswered" className="gap-2"><MessageSquare className="h-4 w-4" />待回覆</TabsTrigger>
                </TabsList>
                <TabsContent value="latest"><TopicList topics={filteredTopics} onTagClick={setSelectedTag} /></TabsContent>
                <TabsContent value="hot"><TopicList topics={hotTopics} onTagClick={setSelectedTag} /></TabsContent>
                <TabsContent value="unanswered"><TopicList topics={unansweredTopics} onTagClick={setSelectedTag} /></TabsContent>
              </Tabs>
            )}
          </main>
        </div>
      </div>

      {/* Create Topic Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>發表新主題</DialogTitle>
            <DialogDescription>分享你的想法、問題或心得</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>分類 *</Label>
              <Select value={newTopic.category} onValueChange={(v) => setNewTopic({ ...newTopic, category: v })}>
                <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>品牌/子分類</Label>
              <Select
                value={newTopic.brand || ""}
                onValueChange={(v) => setNewTopic({ ...newTopic, brand: v === "none" ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="選擇品牌（選填）" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不指定</SelectItem>
                  {categories
                    ?.find((c) => c.name === newTopic.category)
                    ?.children?.map((sub) => (
                      <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>標題 *</Label>
              <Input placeholder="輸入主題標題" value={newTopic.title} onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>標籤</Label>
              <TagInput tags={newTopicTags} onChange={setNewTopicTags} />
            </div>
            <div className="space-y-2">
              <Label>內容 *</Label>
              <Textarea placeholder="分享你的想法..." value={newTopic.content} onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })} rows={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>取消</Button>
            <Button onClick={handleSubmitTopic} disabled={createTopicMutation.isPending}>
              {createTopicMutation.isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />發表中...</>) : "發表主題"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
