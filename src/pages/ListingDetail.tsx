import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ReportDialog } from '@/components/reports/ReportDialog';
import {
  ArrowLeft,
  Camera,
  Smartphone,
  MapPin,
  Clock,
  Eye,
  Shield,
  ShieldCheck,
  MessageSquare,
  Flag,
  Crown,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  brand: string | null;
  model: string | null;
  condition: string;
  price: number;
  currency: string;
  location: string | null;
  verification_image_url: string;
  additional_images: string[] | null;
  is_sold: boolean;
  is_verified: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface SellerProfile {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_vip: boolean;
  created_at: string;
}

const conditionLabels: Record<string, string> = {
  new: '全新',
  like_new: '幾乎全新',
  good: '良好',
  fair: '普通',
};

const categoryLabels: Record<string, string> = {
  phone: '手機',
  camera: '相機',
  lens: '鏡頭',
  accessory: '配件',
};

export default function ListingDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '', description: '', brand: '', model: '', condition: '', price: '', location: '',
  });
  const [editNewImages, setEditNewImages] = useState<File[]>([]);
  const [editRemovedImages, setEditRemovedImages] = useState<string[]>([]);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Fetch listing
  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error) throw error;

      // Increment view count
      await supabase
        .from('marketplace_listings')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', listingId);

      return data as Listing;
    },
    enabled: !!listingId,
  });

  // Fetch seller profile using secure RPC function
  const { data: seller } = useQuery({
    queryKey: ['seller-profile', listing?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_public_profile', { target_user_id: listing?.user_id });

      if (error) throw error;
      return (data?.[0] || null) as SellerProfile | null;
    },
    enabled: !!listing?.user_id,
  });

  // Get all images
  const allImages = listing
    ? [listing.verification_image_url, ...(listing.additional_images || [])]
    : [];

  const handleContactSeller = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setContactDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !user || !listing || !seller) return;

    setIsSending(true);
    try {
      // Check for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${listing.user_id}),and(participant1_id.eq.${listing.user_id},participant2_id.eq.${user.id})`)
        .maybeSingle();

      let conversationId = existing?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: listing.user_id,
            listing_id: listing.id,
          })
          .select('id')
          .single();
        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Send message
      const fullMessage = `[詢問商品：${listing.title}]\n\n${message.trim()}`;
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: fullMessage,
        });
      if (msgError) throw msgError;

      // Update last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      toast({
        title: '訊息已發送',
        description: '您可以在訊息頁面繼續對話',
      });
      setMessage('');
      setContactDialogOpen(false);
      navigate('/messages');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: '發送失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const openEditDialog = () => {
    if (!listing) return;
    setEditForm({
      title: listing.title,
      description: listing.description,
      brand: listing.brand || '',
      model: listing.model || '',
      condition: listing.condition,
      price: String(listing.price),
      location: listing.location || '',
    });
    setEditNewImages([]);
    setEditRemovedImages([]);
    setEditDialogOpen(true);
  };

  const handleEditImageAdd = (files: FileList | null) => {
    if (!files) return;
    const currentAdditional = (listing?.additional_images || []).filter(u => !editRemovedImages.includes(u));
    const remaining = 5 - currentAdditional.length - editNewImages.length;
    if (remaining <= 0) {
      toast({ title: '最多 5 張附加圖片', variant: 'destructive' });
      return;
    }
    const valid = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, remaining);
    setEditNewImages(prev => [...prev, ...valid]);
  };

  const handleSaveEdit = async () => {
    if (!listing || !user) return;
    setIsEditSaving(true);
    try {
      // Upload new images
      const newUrls: string[] = [];
      for (const file of editNewImages) {
        const ext = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('photos').upload(fileName, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        newUrls.push(publicUrl);
      }

      // Compute final additional_images
      const kept = (listing.additional_images || []).filter(u => !editRemovedImages.includes(u));
      const finalAdditional = [...kept, ...newUrls];

      const { error } = await supabase
        .from('marketplace_listings')
        .update({
          title: editForm.title,
          description: editForm.description,
          brand: editForm.brand || null,
          model: editForm.model || null,
          condition: editForm.condition,
          price: parseFloat(editForm.price),
          location: editForm.location || null,
          additional_images: finalAdditional.length > 0 ? finalAdditional : null,
        })
        .eq('id', listing.id);
      if (error) throw error;
      toast({ title: '商品已更新' });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
    } catch {
      toast({ title: '更新失敗', variant: 'destructive' });
    } finally {
      setIsEditSaving(false);
    }
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  if (listingLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!listing) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">商品不存在</h1>
          <p className="text-muted-foreground mb-6">找不到該商品的資料</p>
          <Link to="/marketplace">
            <Button>返回二手交易</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const isOwner = user?.id === listing.user_id;

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/marketplace')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回二手交易
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images */}
          <div className="lg:col-span-2 space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
              <img
                src={allImages[currentImageIndex]}
                alt={listing.title}
                className="w-full h-full object-contain"
              />
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              {listing.is_verified && (
                <Badge className="absolute top-4 left-4 gap-1 bg-green-500">
                  <ShieldCheck className="h-3 w-3" />
                  已驗證
                </Badge>
              )}
              {listing.is_sold && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <Badge variant="destructive" className="text-lg py-2 px-4">
                    已售出
                  </Badge>
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {allImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      currentImageIndex === index
                        ? 'border-primary'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>商品描述</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {listing.description}
                </p>
              </CardContent>
            </Card>

            {/* Anti-fraud Notice */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold mb-1">交易安全提醒</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 建議面交驗貨，避免詐騙風險</li>
                      <li>• 不要預先支付訂金或全款</li>
                      <li>• 交易前請確認商品狀況與功能</li>
                      <li>• 如遇可疑情況，請立即檢舉</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details & Seller */}
          <div className="space-y-6">
            {/* Price & Title */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="gap-1">
                    {listing.category === 'phone' ? (
                      <Smartphone className="h-3 w-3" />
                    ) : (
                      <Camera className="h-3 w-3" />
                    )}
                    {categoryLabels[listing.category]}
                  </Badge>
                  <Badge variant="outline">
                    {conditionLabels[listing.condition]}
                  </Badge>
                </div>

                <h1 className="text-2xl font-bold mb-4">{listing.title}</h1>

                <p className="text-4xl font-bold text-primary mb-4">
                  ${listing.price.toLocaleString()}
                  <span className="text-lg font-normal text-muted-foreground ml-2">
                    {listing.currency}
                  </span>
                </p>

                <Separator className="my-4" />

                <div className="space-y-3 text-sm">
                  {listing.brand && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">品牌</span>
                      <span className="font-medium">{listing.brand}</span>
                    </div>
                  )}
                  {listing.model && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">型號</span>
                      <span className="font-medium">{listing.model}</span>
                    </div>
                  )}
                  {listing.location && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        地點
                      </span>
                      <span className="font-medium">{listing.location}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      瀏覽
                    </span>
                    <span className="font-medium">{listing.view_count || 0} 次</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      刊登時間
                    </span>
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(listing.created_at), {
                        addSuffix: true,
                        locale: zhTW,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seller Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">賣家資訊</CardTitle>
              </CardHeader>
              <CardContent>
                {seller && (
                  <div className="space-y-4">
                    <Link
                      to={`/user/${seller.user_id}`}
                      className="flex items-center gap-3 hover:bg-muted/50 p-2 -m-2 rounded-lg transition-colors"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={seller.avatar_url || undefined} />
                        <AvatarFallback>
                          {seller.username?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {seller.display_name || seller.username}
                          </span>
                          {seller.is_verified && (
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          )}
                          {seller.is_vip && (
                            <Crown className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{seller.username}
                        </p>
                      </div>
                    </Link>

                    <div className="text-sm text-muted-foreground">
                      加入於 {format(new Date(seller.created_at), 'yyyy年M月', { locale: zhTW })}
                    </div>

                    {!isOwner && !listing.is_sold && (
                      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="gold"
                            className="w-full gap-2"
                            onClick={handleContactSeller}
                          >
                            <MessageSquare className="h-4 w-4" />
                            聯繫賣家
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>聯繫賣家</DialogTitle>
                            <DialogDescription>
                              發送訊息給 {seller.display_name || seller.username}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-1">詢問商品</p>
                              <p className="text-sm text-muted-foreground">
                                {listing.title}
                              </p>
                            </div>

                            <Textarea
                              placeholder="輸入您想詢問的訊息..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              rows={4}
                            />


                            <Button onClick={handleSendMessage} className="w-full" disabled={isSending || !message.trim()}>
                              {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                              {isSending ? '發送中...' : '發送訊息'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {isOwner && !listing.is_sold && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={openEditDialog}
                      >
                        <Pencil className="h-4 w-4" />
                        編輯商品
                      </Button>
                    )}

                    {isOwner && !listing.is_sold && (
                      <Button
                        variant="gold"
                        className="w-full"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('marketplace_listings')
                            .update({ is_sold: true })
                            .eq('id', listing.id);
                          if (error) {
                            toast({ title: '操作失敗', variant: 'destructive' });
                          } else {
                            toast({ title: '已標記為售出' });
                            navigate('/marketplace');
                          }
                        }}
                      >
                        標記為已售出
                      </Button>
                    )}
                    {isOwner && (
                      <Button
                        variant="outline"
                        className="w-full text-destructive hover:text-destructive"
                        onClick={async () => {
                          if (!confirm('確定要刪除此商品？')) return;
                          const { error } = await supabase
                            .from('marketplace_listings')
                            .delete()
                            .eq('id', listing.id);
                          if (error) {
                            toast({ title: '刪除失敗', variant: 'destructive' });
                          } else {
                            toast({ title: '商品已刪除' });
                            navigate('/marketplace');
                          }
                        }}
                      >
                        刪除商品
                      </Button>
                    )}
                    {!isOwner && (
                      <ReportDialog
                        contentType="listing"
                        contentId={listing.id}
                        reportedUserId={listing.user_id}
                        trigger={
                          <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-destructive">
                            <Flag className="h-4 w-4" />
                            檢舉此商品
                          </Button>
                        }
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>編輯商品</DialogTitle>
            <DialogDescription>修改商品資訊後點擊儲存</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>標題</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>說明</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>品牌</Label>
                <Input value={editForm.brand} onChange={(e) => setEditForm(f => ({ ...f, brand: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>型號</Label>
                <Input value={editForm.model} onChange={(e) => setEditForm(f => ({ ...f, model: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>狀態</Label>
                <Select value={editForm.condition} onValueChange={(v) => setEditForm(f => ({ ...f, condition: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">全新</SelectItem>
                    <SelectItem value="like_new">幾乎全新</SelectItem>
                    <SelectItem value="good">良好</SelectItem>
                    <SelectItem value="fair">普通</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>價格 (TWD)</Label>
                <Input type="number" value={editForm.price} onChange={(e) => setEditForm(f => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>地點</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm(f => ({ ...f, location: e.target.value }))} />
            </div>

            {/* Image Management */}
            <div className="space-y-2">
              <Label>附加圖片</Label>
              <div className="grid grid-cols-4 gap-2">
                {(listing?.additional_images || [])
                  .filter(url => !editRemovedImages.includes(url))
                  .map((url, i) => (
                    <div key={url} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditRemovedImages(prev => [...prev, url])}
                        className="absolute top-1 right-1 p-1 bg-background/80 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                {editNewImages.map((file, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditNewImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 p-1 bg-background/80 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {((listing?.additional_images || []).filter(u => !editRemovedImages.includes(u)).length + editNewImages.length) < 5 && (
                  <button
                    type="button"
                    onClick={() => editImageInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center"
                  >
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <input
                ref={editImageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleEditImageAdd(e.target.files)}
              />
            </div>

            <Button onClick={handleSaveEdit} className="w-full" disabled={isEditSaving || !editForm.title || !editForm.price}>
              {isEditSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {isEditSaving ? '儲存中...' : '儲存變更'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
