import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Search,
  Plus,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  Pin,
  Smartphone,
  Camera,
  Coffee,
  Wrench,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

interface ForumCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  value: string;
}

interface ForumTopic {
  id: string;
  title: string;
  content: string;
  category: string;
  brand: string | null;
  user_id: string;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  last_reply_at: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const categories: ForumCategory[] = [
  {
    id: "mobile",
    value: "手機攝影",
    name: "手機攝影",
    icon: <Smartphone className="h-5 w-5" />,
    description: "iPhone、Samsung、小米、Vivo 等手機攝影討論",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  {
    id: "camera",
    value: "相機攝影",
    name: "相機攝影",
    icon: <Camera className="h-5 w-5" />,
    description: "Sony、Fujifilm、Nikon、Ricoh 等相機器材討論",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    id: "technique",
    value: "攝影技術",
    name: "攝影技術",
    icon: <Wrench className="h-5 w-5" />,
    description: "構圖、用光、後製等攝影技術交流",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  {
    id: "lounge",
    value: "哈拉打屁",
    name: "哈拉打屁",
    icon: <Coffee className="h-5 w-5" />,
    description: "輕鬆閒聊，不限攝影話題（禁政治）",
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
];

const categoryColors: Record<string, string> = {
  手機攝影: "bg-green-500/10 text-green-600",
  相機攝影: "bg-blue-500/10 text-blue-600",
  攝影技術: "bg-purple-500/10 text-purple-600",
  哈拉打屁: "bg-orange-500/10 text-orange-600",
};

export default function Forums() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: "",
    content: "",
    category: "",
    brand: "",
  });

  // Fetch topics
  const { data: topics, isLoading } = useQuery({
    queryKey: ["forum-topics"],
    queryFn: async () => {
      const { data: topicsData, error: topicsError } = await supabase
        .from("forum_topics")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (topicsError) throw topicsError;

      // Fetch profiles for all topics
      const userIds = [...new Set(topicsData.map((t) => t.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, p]) || []
      );

      return topicsData.map((topic) => ({
        ...topic,
        profiles: profilesMap.get(topic.user_id),
      })) as ForumTopic[];
    },
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["forum-stats"],
    queryFn: async () => {
      const { count: topicCount } = await supabase
        .from("forum_topics")
        .select("*", { count: "exact", head: true });

      const { count: replyCount } = await supabase
        .from("forum_replies")
        .select("*", { count: "exact", head: true });

      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      return {
        topics: topicCount || 0,
        replies: replyCount || 0,
        users: userCount || 0,
      };
    },
  });

  // Create topic mutation
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
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["forum-topics"] });
      toast.success("主題發表成功");
      setShowCreateDialog(false);
      setNewTopic({ title: "", content: "", category: "", brand: "" });
      navigate(`/forums/topic/${data.id}`);
    },
    onError: (error) => {
      toast.error("發表失敗：" + (error as Error).message);
    },
  });

  const filteredTopics = topics?.filter((topic) =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hotTopics = topics?.filter((t) => (t.reply_count || 0) > 10);
  const unansweredTopics = topics?.filter((t) => (t.reply_count || 0) === 0);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "剛剛";
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: zhTW,
    });
  };

  const handleCreateTopic = () => {
    if (!user) {
      toast.error("請先登入");
      navigate("/auth");
      return;
    }
    setShowCreateDialog(true);
  };

  const handleSubmitTopic = () => {
    if (!newTopic.title.trim()) {
      toast.error("請輸入標題");
      return;
    }
    if (!newTopic.content.trim()) {
      toast.error("請輸入內容");
      return;
    }
    if (!newTopic.category) {
      toast.error("請選擇分類");
      return;
    }
    createTopicMutation.mutate(newTopic);
  };

  const renderTopicList = (topicList: ForumTopic[] | undefined) => {
    if (!topicList?.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          目前沒有主題
        </div>
      );
    }

    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
          <div className="col-span-7">主題</div>
          <div className="col-span-2 text-center">回覆 / 瀏覽</div>
          <div className="col-span-3 text-right">最後活動</div>
        </div>

        <div className="divide-y divide-border">
          {topicList.map((topic) => (
            <Link
              key={topic.id}
              to={`/forums/topic/${topic.id}`}
              className="block px-6 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                <div className="col-span-7">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                      {topic.profiles?.avatar_url ? (
                        <img
                          src={topic.profiles.avatar_url}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {topic.is_pinned && (
                          <Pin className="h-3.5 w-3.5 text-primary" />
                        )}
                        {(topic.reply_count || 0) > 10 && (
                          <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            categoryColors[topic.category] || "bg-muted"
                          }`}
                        >
                          {topic.category}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
                        {topic.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {topic.profiles?.display_name || topic.profiles?.username}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 hidden md:flex items-center justify-center gap-4">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    {topic.reply_count || 0}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {topic.view_count || 0}
                  </span>
                </div>

                <div className="col-span-3 hidden md:flex items-center justify-end gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatTime(topic.last_reply_at || topic.created_at)}
                </div>

                <div className="flex items-center gap-4 mt-2 md:hidden text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {topic.reply_count || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(topic.last_reply_at || topic.created_at)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-hero py-16">
        <div className="container">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-4">
                討論<span className="text-gradient">區</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                與攝影同好交流心得、分享經驗、討論器材
              </p>
            </div>
            <Button
              variant="hero"
              size="lg"
              className="gap-2 w-fit"
              onClick={handleCreateTopic}
            >
              <Plus className="h-5 w-5" />
              發表新主題
            </Button>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋主題..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-4">討論分類</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group w-full text-left"
                    >
                      <div className={`p-2 rounded-lg border ${cat.color}`}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium group-hover:text-primary transition-colors">
                          {cat.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {topics?.filter((t) => t.category === cat.value).length || 0} 主題
                        </div>
                      </div>
                    </button>
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

          {/* Main Content */}
          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs defaultValue="latest" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="latest" className="gap-2">
                    <Clock className="h-4 w-4" />
                    最新
                  </TabsTrigger>
                  <TabsTrigger value="hot" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    熱門
                  </TabsTrigger>
                  <TabsTrigger value="unanswered" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    待回覆
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="latest" className="space-y-0">
                  {renderTopicList(filteredTopics)}
                </TabsContent>

                <TabsContent value="hot" className="space-y-0">
                  {renderTopicList(hotTopics)}
                </TabsContent>

                <TabsContent value="unanswered" className="space-y-0">
                  {renderTopicList(unansweredTopics)}
                </TabsContent>
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
            <DialogDescription>
              分享你的想法、問題或心得
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category">分類 *</Label>
              <Select
                value={newTopic.category}
                onValueChange={(value) =>
                  setNewTopic({ ...newTopic, category: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.value}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">標題 *</Label>
              <Input
                id="title"
                placeholder="輸入主題標題"
                value={newTopic.title}
                onChange={(e) =>
                  setNewTopic({ ...newTopic, title: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">品牌標籤（選填）</Label>
              <Input
                id="brand"
                placeholder="例如：Sony、Apple、Fujifilm"
                value={newTopic.brand}
                onChange={(e) =>
                  setNewTopic({ ...newTopic, brand: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">內容 *</Label>
              <Textarea
                id="content"
                placeholder="分享你的想法..."
                value={newTopic.content}
                onChange={(e) =>
                  setNewTopic({ ...newTopic, content: e.target.value })
                }
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmitTopic}
              disabled={createTopicMutation.isPending}
            >
              {createTopicMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  發表中...
                </>
              ) : (
                "發表主題"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
