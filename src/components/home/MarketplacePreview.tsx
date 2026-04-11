import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Clock, ShieldCheck, Eye, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabase } from "@/lib/publicSupabase";
import { readBootstrapCache, writeBootstrapCache } from "@/lib/bootstrapCache";

interface ListingItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  verification_image_url: string;
  condition: string;
  location: string | null;
  is_verified: boolean;
  created_at: string;
  user_id: string;
  view_count: number;
  inquiry_count: number;
  seller?: {
    username: string;
    display_name: string | null;
  };
}

type MarketplacePreviewRow = {
  id: string;
  title: string;
  price: number;
  currency: string;
  verification_image_url: string;
  condition: string;
  location: string | null;
  is_verified: boolean;
  created_at: string;
  user_id: string;
  view_count: number | null;
  inquiry_count: number | null;
  seller_username: string | null;
  seller_display_name: string | null;
};

function normalizeSellerName(
  profile?: { display_name?: string | null; username?: string | null },
  userId?: string,
) {
  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  const username = profile?.username?.trim();
  if (username) return username;

  return userId ? `會員 ${userId.slice(0, 8)}` : "愛屁543會員";
}

const conditionLabels: Record<string, string> = {
  new: "全新",
  like_new: "幾乎全新",
  good: "良好",
  fair: "普通",
};

const conditionColors: Record<string, string> = {
  new: "bg-green-500/10 text-green-600",
  like_new: "bg-blue-500/10 text-blue-600",
  good: "bg-yellow-500/10 text-yellow-600",
  fair: "bg-muted text-muted-foreground",
};

export function MarketplacePreview({ sectionTitle, sectionSubtitle }: { sectionTitle?: string; sectionSubtitle?: string } = {}) {
  const cacheKey = "homepage-marketplace-preview-v2";
  const cachedListings = readBootstrapCache<ListingItem[]>(cacheKey);
  const initialListings = cachedListings && cachedListings.length > 0 ? cachedListings : undefined;

  const { data: listings = [], isLoading, isFetched } = useQuery({
    queryKey: ["homepage-marketplace-preview", "v2"],
    queryFn: async () => {
      const supabase = await getPublicSupabase();
      const { data: publicPreview, error: publicPreviewError } = await supabase.rpc("get_public_marketplace_preview");

      let items: ListingItem[] = [];

      if (!publicPreviewError && Array.isArray(publicPreview) && publicPreview.length > 0) {
        items = (publicPreview as MarketplacePreviewRow[]).map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          currency: item.currency,
          verification_image_url: item.verification_image_url,
          condition: item.condition,
          location: item.location,
          is_verified: item.is_verified,
          created_at: item.created_at,
          user_id: item.user_id,
          view_count: item.view_count ?? 0,
          inquiry_count: item.inquiry_count ?? 0,
          seller: {
            username: item.seller_username,
            display_name: normalizeSellerName(
              {
                display_name: item.seller_display_name,
                username: item.seller_username,
              },
              item.user_id,
            ),
          },
        }));
      } else {
        const { data, error } = await supabase
          .from("marketplace_listings")
          .select("id, title, price, currency, verification_image_url, condition, location, is_verified, created_at, user_id, view_count")
          .eq("is_hidden", false)
          .eq("is_sold", false)
          .order("created_at", { ascending: false })
          .limit(6);
        if (error) throw error;

        items = ((data || []) as Array<ListingItem & { view_count?: number | null }>).map((item) => ({
          ...item,
          view_count: item.view_count ?? 0,
          inquiry_count: 0,
        }));

        if (items.length > 0) {
          const userIds = [...new Set(items.map((i) => i.user_id))];
          const { data: profiles, error: profilesError } = await supabase.rpc("get_public_profiles");
          if (profilesError) throw profilesError;
          if (profiles) {
            const map = new Map(
              profiles
                .filter((p) => userIds.includes(p.user_id))
                .map((p) => [p.user_id, p] as const),
            );
            items.forEach((item) => {
              const p = map.get(item.user_id);
              item.seller = {
                username: p?.username ?? null,
                display_name: normalizeSellerName(
                  p ? { display_name: p.display_name, username: p.username } : undefined,
                  item.user_id,
                ),
              };
            });
          }
        }
      }

      writeBootstrapCache(cacheKey, items);
      return items;
    },
    initialData: initialListings,
    staleTime: 5 * 60 * 1000,
  });

  if (isFetched && !isLoading && listings.length === 0) return null;

  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              {sectionTitle || "二手交易區"}
            </h2>
            <p className="text-muted-foreground">
              {sectionSubtitle || "社群認證的安心買賣平台"}
            </p>
          </div>
          <Link to="/marketplace">
            <Button variant="outline" className="hidden sm:flex gap-2">
              瀏覽更多
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground">
            <div className="col-span-5">商品</div>
            <div className="col-span-2 text-center">回覆 / 瀏覽</div>
            <div className="col-span-1 text-center">品相</div>
            <div className="col-span-2 text-center">價格</div>
            <div className="col-span-2 text-right">刊登時間</div>
          </div>

          {/* Listings */}
          <div className="divide-y divide-border min-h-[460px]">
            {isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-6 py-4">
                    <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                      <div className="col-span-5 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-muted animate-pulse flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                          <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="col-span-2 hidden md:flex justify-center">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="col-span-1 hidden md:flex justify-center">
                        <div className="h-5 w-14 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="col-span-2 hidden md:flex justify-center">
                        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="col-span-2 hidden md:flex justify-end">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              listings.map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/${item.id}`}
                  className="group block px-6 py-4 motion-list-item hover:bg-muted/40"
                >
                  <div className="md:grid md:grid-cols-12 md:gap-4 md:items-center">
                    {/* Thumbnail + Title */}
                    <div className="col-span-5 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.verification_image_url}
                          alt={item.title}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover motion-media"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          {item.is_verified && (
                            <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          )}
                          <h3 className="font-medium text-foreground line-clamp-1 motion-list-title">
                            {item.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">
                            {item.seller?.display_name || item.seller?.username || normalizeSellerName(undefined, item.user_id)}
                          </span>
                          {item.location && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="h-3 w-3" />
                                {item.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies / Views - desktop */}
                    <div className="col-span-2 hidden md:flex items-center justify-center gap-4">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        {item.inquiry_count}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        {item.view_count}
                      </span>
                    </div>

                    {/* Condition - desktop */}
                    <div className="col-span-1 hidden md:flex justify-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${conditionColors[item.condition] || ""}`}>
                        {conditionLabels[item.condition] || item.condition}
                      </span>
                    </div>

                    {/* Price - desktop */}
                    <div className="col-span-2 hidden md:flex justify-center">
                      <span className="font-bold text-primary">
                        NT$ {item.price.toLocaleString()}
                      </span>
                    </div>

                    {/* Time - desktop */}
                    <div className="col-span-2 hidden md:flex items-center justify-end gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: zhTW })}
                    </div>

                    {/* Mobile meta row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 md:hidden text-sm text-muted-foreground">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${conditionColors[item.condition] || ""}`}>
                        {conditionLabels[item.condition] || item.condition}
                      </span>
                      <span className="font-bold text-primary text-sm">
                        NT$ {item.price.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {item.inquiry_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {item.view_count}
                      </span>
                      <span className="flex items-center gap-1 ml-auto">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: zhTW })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/marketplace">
            <Button variant="outline" className="gap-2">
              瀏覽更多商品
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
