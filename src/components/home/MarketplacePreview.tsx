import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShieldCheck, ArrowRight, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

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
  seller?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

const conditionLabels: Record<string, string> = {
  new: "全新",
  like_new: "幾乎全新",
  good: "良好",
  fair: "普通",
};

const conditionColors: Record<string, string> = {
  new: "bg-green-500/10 text-green-600 border-green-500/20",
  like_new: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  good: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  fair: "bg-muted text-muted-foreground border-border",
};

export function MarketplacePreview({ sectionTitle, sectionSubtitle }: { sectionTitle?: string; sectionSubtitle?: string } = {}) {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("id, title, price, currency, verification_image_url, condition, location, is_verified, created_at, user_id")
        .eq("is_hidden", false)
        .eq("is_sold", false)
        .order("created_at", { ascending: false })
        .limit(4);

      const items = (data || []) as ListingItem[];

      // Fetch seller profiles
      if (items.length > 0) {
        const { data: profiles } = await supabase.rpc("get_public_profiles");
        if (profiles) {
          const map = new Map((profiles as any[]).map((p: any) => [p.user_id, p]));
          items.forEach((item) => {
            const p = map.get(item.user_id);
            if (p) {
              item.seller = {
                username: p.username,
                display_name: p.display_name,
                avatar_url: p.avatar_url,
                is_verified: p.is_verified,
              };
            }
          });
        }
      }

      setListings(items);
      setIsLoading(false);
    };
    load();
  }, []);

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

        {/* Verification Notice */}
        <div className="flex items-center gap-3 p-4 mb-8 rounded-xl bg-primary/5 border border-primary/20">
          <ShieldCheck className="h-6 w-6 text-primary flex-shrink-0" />
          <p className="text-sm">
            <span className="font-medium">防詐騙機制：</span>
            賣家需手寫型號紙條並與實機一同拍照，確保為實物交易
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))
            : listings.map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/${item.id}`}
                  className="group bg-card rounded-xl border border-border overflow-hidden hover-lift"
                >
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={item.verification_image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <Badge
                      variant="outline"
                      className={`absolute top-3 left-3 ${conditionColors[item.condition] || ""}`}
                    >
                      {conditionLabels[item.condition] || item.condition}
                    </Badge>
                  </div>

                  <div className="p-4">
                    <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>

                    <div className="text-xl font-bold text-primary mb-3">
                      NT$ {item.price.toLocaleString()}
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      {item.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.location}
                        </div>
                      )}
                      {item.is_verified && (
                        <div className="flex items-center gap-1 text-primary">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          已認證
                        </div>
                      )}
                    </div>

                    {/* Seller info */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={item.seller?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {item.seller?.username?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.seller?.display_name || item.seller?.username || "賣家"}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(item.created_at), {
                          addSuffix: true,
                          locale: zhTW,
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
        </div>

        {!isLoading && listings.length === 0 && (
          <p className="text-center text-muted-foreground py-8">目前沒有商品上架</p>
        )}

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
