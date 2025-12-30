import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Plus,
  MapPin,
  Clock,
  Shield,
  ShieldCheck,
  Camera,
  Smartphone,
  Eye,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
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

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setIsLoading(true);

    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('is_hidden', false)
      .eq('is_sold', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading listings:', error);
    } else {
      setListings((data || []) as Listing[]);
    }

    setIsLoading(false);
  };

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.model?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || listing.category === categoryFilter;
    const matchesCondition = conditionFilter === 'all' || listing.condition === conditionFilter;

    return matchesSearch && matchesCategory && matchesCondition;
  });

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">二手交易</h1>
            <p className="text-muted-foreground">
              安全交易攝影器材，所有商品需實物驗證
            </p>
          </div>
          <Link to="/marketplace/create">
            <Button variant="gold" className="gap-2">
              <Plus className="h-4 w-4" />
              刊登商品
            </Button>
          </Link>
        </div>

        {/* Anti-fraud Notice */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">防詐騙提醒</h3>
                <p className="text-sm text-muted-foreground">
                  所有商品刊登需上傳「實物驗證照」：請在商品旁放置一張手寫紙條，標明商品型號與您的用戶名，證明為實物拍攝。未通過驗證的商品將被移除。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋商品..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="分類" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分類</SelectItem>
              <SelectItem value="phone">手機</SelectItem>
              <SelectItem value="camera">相機</SelectItem>
              <SelectItem value="lens">鏡頭</SelectItem>
              <SelectItem value="accessory">配件</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="狀態" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部狀態</SelectItem>
              <SelectItem value="new">全新</SelectItem>
              <SelectItem value="like_new">幾乎全新</SelectItem>
              <SelectItem value="good">良好</SelectItem>
              <SelectItem value="fair">普通</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Listings Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredListings.length === 0 ? (
          <Card className="py-12 text-center">
            <CardContent>
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">沒有找到商品</h3>
              <p className="text-muted-foreground">
                {searchQuery ? '嘗試調整搜尋條件' : '目前還沒有商品上架'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map((listing) => (
              <Link key={listing.id} to={`/marketplace/${listing.id}`}>
                <Card className="overflow-hidden hover-lift h-full">
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img
                      src={listing.verification_image_url}
                      alt={listing.title}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="gap-1">
                        {listing.category === 'phone' ? (
                          <Smartphone className="h-3 w-3" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                        {categoryLabels[listing.category]}
                      </Badge>
                    </div>
                    {listing.is_verified && (
                      <Badge className="absolute top-2 right-2 gap-1 bg-green-500">
                        <ShieldCheck className="h-3 w-3" />
                        已驗證
                      </Badge>
                    )}
                  </div>
                  
                  <CardHeader className="pb-2">
                    <h3 className="font-semibold line-clamp-2">{listing.title}</h3>
                    <p className="text-2xl font-bold text-primary">
                      ${listing.price.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {listing.currency}
                      </span>
                    </p>
                  </CardHeader>

                  <CardContent className="pb-2">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{conditionLabels[listing.condition]}</Badge>
                      {listing.brand && (
                        <Badge variant="outline">{listing.brand}</Badge>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={listing.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {listing.profiles?.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex items-center gap-1">
                          {listing.profiles?.username}
                          {listing.profiles?.is_verified && (
                            <ShieldCheck className="h-3 w-3 text-primary" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {listing.view_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(listing.created_at), {
                            addSuffix: true,
                            locale: zhTW,
                          })}
                        </span>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
