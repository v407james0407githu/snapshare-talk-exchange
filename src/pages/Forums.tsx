import { useEffect, useState } from "react";
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
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import { Search, Plus, MessageSquare, Clock, TrendingUp, Loader2, Tag, ArrowUpDown, Eye } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useForumCategories, ForumCategorySidebar } from "@/components/forums/ForumCategorySelector";
import { TopicList, type ForumTopic } from "@/components/forums/TopicList";
import { TagInput } from "@/components/forums/TagInput";
import { ForumImageUpload, useTextareaDrop, filesToItems, uploadPendingItems, type ImageItem } from "@/components/forums/ForumImageUpload";
import { prefetchForumTopicBundle } from "@/lib/forumTopicPrefetch";

const TOPICS_PER_PAGE = 24;

export default function Forums() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", content: "", category: "", brand: "" });
  const [newTopicTags, setNewTopicTags] = useState<string[]>([]);
  const [newTopicImages, setNewTopicImages] = useState<ImageItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>("latest");


  const handleDragUploadFiles = (files: File[]) => {
    const remaining = 5 - newTopicImages.length;
    if (remaining <= 0) { toast.error('最多只能上傳 5 張圖片'); return; }
    const newItems = filesToItems(files).slice(0, remaining);
    if (newItems.length > 0) {
      setNewTopicImages(prev => [...prev, ...newItems]);
    }
  };

  const contentDrag = useTextareaDrop(handleDragUploadFiles, false);

  const { data: categories, isLoading: categoriesLoading } = useForumCategories();

  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (!categoryParam || !categories?.length) return;

    const matchedCategory = categories.find(
      (category) => category.slug === categoryParam || category.name === categoryParam,
    );
    if (matchedCategory && matchedCategory.id !== selectedCategory) {
      setSelectedCategory(matchedCategory.id);
      setSelectedSubCategory(null);
      setCurrentPage(1);
    }
  }, [categories, searchParams, selectedCategory]);

  // Fetch topics
  const { data: topics, isLoading } = useQuery({
    queryKey: ["forum-topics"],
    queryFn: async () => {
      const { data: topicsData, error } = await supabase
        .from("forum_topics")
        .select("id, title, content, category, brand, user_id, reply_count, view_count, is_pinned, is_locked, created_at, last_reply_at, category_id")
        .eq("is_hidden", false)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;

      const userIds = [...new Set(topicsData.map((t) => t.user_id))];
      const { data: profilesData, error: profilesError } = userIds.length
        ? await supabase.rpc("get_public_profiles")
        : { data: [], error: null };
      if (profilesError) throw profilesError;

      const filteredProfiles = ((profilesData as Array<{
        user_id: string;
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }> | null) || []).filter((p) => userIds.includes(p.user_id));

      const profilesMap = new Map(filteredProfiles.map((p) => [p.user_id, p]));

      // Fetch tags for topics
      const topicIds = topicsData.map((t) => t.id);
      const { data: contentTags } = await supabase
        .from("content_tags" as any)
        .select("content_id, tag_id")
        .eq("content_type", "forum_topic")
        .in("content_id", topicIds);

      const tagMap = new Map<string, string[]>();
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
        profiles: profilesMap.get(topic.user_id)
          ? {
              ...profilesMap.get(topic.user_id),
              username:
                profilesMap.get(topic.user_id)?.username?.trim() ||
                profilesMap.get(topic.user_id)?.display_name?.trim() ||
                `會員 ${topic.user_id.slice(0, 8)}`,
              display_name: profilesMap.get(topic.user_id)?.display_name?.trim() || null,
            }
          : {
              username: `會員 ${topic.user_id.slice(0, 8)}`,
              display_name: null,
              avatar_url: null,
            },
        tags: tagMap.get(topic.id) || [],
      })) as ForumTopic[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  useEffect(() => {
    (topics || []).slice(0, 3).forEach((topic) => {
      void prefetchForumTopicBundle(topic.id, topic);
    });
  }, [topics]);

  // Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["forum-stats"],
    queryFn: async () => {
      const { count: topicCount } = await supabase.from("forum_topics").select("*", { count: "exact", head: true });
      const { count: replyCount } = await supabase.from("forum_replies").select("*", { count: "exact", head: true });
      const { count: userCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return { topics: topicCount || 0, replies: replyCount || 0, users: userCount || 0 };
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  // Popular tags
  const { data: popularTags, isLoading: popularTagsLoading } = useQuery({
    queryKey: ["popular-tags"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tags" as any)
        .select("*")
        .order("usage_count", { ascending: false })
        .limit(10);
      return (data as any[] || []) as { id: string; name: string; usage_count: number }[];
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 20,
  });

  // Create topic
  const createTopicMutation = useMutation({
    mutationFn: async (topicData: typeof newTopic) => {
      if (!user) throw new Error("請先登入");
      // Upload pending images first
      const imageUrls = newTopicImages.length > 0 ? await uploadPendingItems(newTopicImages) : null;
      const { data, error } = await supabase
        .from("forum_topics")
        .insert({
          title: topicData.title,
          content: topicData.content,
          category: topicData.category,
          brand: topicData.brand || null,
          user_id: user.id,
          image_urls: imageUrls,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Save tags
      if (newTopicTags.length > 0) {
        for (const tagName of newTopicTags) {
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
      setNewTopicImages([]);
      navigate(`/forums/topic/${data.id}`);
    },
    onError: (error) => toast.error("發表失敗：" + (error as Error).message),
  });

  // Sort helper
  const sortTopics = (list: ForumTopic[] | undefined) => {
    if (!list) return undefined;
    const sorted = [...list];
    switch (sortBy) {
      case "last_reply":
        sorted.sort((a, b) => {
          const aTime = a.last_reply_at || a.created_at;
          const bTime = b.last_reply_at || b.created_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });
        break;
      case "most_views":
        sorted.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case "most_replies":
        sorted.sort((a, b) => (b.reply_count || 0) - (a.reply_count || 0));
        break;
      // "latest" is default order from DB (created_at desc)
      default:
        break;
    }
    // Keep pinned at top
    return sorted.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
  };

  // Filter topics
  const filteredTopics = sortTopics(topics?.filter((topic) => {
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
  }));

  const hotTopics = filteredTopics?.filter((t) => (t.reply_count || 0) > 10);
  const unansweredTopics = filteredTopics?.filter((t) => (t.reply_count || 0) === 0);

  // Pagination helper
  const paginateTopics = (list: ForumTopic[] | undefined) => {
    if (!list) return { items: [], totalPages: 0 };
    const totalPages = Math.max(1, Math.ceil(list.length / TOPICS_PER_PAGE));
    const start = (currentPage - 1) * TOPICS_PER_PAGE;
    return { items: list.slice(start, start + TOPICS_PER_PAGE), totalPages };
  };

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

  // Reset page when filters change
  const handleCategoryChange = (catId: string | null) => {
    setSelectedCategory(catId);
    const next = new URLSearchParams(searchParams);
    const category = categories?.find((cat) => cat.id === catId);
    if (category) next.set("category", category.slug);
    else next.delete("category");
    next.delete("subCategory");
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  };
  const handleSubCategoryChange = (subId: string | null) => {
    setSelectedSubCategory(subId);
    const next = new URLSearchParams(searchParams);
    if (subId) next.set("subCategory", subId);
    else next.delete("subCategory");
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  };
  const handleTagChange = (tag: string | null) => {
    setSelectedTag(tag);
    setCurrentPage(1);
  };

  const renderPagination = (totalPages: number) => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages.map((page, i) =>
            page === 'ellipsis' ? (
              <PaginationItem key={`e${i}`}><PaginationEllipsis /></PaginationItem>
            ) : (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={currentPage === page}
                  onClick={() => setCurrentPage(page)}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const renderTabContent = (list: ForumTopic[] | undefined) => {
    const { items, totalPages } = paginateTopics(list);
    return (
      <>
        <TopicList topics={items} onTagClick={handleTagChange} />
        {renderPagination(totalPages)}
      </>
    );
  };

  const topicSkeletons = Array.from({ length: 6 }, (_, idx) => idx);

  return (
    <MainLayout>
      <section className="bg-gradient-hero py-16">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-4">
                討論<span className="text-gradient">區</span>
              </h1>
              <p className="text-lg text-muted-foreground">與攝影同好交流心得、分享經驗、探討攝影</p>
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
                <Input placeholder="搜尋主題..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10" />
              </div>

              <ForumCategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                selectedSubCategory={selectedSubCategory}
                onSelectCategory={handleCategoryChange}
                onSelectSubCategory={handleSubCategoryChange}
                topicCounts={topicCounts}
              />

              {/* Tags */}
              <div className="bg-card rounded-xl border border-border p-4 motion-panel">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" />熱門標籤
                </h3>
                {popularTagsLoading ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 6 }, (_, idx) => (
                      <div key={idx} className="h-7 w-20 animate-pulse rounded-full bg-muted" />
                    ))}
                  </div>
                ) : (
                <div className="flex flex-wrap gap-2">
                  {popularTags?.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={selectedTag === tag.name ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => handleTagChange(selectedTag === tag.name ? null : tag.name)}
                    >
                      #{tag.name}
                      <span className="ml-1 text-xs opacity-60">{tag.usage_count}</span>
                    </Badge>
                  ))}
                </div>
                )}
              </div>

              <div className="bg-card rounded-xl border border-border p-4 motion-panel">
                <h3 className="font-semibold mb-4">論壇統計</h3>
                {statsLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              {selectedTag ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">篩選標籤：</span>
                  <Badge variant="default" className="gap-1">
                    #{selectedTag}
                    <button onClick={() => handleTagChange(null)} className="ml-1 hover:text-destructive">✕</button>
                  </Badge>
                </div>
              ) : <div />}
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">最新發表</SelectItem>
                    <SelectItem value="last_reply">最新回覆</SelectItem>
                    <SelectItem value="most_views">最多瀏覽</SelectItem>
                    <SelectItem value="most_replies">最多回覆</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading || categoriesLoading ? (
              <div className="space-y-4">
                <div className="h-10 w-72 animate-pulse rounded-xl bg-muted" />
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="hidden md:grid grid-cols-12 gap-4 border-b border-border bg-muted/40 px-6 py-3">
                    <div className="col-span-7 h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="col-span-2 mx-auto h-4 w-12 animate-pulse rounded bg-muted" />
                    <div className="col-span-3 ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="divide-y divide-border">
                    {topicSkeletons.map((idx) => (
                      <div key={idx} className="px-6 py-4">
                        <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                          <div className="col-span-7 flex items-start gap-3">
                            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex gap-2">
                                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                                <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
                              </div>
                              <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
                              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                            </div>
                          </div>
                          <div className="col-span-2 hidden md:flex justify-center">
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                          </div>
                          <div className="col-span-3 hidden md:flex justify-end">
                            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="latest" className="space-y-6" onValueChange={() => setCurrentPage(1)}>
                <TabsList>
                  <TabsTrigger value="latest" className="gap-2"><Clock className="h-4 w-4" />最新</TabsTrigger>
                  <TabsTrigger value="hot" className="gap-2"><TrendingUp className="h-4 w-4" />熱門</TabsTrigger>
                  <TabsTrigger value="unanswered" className="gap-2"><MessageSquare className="h-4 w-4" />待回覆</TabsTrigger>
                </TabsList>
                <TabsContent value="latest">{renderTabContent(filteredTopics)}</TabsContent>
                <TabsContent value="hot">{renderTabContent(hotTopics)}</TabsContent>
                <TabsContent value="unanswered">{renderTabContent(unansweredTopics)}</TabsContent>
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
              <div
                className={`relative rounded-md transition-colors ${contentDrag.dragOver ? 'ring-2 ring-primary' : ''}`}
                {...contentDrag.handlers}
              >
                <Textarea placeholder="分享你的想法...（可拖拉圖片到此處上傳）" value={newTopic.content} onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })} rows={6} />
                {contentDrag.dragOver && (
                  <div className="absolute inset-0 bg-primary/10 rounded-md flex items-center justify-center pointer-events-none">
                    <span className="text-primary font-medium text-sm">放開以上傳圖片</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>附加圖片</Label>
              <ForumImageUpload items={newTopicImages} onItemsChange={setNewTopicImages} disabled={createTopicMutation.isPending} />
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
