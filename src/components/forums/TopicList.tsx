import { Link } from "react-router-dom";
import { MessageSquare, Users, Clock, Pin, TrendingUp, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { getCategoryColor } from "./ForumCategorySelector";

export interface ForumTopic {
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
  category_id: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  tags?: string[];
}

const categoryColors: Record<string, string> = {
  手機攝影: "green",
  相機攝影: "blue",
  攝影技術: "purple",
  哈拉打屁: "orange",
};

function formatTime(dateString: string | null) {
  if (!dateString) return "剛剛";
  return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhTW });
}

interface TopicListProps {
  topics: ForumTopic[] | undefined;
  onTagClick?: (tag: string) => void;
}

export function TopicList({ topics, onTagClick }: TopicListProps) {
  if (!topics?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">目前沒有主題</div>
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
        {topics.map((topic) => (
          <Link
            key={topic.id}
            to={`/forums/topic/${topic.id}`}
            className="block px-6 py-4 hover:bg-muted/30 transition-colors"
          >
            <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
              <div className="col-span-7">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg shrink-0">
                    {topic.profiles?.avatar_url ? (
                      <img src={topic.profiles.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {topic.is_pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
                      {(topic.reply_count || 0) > 10 && <TrendingUp className="h-3.5 w-3.5 text-destructive" />}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(categoryColors[topic.category])}`}>
                        {topic.category}
                      </span>
                      {topic.brand && (
                        <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          {topic.brand}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
                      {topic.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">
                        {topic.profiles?.display_name || topic.profiles?.username}
                      </p>
                      {topic.tags && topic.tags.length > 0 && (
                        <div className="flex gap-1">
                          {topic.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-primary/10"
                              onClick={(e) => {
                                e.preventDefault();
                                onTagClick?.(tag);
                              }}
                            >
                              <Tag className="h-2.5 w-2.5 mr-0.5" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-2 hidden md:flex items-center justify-center gap-4">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />{topic.reply_count || 0}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />{topic.view_count || 0}
                </span>
              </div>

              <div className="col-span-3 hidden md:flex items-center justify-end gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {formatTime(topic.last_reply_at || topic.created_at)}
              </div>

              <div className="flex items-center gap-4 mt-2 md:hidden text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />{topic.reply_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />{formatTime(topic.last_reply_at || topic.created_at)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
