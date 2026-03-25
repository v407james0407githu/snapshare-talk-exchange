import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  Package,
  ImagePlus,
  X,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { resizeImage, getOutputExtension, getOutputMimeType } from '@/lib/imageResize';

const IMAGE_PREFIX = '[img]';

function isImageMessage(content: string): boolean {
  return content.startsWith(IMAGE_PREFIX);
}

function getImageUrl(content: string): string {
  return content.slice(IMAGE_PREFIX.length);
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  listing_id: string | null;
  last_message_at: string;
  created_at: string;
  other_user?: {
    user_id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  listing?: {
    id: string;
    title: string;
    verification_image_url: string;
  };
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function Messages() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // 獲取所有對話
  const { data: conversations, isLoading: conversationsLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user?.id},participant2_id.eq.${user?.id}`)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      const otherUserIds = data.map((c) =>
        c.participant1_id === user?.id ? c.participant2_id : c.participant1_id
      );
      const listingIds = data.filter((c) => c.listing_id).map((c) => c.listing_id);

      // Use RPC to fetch public profiles (bypasses RLS restrictions)
      const profilePromises = otherUserIds.map(uid =>
        supabase.rpc('get_public_profile', { target_user_id: uid })
      );
      const [profileResults, listingsRes] = await Promise.all([
        Promise.all(profilePromises),
        listingIds.length > 0
          ? supabase
              .from('marketplace_listings')
              .select('id, title, verification_image_url')
              .in('id', listingIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesData = profileResults
        .map(r => r.data?.[0])
        .filter(Boolean);
      const profilesMap = new Map<string, any>(
        profilesData.map((p: any) => [p.user_id, p] as [string, any])
      );
      const listingsMap = new Map<string, any>(
        listingsRes.data?.map((l) => [l.id, l] as [string, any]) || []
      );

      const conversationsWithDetails = await Promise.all(
        data.map(async (conv) => {
          const otherUserId = conv.participant1_id === user?.id
            ? conv.participant2_id
            : conv.participant1_id;

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', user?.id);

          return {
            ...conv,
            other_user: profilesMap.get(otherUserId),
            listing: conv.listing_id ? listingsMap.get(conv.listing_id) : undefined,
            last_message: lastMsg?.content,
            unread_count: count || 0,
          } as Conversation;
        })
      );

      return conversationsWithDetails;
    },
    enabled: !!user,
  });

  // 獲取選中對話的訊息
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user?.id);

      return data as Message[];
    },
    enabled: !!conversationId && !!user,
  });

  // 即時訂閱新訊息
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, queryClient]);

  // 滾動到最新訊息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 選擇圖片
  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: '只能傳送圖片檔案', variant: 'destructive' });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '圖片大小不能超過 10MB', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }, [toast]);

  const clearImage = useCallback(() => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  }, [imagePreview]);

  // 上傳圖片
  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const resized = await resizeImage(file, 1200, 1200, 0.8);
    const ext = getOutputExtension();
    const mime = getOutputMimeType();
    const path = `messages/${user?.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('photos')
      .upload(path, resized.blob, { cacheControl: '3600', upsert: false, contentType: mime });

    if (error) throw error;

    const { data } = supabase.storage.from('photos').getPublicUrl(path);
    return data.publicUrl;
  }, [user?.id]);

  // 刪除訊息
  const deleteMessage = useMutation({
    mutationFn: async (message: Message) => {
      // 如果是圖片訊息，也從 storage 刪除
      if (isImageMessage(message.content)) {
        const url = getImageUrl(message.content);
        // 從 URL 中提取 storage path
        const match = url.match(/\/photos\/(.+)$/);
        if (match) {
          const storagePath = decodeURIComponent(match[1]);
          await supabase.storage.from('photos').remove([storagePath]);
        }
      }

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', message.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: '訊息已刪除' });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: '刪除失敗', description: err.message, variant: 'destructive' });
      setDeleteTarget(null);
    },
  });

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!conversationId || (!newMessage.trim() && !imageFile)) return;
      setUploading(true);

      let content = newMessage.trim();

      if (imageFile) {
        const imageUrl = await uploadImage(imageFile);
        if (!content) {
          content = `${IMAGE_PREFIX}${imageUrl}`;
        } else {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            sender_id: user?.id,
            content: `${IMAGE_PREFIX}${imageUrl}`,
          });
        }
      }

      if (content) {
        const { error } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          content,
        });
        if (error) throw error;
      }

      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      setNewMessage('');
      clearImage();
      setUploading(false);
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
    onError: (err: any) => {
      setUploading(false);
      toast({ title: '傳送失敗', description: err.message, variant: 'destructive' });
    },
  });

  const selectedConversation = conversations?.find((c) => c.id === conversationId);

  const formatLastMessage = (content: string | undefined) => {
    if (!content) return undefined;
    if (isImageMessage(content)) return '📷 圖片';
    return content;
  };

  if (authLoading || !user) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">私訊</h1>
          <p className="text-muted-foreground">與其他用戶進行私人對話</p>
        </div>

        <div className="grid lg:grid-cols-[350px,1fr] gap-6 h-[600px]">
          {/* 對話列表 */}
          <Card className="overflow-hidden">
            <CardHeader className="py-4">
              <CardTitle className="text-lg">對話列表</CardTitle>
            </CardHeader>
            <Separator />
            <ScrollArea className="h-[520px]">
              {conversationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations?.length ? (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => navigate(`/messages/${conv.id}`)}
                    className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                      conv.id === conversationId ? 'bg-muted' : ''
                    }`}
                  >
                    <Avatar>
                      <AvatarImage src={conv.other_user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {conv.other_user?.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium truncate">
                          {conv.other_user?.display_name || conv.other_user?.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(conv.last_message_at), {
                            addSuffix: true,
                            locale: zhTW,
                          })}
                        </span>
                      </div>
                      {conv.listing && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Package className="h-3 w-3" />
                          <span className="truncate">{conv.listing.title}</span>
                        </div>
                      )}
                      {conv.last_message && (
                        <p className="text-sm text-muted-foreground truncate">
                          {formatLastMessage(conv.last_message)}
                        </p>
                      )}
                    </div>
                    {(conv.unread_count || 0) > 0 && (
                      <Badge className="shrink-0">{conv.unread_count}</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">尚無對話</p>
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* 訊息區域 */}
          <Card className="flex flex-col overflow-hidden">
            {conversationId && selectedConversation ? (
              <>
                {/* 對話標題 */}
                <CardHeader className="py-4 border-b">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => navigate('/messages')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Avatar>
                      <AvatarImage src={selectedConversation.other_user?.avatar_url || undefined} />
                      <AvatarFallback>
                        {selectedConversation.other_user?.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link
                        to={`/user/${selectedConversation.other_user?.user_id}`}
                        className="font-medium hover:underline"
                      >
                        {selectedConversation.other_user?.display_name ||
                          selectedConversation.other_user?.username}
                      </Link>
                      {selectedConversation.listing && (
                        <Link
                          to={`/marketplace/${selectedConversation.listing.id}`}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:underline"
                        >
                          <Package className="h-3 w-3" />
                          {selectedConversation.listing.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* 訊息內容 */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages?.length ? (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwn = message.sender_id === user?.id;
                        const isImg = isImageMessage(message.content);
                        return (
                          <div
                            key={message.id}
                            className={`group flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* 刪除按鈕 - 自己的訊息在左邊 */}
                            {isOwn && (
                              <button
                                onClick={() => setDeleteTarget(message)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="刪除訊息"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <div
                              className={`max-w-[70%] rounded-2xl ${
                                isImg ? 'p-1' : 'px-4 py-2'
                              } ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {isImg ? (
                                <img
                                  src={getImageUrl(message.content)}
                                  alt="圖片訊息"
                                  className="rounded-xl max-h-64 max-w-full object-contain cursor-pointer"
                                  loading="lazy"
                                  onClick={() => setLightboxUrl(getImageUrl(message.content))}
                                />
                              ) : (
                                <p className="whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              )}
                              <p
                                className={`text-xs mt-1 ${isImg ? 'px-2 pb-1' : ''} ${
                                  isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                {format(new Date(message.created_at), 'HH:mm')}
                              </p>
                            </div>
                            {/* 刪除按鈕 - 對方的訊息在右邊 */}
                            {!isOwn && (
                              <button
                                onClick={() => setDeleteTarget(message)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity self-center ml-2 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                title="刪除訊息"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p className="text-sm">開始對話吧！</p>
                    </div>
                  )}
                </ScrollArea>

                {/* 圖片預覽 */}
                {imagePreview && (
                  <div className="px-4 pt-2 border-t">
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="預覽"
                        className="h-20 rounded-lg object-cover"
                      />
                      <button
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 輸入框 */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage.mutate();
                    }}
                    className="flex gap-2 items-center"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <ImagePlus className="h-5 w-5" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file);
                        e.target.value = '';
                      }}
                    />
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="輸入訊息..."
                      disabled={uploading}
                      maxLength={2000}
                    />
                    <Button
                      type="submit"
                      disabled={(!newMessage.trim() && !imageFile) || uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>選擇一個對話開始聊天</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 圖片燈箱 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="放大圖片"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 刪除確認對話框 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除訊息</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && isImageMessage(deleteTarget.content)
                ? '刪除後圖片將從雙方對話中永久移除，且無法復原。'
                : '刪除後訊息將從雙方對話中永久移除，且無法復原。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMessage.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
