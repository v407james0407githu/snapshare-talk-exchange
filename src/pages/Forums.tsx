import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { Link } from "react-router-dom";

interface ForumCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  topics: number;
  posts: number;
  color: string;
}

interface ForumTopic {
  id: string;
  title: string;
  category: string;
  author: string;
  avatar: string;
  replies: number;
  views: number;
  lastActivity: string;
  isPinned?: boolean;
  isHot?: boolean;
}

const categories: ForumCategory[] = [
  {
    id: "mobile",
    name: "手機攝影",
    icon: <Smartphone className="h-5 w-5" />,
    description: "iPhone、Samsung、小米、Vivo 等手機攝影討論",
    topics: 3456,
    posts: 23456,
    color: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  {
    id: "camera",
    name: "相機攝影",
    icon: <Camera className="h-5 w-5" />,
    description: "Sony、Fujifilm、Nikon、Ricoh 等相機器材討論",
    topics: 4567,
    posts: 34567,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  {
    id: "technique",
    name: "攝影技術",
    icon: <Wrench className="h-5 w-5" />,
    description: "構圖、用光、後製等攝影技術交流",
    topics: 2345,
    posts: 18765,
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  {
    id: "lounge",
    name: "哈拉打屁",
    icon: <Coffee className="h-5 w-5" />,
    description: "輕鬆閒聊，不限攝影話題（禁政治）",
    topics: 1234,
    posts: 9876,
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
];

const topics: ForumTopic[] = [
  {
    id: "1",
    title: "【公告】論壇使用規範與發文指南",
    category: "公告",
    author: "管理員",
    avatar: "🛡️",
    replies: 45,
    views: 12345,
    lastActivity: "2 小時前",
    isPinned: true,
  },
  {
    id: "2",
    title: "【心得】Sony A7C II 一個月使用心得分享",
    category: "相機",
    author: "攝影狂熱者",
    avatar: "📷",
    replies: 156,
    views: 3456,
    lastActivity: "10 分鐘前",
    isHot: true,
  },
  {
    id: "3",
    title: "iPhone 16 Pro 夜拍實測，ProRAW 真的有差嗎？",
    category: "手機",
    author: "科技宅",
    avatar: "📱",
    replies: 89,
    views: 2134,
    lastActivity: "25 分鐘前",
    isHot: true,
  },
  {
    id: "4",
    title: "Fujifilm X100VI 終於入手！開箱分享",
    category: "相機",
    author: "富士信徒",
    avatar: "🗻",
    replies: 234,
    views: 5678,
    lastActivity: "1 小時前",
    isHot: true,
  },
  {
    id: "5",
    title: "請教各位前輩：街拍構圖有什麼建議？",
    category: "技術",
    author: "新手上路",
    avatar: "🌱",
    replies: 45,
    views: 890,
    lastActivity: "2 小時前",
  },
  {
    id: "6",
    title: "Ricoh GR IIIx vs Fujifilm X100V 該怎麼選？",
    category: "器材",
    author: "選擇困難症",
    avatar: "🤔",
    replies: 78,
    views: 1567,
    lastActivity: "3 小時前",
  },
  {
    id: "7",
    title: "最近天氣超好，大家有出去拍照嗎？",
    category: "閒聊",
    author: "天氣控",
    avatar: "☀️",
    replies: 34,
    views: 567,
    lastActivity: "4 小時前",
  },
  {
    id: "8",
    title: "Samsung S24 Ultra 相機更新後畫質提升心得",
    category: "手機",
    author: "三星粉",
    avatar: "📲",
    replies: 67,
    views: 1234,
    lastActivity: "5 小時前",
  },
];

const categoryColors: Record<string, string> = {
  公告: "bg-red-500/10 text-red-600",
  相機: "bg-blue-500/10 text-blue-600",
  手機: "bg-green-500/10 text-green-600",
  技術: "bg-purple-500/10 text-purple-600",
  器材: "bg-orange-500/10 text-orange-600",
  閒聊: "bg-pink-500/10 text-pink-600",
};

export default function Forums() {
  const [searchQuery, setSearchQuery] = useState("");

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
            <Button variant="hero" size="lg" className="gap-2 w-fit">
              <Plus className="h-5 w-5" />
              發表新主題
            </Button>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Categories */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋主題..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Categories */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-4">討論分類</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/forums/${cat.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className={`p-2 rounded-lg border ${cat.color}`}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium group-hover:text-primary transition-colors">
                          {cat.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cat.topics.toLocaleString()} 主題
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-card rounded-xl border border-border p-4">
                <h3 className="font-semibold mb-4">論壇統計</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">總主題</span>
                    <span className="font-medium">11,602</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">總回覆</span>
                    <span className="font-medium">86,664</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">會員數</span>
                    <span className="font-medium">12,345</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
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
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  {/* Header */}
                  <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
                    <div className="col-span-7">主題</div>
                    <div className="col-span-2 text-center">回覆 / 瀏覽</div>
                    <div className="col-span-3 text-right">最後活動</div>
                  </div>

                  {/* Topics */}
                  <div className="divide-y divide-border">
                    {topics.map((topic) => (
                      <Link
                        key={topic.id}
                        to={`/forums/topic/${topic.id}`}
                        className="block px-6 py-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                          {/* Title & Author */}
                          <div className="col-span-7">
                            <div className="flex items-start gap-3">
                              <span className="text-2xl">{topic.avatar}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  {topic.isPinned && (
                                    <Pin className="h-3.5 w-3.5 text-primary" />
                                  )}
                                  {topic.isHot && (
                                    <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                                  )}
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[topic.category]}`}>
                                    {topic.category}
                                  </span>
                                </div>
                                <h3 className="font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
                                  {topic.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {topic.author}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="col-span-2 hidden md:flex items-center justify-center gap-4">
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MessageSquare className="h-4 w-4" />
                              {topic.replies}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              {topic.views}
                            </span>
                          </div>

                          {/* Last Activity */}
                          <div className="col-span-3 hidden md:flex items-center justify-end gap-1 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {topic.lastActivity}
                          </div>

                          {/* Mobile Stats */}
                          <div className="flex items-center gap-4 mt-2 md:hidden text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              {topic.replies}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {topic.lastActivity}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hot">
                <div className="text-center py-12 text-muted-foreground">
                  熱門主題載入中...
                </div>
              </TabsContent>

              <TabsContent value="unanswered">
                <div className="text-center py-12 text-muted-foreground">
                  待回覆主題載入中...
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </MainLayout>
  );
}
