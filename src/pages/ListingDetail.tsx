import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Phone,
  Mail,
  Crown,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
  phone: string | null;
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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [message, setMessage] = useState('');

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

  // Fetch seller profile
  const { data: seller } = useQuery({
    queryKey: ['seller-profile', listing?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', listing?.user_id)
        .single();

      if (error) throw error;
      return data as SellerProfile;
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

  const handleSendMessage = () => {
    if (!message.trim()) {
      toast({
        title: '請輸入訊息',
        variant: 'destructive',
      });
      return;
    }

    // In a real app, you would send this message to a messaging system
    toast({
      title: '訊息已發送',
      description: '賣家會盡快回覆您',
    });
    setMessage('');
    setContactDialogOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
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

                            {seller.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>賣家電話：{seller.phone}</span>
                              </div>
                            )}

                            <Button onClick={handleSendMessage} className="w-full">
                              發送訊息
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {isOwner && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => navigate(`/marketplace/edit/${listing.id}`)}
                      >
                        編輯商品
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
