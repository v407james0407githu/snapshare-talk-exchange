import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Heart,
  Camera,
  ShoppingBag,
  Eye,
  Star,
  MessageCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

interface Photo {
  id: string;
  title: string;
  image_url: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  average_rating: number;
}

interface Listing {
  id: string;
  title: string;
  verification_image_url: string;
  price: number;
  currency: string;
  condition: string;
  is_sold: boolean;
}

const conditionLabels: Record<string, string> = {
  new: '全新',
  like_new: '幾乎全新',
  good: '良好',
  fair: '普通',
};

export default function Favorites() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('photos');
  const { favorites, favoritesLoading, removeFavorite } = useFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // 獲取收藏的照片
  const photoIds = favorites?.filter((f) => f.content_type === 'photo').map((f) => f.content_id) || [];
  const { data: favoritePhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['favorite-photos', photoIds],
    queryFn: async () => {
      if (photoIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('photos')
        .select('id, title, image_url, like_count, comment_count, view_count, average_rating')
        .in('id', photoIds);

      if (error) throw error;
      return data as Photo[];
    },
    enabled: photoIds.length > 0,
  });

  // 獲取收藏的商品
  const listingIds = favorites?.filter((f) => f.content_type === 'listing').map((f) => f.content_id) || [];
  const { data: favoriteListings, isLoading: listingsLoading } = useQuery({
    queryKey: ['favorite-listings', listingIds],
    queryFn: async () => {
      if (listingIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('id, title, verification_image_url, price, currency, condition, is_sold')
        .in('id', listingIds);

      if (error) throw error;
      return data as Listing[];
    },
    enabled: listingIds.length > 0,
  });

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
          <h1 className="text-3xl font-bold mb-2">我的收藏</h1>
          <p className="text-muted-foreground">
            管理您收藏的作品和商品
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="photos" className="gap-2">
              <Camera className="h-4 w-4" />
              作品 ({photoIds.length})
            </TabsTrigger>
            <TabsTrigger value="listings" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              商品 ({listingIds.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos">
            {favoritesLoading || photosLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : favoritePhotos?.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favoritePhotos.map((photo) => (
                  <div key={photo.id} className="group relative">
                    <Link
                      to={`/gallery/${photo.id}`}
                      className="block overflow-hidden rounded-xl bg-card border border-border hover-lift"
                    >
                      <div className="aspect-[4/3] overflow-hidden">
                        <img
                          src={photo.image_url}
                          alt={photo.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold line-clamp-1 mb-2">{photo.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="h-4 w-4" /> {photo.like_count || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" /> {photo.comment_count || 0}
                          </span>
                          {(photo.average_rating || 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-primary text-primary" />
                              {Number(photo.average_rating).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        removeFavorite.mutate({ type: 'photo', id: photo.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="py-12 text-center">
                <CardContent>
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">尚無收藏的作品</h3>
                  <p className="text-muted-foreground mb-4">
                    瀏覽作品區並點擊愛心收藏喜歡的作品
                  </p>
                  <Link to="/gallery">
                    <Button>瀏覽作品</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="listings">
            {favoritesLoading || listingsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : favoriteListings?.length ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favoriteListings.map((listing) => (
                  <div key={listing.id} className="group relative">
                    <Link
                      to={`/marketplace/${listing.id}`}
                      className="block overflow-hidden rounded-xl bg-card border border-border hover-lift"
                    >
                      <div className="aspect-[4/3] overflow-hidden relative">
                        <img
                          src={listing.verification_image_url}
                          alt={listing.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {listing.is_sold && (
                          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                            <Badge variant="destructive">已售出</Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold line-clamp-1 mb-2">{listing.title}</h3>
                        <p className="text-xl font-bold text-primary">
                          ${listing.price.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {listing.currency}
                          </span>
                        </p>
                        <Badge variant="outline" className="mt-2">
                          {conditionLabels[listing.condition]}
                        </Badge>
                      </div>
                    </Link>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault();
                        removeFavorite.mutate({ type: 'listing', id: listing.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="py-12 text-center">
                <CardContent>
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">尚無收藏的商品</h3>
                  <p className="text-muted-foreground mb-4">
                    瀏覽二手交易區並收藏感興趣的商品
                  </p>
                  <Link to="/marketplace">
                    <Button>瀏覽商品</Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
