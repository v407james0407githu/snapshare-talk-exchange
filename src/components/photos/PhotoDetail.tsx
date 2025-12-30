import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Star,
  MessageSquare,
  Eye,
  Camera,
  Smartphone,
  Send,
  Loader2,
  Flag,
  CornerDownRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

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
  created_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

interface PhotoDetailProps {
  photo: Photo;
  open: boolean;
  onClose: () => void;
}

export function PhotoDetail({ photo, open, onClose }: PhotoDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isRating, setIsRating] = useState(false);
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const [currentRating, setCurrentRating] = useState(photo.average_rating);
  const [ratingCount, setRatingCount] = useState(photo.rating_count);

  useEffect(() => {
    if (open) {
      loadComments();
      if (user) {
        loadUserRating();
      }
    }
  }, [open, photo.id, user]);

  const loadUserRating = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('photo_ratings')
      .select('rating')
      .eq('photo_id', photo.id)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserRating(data.rating);
    }
  };

  const loadComments = async () => {
    setIsLoadingComments(true);

    const { data, error } = await supabase
      .from('comments')
      .select('id, user_id, content, parent_id, created_at')
      .eq('photo_id', photo.id)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading comments:', error);
    } else if (data) {
      const topLevel = data.filter(c => !c.parent_id);
      const replies = data.filter(c => c.parent_id);

      const threaded: Comment[] = topLevel.map(comment => ({
        ...comment,
        profiles: undefined,
        replies: replies.filter(r => r.parent_id === comment.id).map(r => ({ ...r, profiles: undefined })),
      }));

      setComments(threaded);
    }

    setIsLoadingComments(false);
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

    setIsRating(true);

    const { error } = await supabase
      .from('photo_ratings')
      .upsert({
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
      // Recalculate average
      const { data: newStats } = await supabase
        .from('photos')
        .select('average_rating, rating_count')
        .eq('id', photo.id)
        .single();

      if (newStats) {
        setCurrentRating(Number(newStats.average_rating));
        setRatingCount(newStats.rating_count);
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

    if (!newComment.trim()) return;

    setIsSubmittingComment(true);

    const { error } = await supabase
      .from('comments')
      .insert({
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
      setNewComment('');
      loadComments();
      toast({
        title: "留言成功",
      });
    }

    setIsSubmittingComment(false);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user) return;
    if (!replyContent.trim()) return;

    const { error } = await supabase
      .from('comments')
      .insert({
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
      setReplyContent('');
      setReplyingTo(null);
      loadComments();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <div className="grid md:grid-cols-[1fr,400px] h-full max-h-[90vh]">
          {/* Image */}
          <div className="bg-black flex items-center justify-center">
            <img
              src={photo.image_url}
              alt={photo.title}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>

          {/* Details */}
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader className="p-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={photo.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {photo.profiles?.display_name?.[0] || photo.profiles?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <DialogTitle className="text-left">{photo.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    @{photo.profiles?.username}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Description */}
              {photo.description && (
                <p className="text-sm">{photo.description}</p>
              )}

              {/* Equipment Tags */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="gap-1">
                  {photo.category === 'phone' ? (
                    <Smartphone className="h-3 w-3" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                  {photo.brand}
                </Badge>
                {photo.phone_model && (
                  <Badge variant="secondary">{photo.phone_model}</Badge>
                )}
                {photo.camera_body && (
                  <Badge variant="secondary">{photo.camera_body}</Badge>
                )}
                {photo.lens && (
                  <Badge variant="secondary">{photo.lens}</Badge>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {photo.view_count}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {currentRating.toFixed(1)} ({ratingCount})
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {photo.comment_count}
                </span>
              </div>

              {/* Rating */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">為這張照片評分</p>
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
                        className={`h-6 w-6 ${
                          star <= (hoverRating || userRating)
                            ? 'fill-primary text-primary'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                  {userRating > 0 && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      您的評分: {userRating} 星
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Comments */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  留言 ({comments.length})
                </h4>

                {isLoadingComments ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    還沒有留言，成為第一個留言的人吧！
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="space-y-3">
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.profiles?.avatar_url || undefined} />
                            <AvatarFallback>
                              {comment.profiles?.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {comment.profiles?.display_name || comment.profiles?.username}
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
                                  <AvatarImage src={reply.profiles?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {reply.profiles?.username?.[0] || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">
                                      {reply.profiles?.display_name || reply.profiles?.username}
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
                                  setReplyContent('');
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

            {/* Comment Input */}
            <div className="p-4 border-t shrink-0">
              <div className="flex gap-2">
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
                >
                  {isSubmittingComment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
