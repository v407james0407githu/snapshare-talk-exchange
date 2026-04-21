import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search, Plus, Shield, ShieldCheck, Camera, Smartphone, Eye, Loader2, AlertTriangle, Clock,
  LayoutGrid, List
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useMarketplaceCategories, MarketplaceCategorySidebar } from '@/components/marketplace/MarketplaceCategorySelector';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketplaceListings } from '@/lib/publicRoutePrefetch';
import { prefetchListingDetailBundle } from '@/lib/listingDetailPrefetch';
import { pickImageSrc, SIZES } from '@/lib/responsiveImage';

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
  new: '全新', like_new: '幾乎全新', good: '良好', fair: '普通',
};

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const brandParam = searchParams.get('brand');
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [showSold, setShowSold] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: categories, isLoading: categoriesLoading } = useMarketplaceCategories();

  useEffect(() => {
    if (!categoryParam) {
      if (selectedCategory) setSelectedCategory(null);
      if (selectedSubCategory) setSelectedSubCategory(null);
      return;
    }

    if (!categories?.length) return;

    const matchedCategory = categories.find(
      (category) =>
        category.id === categoryParam ||
        category.slug === categoryParam ||
        category.name === categoryParam,
    );

    const nextCategory = matchedCategory?.id ?? null;
    const nextSubCategory = nextCategory ? brandParam : null;

    if (selectedCategory !== nextCategory) setSelectedCategory(nextCategory);
    if (selectedSubCategory !== nextSubCategory) setSelectedSubCategory(nextSubCategory);
  }, [brandParam, categories, categoryParam, selectedCategory, selectedSubCategory]);

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['marketplace-listings', showSold],
    queryFn: () => fetchMarketplaceListings(showSold) as Promise<Listing[]>,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  const prefetchListing = useCallback((listing: Listing) => {
    void prefetchListingDetailBundle(listing.id, listing);
  }, []);

  const markListingNavigationStart = useCallback((listingId: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        `listing-detail-nav:${listingId}`,
        JSON.stringify({
          listingId,
          at: performance.now(),
          timestamp: Date.now(),
          source: 'marketplace-list',
        }),
      );
    } catch {
      // Ignore storage failures in private mode or restricted browsers.
    }
  }, []);

  const listingSkeletons = Array.from({ length: 6 }, (_, idx) => idx);

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.model?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCondition = conditionFilter === 'all' || listing.condition === conditionFilter;

    // Category filtering
    let matchesCategory = true;
    if (selectedCategory && categories) {
      const cat = categories.find(c => c.id === selectedCategory);
      if (cat) {
        if (selectedSubCategory) {
          matchesCategory = listing.brand === selectedSubCategory;
        } else {
          matchesCategory = listing.category === cat.slug || listing.category === cat.name;
        }
      }
    }

    return matchesSearch && matchesCondition && matchesCategory;
  });

  // Count listings per category slug
  const listingCounts: Record<string, number> = {};
  listings.forEach(l => {
    const cat = categories?.find(c => c.slug === l.category || c.name === l.category);
    if (cat) listingCounts[cat.slug] = (listingCounts[cat.slug] || 0) + 1;
  });

  const handleCategoryChange = (catId: string | null) => {
    setSelectedCategory(catId);
    setSelectedSubCategory(null);
    const next = new URLSearchParams(searchParams);
    const category = categories?.find((cat) => cat.id === catId);
    if (category) next.set('category', category.slug);
    else next.delete('category');
    next.delete('brand');
    setSearchParams(next, { replace: true });
  };

  const handleSubCategoryChange = (brand: string | null) => {
    setSelectedSubCategory(brand);
    const next = new URLSearchParams(searchParams);
    if (brand) next.set('brand', brand);
    else next.delete('brand');
    setSearchParams(next, { replace: true });
  };

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">二手交易</h1>
            <p className="text-muted-foreground">安全交易攝影裝備，所有商品需實物驗證</p>
          </div>
          <Link to="/marketplace/create">
            <Button variant="gold" className="gap-2"><Plus className="h-4 w-4" />刊登商品</Button>
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜尋商品..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>

              <MarketplaceCategorySidebar
                categories={categories}
                selectedCategory={selectedCategory}
                selectedSubCategory={selectedSubCategory}
                onSelectCategory={handleCategoryChange}
                onSelectSubCategory={handleSubCategoryChange}
                listingCounts={listingCounts}
              />

              {/* Filters */}
              <div className="bg-card rounded-xl border border-border p-4 space-y-4 motion-panel">
                <h3 className="font-semibold">篩選條件</h3>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">商品狀態</label>
                  <Select value={conditionFilter} onValueChange={setConditionFilter}>
                    <SelectTrigger><SelectValue placeholder="狀態" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部狀態</SelectItem>
                      <SelectItem value="new">全新</SelectItem>
                      <SelectItem value="like_new">幾乎全新</SelectItem>
                      <SelectItem value="good">良好</SelectItem>
                      <SelectItem value="fair">普通</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant={showSold ? "default" : "outline"}
                  onClick={() => setShowSold(!showSold)}
                  className="w-full"
                  size="sm"
                >
                  {showSold ? "隱藏已售出" : "顯示已售出"}
                </Button>
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3">
            {/* View mode toggle */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{filteredListings.length} 件商品</p>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode('grid')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoading || categoriesLoading ? (
              viewMode === 'list' ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="hidden md:grid grid-cols-12 gap-4 border-b border-border bg-muted/40 px-4 py-3">
                    <div className="col-span-5 h-4 w-16 animate-pulse rounded bg-muted" />
                    <div className="col-span-2 h-4 w-12 animate-pulse rounded bg-muted" />
                    <div className="col-span-2 ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                    <div className="col-span-1 mx-auto h-4 w-8 animate-pulse rounded bg-muted" />
                    <div className="col-span-2 ml-auto h-4 w-12 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="divide-y divide-border">
                    {listingSkeletons.map((idx) => (
                      <div key={idx} className="px-4 py-3">
                        <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-5 flex items-center gap-3">
                            <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                            </div>
                          </div>
                          <div className="col-span-2 h-5 w-14 animate-pulse rounded-full bg-muted" />
                          <div className="col-span-2 ml-auto h-5 w-20 animate-pulse rounded bg-muted" />
                          <div className="col-span-1 mx-auto h-4 w-8 animate-pulse rounded bg-muted" />
                          <div className="col-span-2 ml-auto h-4 w-16 animate-pulse rounded bg-muted" />
                        </div>
                        <div className="md:hidden flex items-center gap-3">
                          <div className="h-12 w-12 animate-pulse rounded-lg bg-muted" />
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listingSkeletons.map((idx) => (
                    <Card key={idx} className="overflow-hidden">
                      <div className="aspect-[4/3] animate-pulse bg-muted" />
                      <CardHeader className="space-y-2 pb-2">
                        <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
                        <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex gap-2">
                          <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
                          <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                          </div>
                          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )
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
            ) : viewMode === 'list' ? (
              /* List view - discussion style */
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Header row - desktop */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground">
                  <div className="col-span-5">商品</div>
                  <div className="col-span-2">品相</div>
                  <div className="col-span-2 text-right">價格</div>
                  <div className="col-span-1 text-center">瀏覽</div>
                  <div className="col-span-2 text-right">時間</div>
                </div>
                {filteredListings.map((listing, idx) => (
                  <Link
                    key={listing.id}
                    to={`/marketplace/${listing.id}`}
                    state={{ listingPreview: listing }}
                    onMouseEnter={() => prefetchListing(listing)}
                    onFocus={() => prefetchListing(listing)}
                    onMouseDown={() => {
                      markListingNavigationStart(listing.id);
                      prefetchListing(listing);
                    }}
                    onPointerDown={() => prefetchListing(listing)}
                    onTouchStart={() => {
                      markListingNavigationStart(listing.id);
                      prefetchListing(listing);
                    }}
                    onClick={() => markListingNavigationStart(listing.id)}
                  >
                    <div className={`group motion-list-item hover:bg-muted/40 ${idx < filteredListings.length - 1 ? 'border-b border-border' : ''} ${listing.is_sold ? 'opacity-60' : ''}`}>
                      {/* Desktop */}
                      <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 items-center">
                        <div className="col-span-5 flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                            <img
                              src={pickImageSrc(listing.verification_image_url, null)}
                              alt={listing.title}
                              loading={idx < 4 ? "eager" : "lazy"}
                              fetchPriority={idx < 2 ? "high" : "auto"}
                              decoding="async"
                              sizes={SIZES.marketplace}
                              className="w-full h-full object-cover motion-media"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm line-clamp-1 motion-list-title">{listing.title}</h3>
                              {listing.is_sold && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">已售出</Badge>}
                              {!listing.is_sold && listing.is_verified && <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-primary gap-0.5"><ShieldCheck className="h-2.5 w-2.5" />已驗證</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {listing.profiles?.username}{listing.brand ? ` · ${listing.brand}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge variant="outline" className="text-xs">{conditionLabels[listing.condition]}</Badge>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="font-bold text-primary">${listing.price.toLocaleString()}</span>
                        </div>
                        <div className="col-span-1 text-center text-xs text-muted-foreground">
                          {listing.view_count}
                        </div>
                        <div className="col-span-2 text-right text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: zhTW })}
                        </div>
                      </div>
                      {/* Mobile */}
                      <div className="md:hidden px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted">
                            <img
                              src={pickImageSrc(listing.verification_image_url, null)}
                              alt={listing.title}
                              loading="lazy"
                              decoding="async"
                              sizes={SIZES.marketplace}
                              className="w-full h-full object-cover motion-media"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-sm line-clamp-1 motion-list-title">{listing.title}</h3>
                              {listing.is_sold && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">已售出</Badge>}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">{conditionLabels[listing.condition]}</Badge>
                              <span className="font-bold text-primary">${listing.price.toLocaleString()}</span>
                              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{listing.view_count}</span>
                              <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: zhTW })}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              /* Grid view - card style */
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredListings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/marketplace/${listing.id}`}
                    state={{ listingPreview: listing }}
                    onMouseEnter={() => prefetchListing(listing)}
                    onFocus={() => prefetchListing(listing)}
                    onMouseDown={() => {
                      markListingNavigationStart(listing.id);
                      prefetchListing(listing);
                    }}
                    onPointerDown={() => prefetchListing(listing)}
                    onTouchStart={() => {
                      markListingNavigationStart(listing.id);
                      prefetchListing(listing);
                    }}
                    onClick={() => markListingNavigationStart(listing.id)}
                  >
                    <Card className={`group overflow-hidden motion-card-surface motion-press h-full ${listing.is_sold ? 'opacity-70' : ''}`}>
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <img
                          src={pickImageSrc(listing.verification_image_url, null)}
                          alt={listing.title}
                          loading="lazy"
                          decoding="async"
                          sizes={SIZES.marketplace}
                          className="w-full h-full object-cover motion-media"
                        />
                        <div className="absolute top-2 left-2 flex gap-1">
                          <Badge variant="secondary" className="gap-1">
                            {listing.category === 'phone' ? <Smartphone className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                            {listing.category}
                          </Badge>
                        </div>
                        {listing.is_sold && <Badge variant="destructive" className="absolute top-2 right-2">已售出</Badge>}
                        {!listing.is_sold && listing.is_verified && (
                          <Badge className="absolute top-2 right-2 gap-1 bg-green-500"><ShieldCheck className="h-3 w-3" />已驗證</Badge>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <h3 className="font-semibold line-clamp-2 motion-list-title">{listing.title}</h3>
                        <p className="text-2xl font-bold text-primary">
                          ${listing.price.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">{listing.currency}</span>
                        </p>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline">{conditionLabels[listing.condition]}</Badge>
                          {listing.brand && <Badge variant="outline">{listing.brand}</Badge>}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={listing.profiles?.avatar_url || undefined} loading="lazy" decoding="async" />
                              <AvatarFallback>{(listing.profiles?.display_name || listing.profiles?.username || '會').slice(0, 1)}</AvatarFallback>
                            </Avatar>
                            <span className="flex items-center gap-1">
                              {listing.profiles?.display_name || listing.profiles?.username}
                              {listing.profiles?.is_verified && <ShieldCheck className="h-3 w-3 text-primary" />}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{listing.view_count}</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(listing.created_at), { addSuffix: true, locale: zhTW })}
                            </span>
                          </div>
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </MainLayout>
  );
}
