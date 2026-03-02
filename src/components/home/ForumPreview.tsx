import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  ArrowRight, 
  Clock, 
  Users, 
  TrendingUp,
  Pin
} from "lucide-react";

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

const recentTopics: ForumTopic[] = [
  {
    id: "demo-1",
    title: "【心得】Sony A7C II 一個月使用心得分享",
    category: "相機",
    author: "攝影狂熱者",
    avatar: "📷",
    replies: 42,
    views: 1567,
    lastActivity: "2 小時前",
    isPinned: true,
    isHot: true,
  },
  {
    id: "demo-2",
    title: "iPhone 16 Pro 夜拍實測，ProRAW 真的有差嗎？",
    category: "手機",
    author: "科技宅",
    avatar: "📱",
    replies: 28,
    views: 892,
    lastActivity: "5 小時前",
    isHot: true,
  },
  {
    id: "demo-3",
    title: "Fujifilm X100VI 終於入手！開箱分享",
    category: "相機",
    author: "富士信徒",
    avatar: "🗻",
    replies: 65,
    views: 2341,
    lastActivity: "8 小時前",
    isHot: true,
  },
  {
    id: "demo-4",
    title: "請教各位前輩：街拍構圖有什麼建議？",
    category: "技術",
    author: "新手上路",
    avatar: "🌱",
    replies: 15,
    views: 456,
    lastActivity: "12 小時前",
  },
  {
    id: "demo-5",
    title: "Ricoh GR IIIx vs Fujifilm X100V 該怎麼選？",
    category: "攝影",
    author: "選擇困難症",
    avatar: "🤔",
    replies: 33,
    views: 1123,
    lastActivity: "1 天前",
  },
];

const categoryColors: Record<string, string> = {
  相機: "bg-blue-500/10 text-blue-600",
  手機: "bg-green-500/10 text-green-600",
  技術: "bg-purple-500/10 text-purple-600",
  攝影: "bg-orange-500/10 text-orange-600",
};

export function ForumPreview() {
  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              熱門<span className="text-gradient">討論</span>
            </h2>
            <p className="text-muted-foreground">
              社群最新話題與交流
            </p>
          </div>
          <Link to="/forums">
            <Button variant="outline" className="hidden sm:flex gap-2">
              進入討論區
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
            <div className="col-span-7">主題</div>
            <div className="col-span-2 text-center">回覆 / 瀏覽</div>
            <div className="col-span-3 text-right">最後活動</div>
          </div>

          {/* Topics */}
          <div className="divide-y divide-border">
            {recentTopics.map((topic) => (
              <Link
                key={topic.id}
                to="/forums"
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
                        <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
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

        <div className="mt-8 text-center sm:hidden">
          <Link to="/forums">
            <Button variant="outline" className="gap-2">
              進入討論區
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
