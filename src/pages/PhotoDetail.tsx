import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminActions } from "@/hooks/useAdminActions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ReportDialog } from "@/components/reports/ReportDialog";
import {
  Star,
  MessageSquare,
  Eye,
  Camera,
  Smartphone,
  Send,
  Loader2,
  Flag,
  CornerDownRight,
  ArrowLeft,
  Calendar,
  Pin,
  PinOff,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface Photo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  category: string;
  brand: string | null;
  camera_body: string | null;
  lens: string | null;
  phone_model: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  average_rating: number;
  rating_count: number;
  is_featured: boolean;
  created_at: string;
}

interface Profile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profile?: Profile;
  replies?: Comment[];
}

export default function PhotoDetailPage() {
  const { photoId } = useParams<{ photoId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canModerate, checkAdminStatus, togglePhotoFeatured, loading: adminLoading } = useAdminActions();

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photographer, setPhotographer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isRating, setIsRating] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    if (photoId) {
      loadPhoto();
      loadComments();
    }
  }, [photoId]);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      if (photo) {
        loadUserRating();
      }
    }
  }, [user, photo]);

  const loadPhoto = async () => {
    if (!photoId) return;

    try {
      const { data, error: photoError } = await supabase
        .from("photos")
        .select("*")
        .eq("id", photoId)
        .eq("is_hidden", false)
        .single();

      if (photoError) throw photoError;

      setPhoto(data);

      // Increment view count
      await supabase
        .from("photos")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", photoId);

      // Fetch photographer profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .eq("user_id", data.user_id)
        .single();

      if (profile) {
        setPhotographer(profile);
      }
    } catch (err: any) {
      setError(err.message || "無法載入照片");
    } finally {
      setLoading(false);
    }
  };

  const loadUserRating = async () => {
    if (!user || !photo) return;

    const { data } = await supabase
      .from("photo_ratings")
      .select("rating")
      .eq("photo_id", photo.id)
      .eq("user_id", user.id)
      .single();

    if (data) {
      setUserRating(data.rating);
    }
  };

  const loadComments = async () => {
    if (!photoId) return;
    setIsLoadingComments(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .select("id, user_id, content, parent_id, created_at")
        .eq("photo_id", photoId)
        .eq("is_hidden", false)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        // Fetch profiles for all commenters
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

        const topLevel = data.filter((c) => !c.parent_id);
        const replies = data.filter((c) => c.parent_id);

        const threaded: Comment[] = topLevel.map((comment) => ({
          ...comment,
          profile: profileMap.get(comment.user_id),
          replies: replies
            .filter((r) => r.parent_id === comment.id)
            .map((r) => ({ ...r, profile: profileMap.get(r.user_id) })),
        }));

        setComments(threaded);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!user) {
      toast({
        title: "請先登入",
        description: "登入後才能評分",
        variant: "destructive",
      });
      return;
    }

    if (!photo) return;

    setIsRating(true);

    const { error } = await supabase.from("photo_ratings").upsert({
      photo_id: photo.id,
      user_id: user.id,
      rating,
    });

    if (error) {
      toast({
        title: "評分失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUserRating(rating);

      // Reload photo to get updated rating
      const { data: newStats } = await supabase
        .from("photos")
        .select("average_rating, rating_count")
        .eq("id", photo.id)
        .single();

      if (newStats) {
        setPhoto((prev) =>
          prev
            ? {
                ...prev,
                average_rating: Number(newStats.average_rating),
                rating_count: newStats.rating_count,
              }
            : prev
        );
      }

      toast({
        title: "評分成功",
        description: `您給了 ${rating} 星評價`,
      });
    }

    setIsRating(false);
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: "請先登入",
        description: "登入後才能留言",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim() || !photo) return;

    setIsSubmittingComment(true);

    const { error } = await supabase.from("comments").insert({
      photo_id: photo.id,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast({
        title: "留言失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setNewComment("");
      loadComments();
      toast({ title: "留言成功" });
    }

    setIsSubmittingComment(false);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !photo) return;
    if (!replyContent.trim()) return;

    const { error } = await supabase.from("comments").insert({
      photo_id: photo.id,
      user_id: user.id,
      content: replyContent.trim(),
      parent_id: parentId,
    });

    if (error) {
      toast({
        title: "回覆失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setReplyContent("");
      setReplyingTo(null);
      loadComments();
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (error || !photo) {
    return (
      <MainLayout>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">{error || "照片不存在"}</p>
          <Link to="/gallery">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回圖庫
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to="/gallery" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          返回圖庫
        </Link>

        <div className="grid lg:grid-cols-[1fr,400px] gap-8">
          {/* Image Section */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <img
                src={photo.image_url}
                alt={photo.title}
                className="w-full h-auto max-h-[70vh] object-contain bg-black"
              />
            </div>

            {/* Mobile Stats */}
            <div className="lg:hidden bg-card rounded-xl border border-border p-4 space-y-4">
              {/* Photographer */}
              <Link to={`/user/${photographer?.user_id}`} className="flex items-center gap-3 hover:bg-muted/50 p-2 -m-2 rounded-lg transition-colors">
                <Avatar>
                  <AvatarImage src={photographer?.avatar_url || undefined} />
                  <AvatarFallback>
                    {photographer?.display_name?.[0] || photographer?.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{photographer?.display_name || photographer?.username}</p>
                  <p className="text-sm text-muted-foreground">@{photographer?.username}</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Details Sidebar */}
          <div className="space-y-6">
            {/* Title & Photographer */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h1 className="font-serif text-2xl font-bold mb-4">{photo.title}</h1>

              {/* Photographer - Desktop */}
              <Link to={`/user/${photographer?.user_id}`} className="hidden lg:flex items-center gap-3 mb-4 hover:bg-muted/50 p-2 -m-2 rounded-lg transition-colors">
                <Avatar>
                  <AvatarImage src={photographer?.avatar_url || undefined} />
                  <AvatarFallback>
                    {photographer?.display_name?.[0] || photographer?.username?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{photographer?.display_name || photographer?.username}</p>
                  <p className="text-sm text-muted-foreground">@{photographer?.username}</p>
                </div>
              </Link>

              {photo.description && (
                <p className="text-muted-foreground mb-4">{photo.description}</p>
              )}

              {/* Equipment Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="gap-1">
                  {photo.category === "phone" ? (
                    <Smartphone className="h-3 w-3" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                  {photo.brand}
                </Badge>
                {photo.phone_model && <Badge variant="secondary">{photo.phone_model}</Badge>}
                {photo.camera_body && <Badge variant="secondary">{photo.camera_body}</Badge>}
                {photo.lens && <Badge variant="secondary">{photo.lens}</Badge>}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {photo.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {Number(photo.average_rating).toFixed(1)} ({photo.rating_count})
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {photo.comment_count}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(photo.created_at), "yyyy年MM月dd日", { locale: zhTW })}
              </div>

              {/* Admin Controls */}
              {canModerate && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">管理員操作</p>
                  <Button
                    variant={photo.is_featured ? "destructive" : "outline"}
                    size="sm"
                    onClick={async () => {
                      const success = await togglePhotoFeatured(photo.id, photo.is_featured);
                      if (success) {
                        setPhoto(prev => prev ? { ...prev, is_featured: !prev.is_featured } : prev);
                      }
                    }}
                    disabled={adminLoading}
                    className="gap-2"
                  >
                    {photo.is_featured ? (
                      <>
                        <PinOff className="h-4 w-4" />
                        取消置頂
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4" />
                        設為置頂
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Report Button */}
              {user && user.id !== photo.user_id && (
                <div className="mt-4">
                  <ReportDialog
                    contentType="photo"
                    contentId={photo.id}
                    reportedUserId={photo.user_id}
                  />
                </div>
              )}
            </div>

            {/* Rating */}
            <div className="bg-card rounded-xl border border-border p-6">
              <p className="font-medium mb-3">為這張照片評分</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={isRating}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-7 w-7 ${
                        star <= (hoverRating || userRating)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {userRating > 0 && (
                <p className="text-sm text-muted-foreground mt-2">您的評分: {userRating} 星</p>
              )}
            </div>

            {/* Comments */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5" />
                留言 ({comments.length})
              </h3>

              {/* Comment Input */}
              <div className="flex gap-2 mb-6">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={user ? "寫下您的留言..." : "請先登入後留言"}
                  rows={2}
                  className="flex-1"
                  disabled={!user || isSubmittingComment}
                />
                <Button
                  onClick={handleSubmitComment}
                  disabled={!user || !newComment.trim() || isSubmittingComment}
                  size="icon"
                  className="shrink-0"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Separator className="mb-4" />

              {/* Comments List */}
              {isLoadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  還沒有留言，成為第一個留言的人吧！
                </p>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={comment.profile?.avatar_url || undefined} />
                          <AvatarFallback>
                            {comment.profile?.username?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {comment.profile?.display_name || comment.profile?.username || "匿名"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), {
                                addSuffix: true,
                                locale: zhTW,
                              })}
                            </span>
                          </div>
                          <p className="text-sm mt-1">{comment.content}</p>
                          {user && (
                            <button
                              onClick={() => setReplyingTo(comment.id)}
                              className="text-xs text-muted-foreground hover:text-foreground mt-1"
                            >
                              回覆
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="ml-11 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-3">
                              <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={reply.profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {reply.profile?.username?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {reply.profile?.display_name || reply.profile?.username || "匿名"}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(reply.created_at), {
                                      addSuffix: true,
                                      locale: zhTW,
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm mt-1">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply Input */}
                      {replyingTo === comment.id && (
                        <div className="ml-11 flex gap-2">
                          <Textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="寫下您的回覆..."
                            rows={2}
                            className="flex-1"
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={!replyContent.trim()}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent("");
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
