import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  MessageSquare,
  Send,
  Loader2,
  ArrowLeft,
  User,
  Package,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

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
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      // 獲取其他參與者資料
      const otherUserIds = data.map((c) =>
        c.participant1_id === user?.id ? c.participant2_id : c.participant1_id
      );
      const listingIds = data.filter((c) => c.listing_id).map((c) => c.listing_id);

      const [profilesRes, listingsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, username, display_name, avatar_url')
          .in('user_id', otherUserIds),
        listingIds.length > 0
          ? supabase
              .from('marketplace_listings')
              .select('id, title, verification_image_url')
              .in('id', listingIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profilesMap = new Map<string, any>(
        profilesRes.data?.map((p) => [p.user_id, p] as [string, any]) || []
      );
      const listingsMap = new Map<string, any>(
        listingsRes.data?.map((l) => [l.id, l] as [string, any]) || []
      );

      // 獲取最後訊息和未讀數
      const conversationsWithDetails = await Promise.all(
        data.map(async (conv) => {
          const otherUserId = conv.participant1_id === user?.id
            ? conv.participant2_id
            : conv.participant1_id;

          // 獲取最後訊息
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // 獲取未讀數
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

      // 標記為已讀
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
          event: 'INSERT',
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

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !conversationId) return;

      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: user?.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      // 更新對話的最後訊息時間
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });

  const selectedConversation = conversations?.find((c) => c.id === conversationId);

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
          <p className="text-muted-foreground">
            與其他用戶進行私人對話
          </p>
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
                          {conv.last_message}
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
                        return (
                          <div
                            key={message.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                              <p
                                className={`text-xs mt-1 ${
                                  isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}
                              >
                                {format(new Date(message.created_at), 'HH:mm')}
                              </p>
                            </div>
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

                {/* 輸入框 */}
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage.mutate();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="輸入訊息..."
                      disabled={sendMessage.isPending}
                    />
                    <Button
                      type="submit"
                      disabled={!newMessage.trim() || sendMessage.isPending}
                    >
                      {sendMessage.isPending ? (
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
    </MainLayout>
  );
}
