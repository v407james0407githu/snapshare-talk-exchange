import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, Star, ArrowRight } from "lucide-react";
import { pickImageSrc, SIZES } from "@/lib/responsiveImage";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabase } from "@/lib/publicSupabase";
import { readBootstrapCache, writeBootstrapCache } from "@/lib/bootstrapCache";
import { useDeferredPublicQuery } from "@/hooks/useDeferredPublicQuery";

interface FeaturedPhoto {
  id: string;
  title: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  author: string;
  avatarUrl: string | null;
  likes: number;
  comments: number;
  views: number;
  rating: number;
  equipment: string;
}

type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function getAuthorDisplayName(profile?: PublicProfile) {
  const displayName = profile?.display_name?.trim();
  const username = profile?.username?.trim();
  return displayName || username || "愛屁543會員";
}

function PhotoCard({ photo }: { photo: FeaturedPhoto }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = pickImageSrc(photo.imageUrl, photo.thumbnailUrl);

  return (
    <Link
      to={`/gallery/${photo.id}`}
      className="group relative block overflow-hidden rounded-xl bg-card border border-border motion-card-surface motion-press"
    >
      {/* Fixed aspect-ratio — prevents CLS */}
      <div className="aspect-[4/3] overflow-hidden relative bg-muted">
        {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
        <img
          src={imgSrc}
          sizes={SIZES.card}
          alt={photo.title}
          width={400}
          height={300}
          className={`absolute inset-0 w-full h-full object-cover motion-media ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
        />
      </div>

      {/* Hover overlay — desktop only */}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif text-lg font-bold text-cream mb-1">{photo.title}</h3>
          <div className="flex items-center gap-2 mb-3">
            {photo.avatarUrl ? (
              <img
                src={photo.avatarUrl}
                alt={photo.author}
                className="w-5 h-5 rounded-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="w-5 h-5 rounded-full bg-primary/50 flex items-center justify-center text-xs text-cream">
                {photo.author.charAt(0)}
              </span>
            )}
            <span className="text-sm text-cream/80">{photo.author}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-cream/70">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" /> {photo.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> {photo.comments}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> {photo.views}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-3 left-3">
        <span className="px-2 py-1 rounded-full bg-charcoal/70 backdrop-blur-sm text-xs text-cream/90 border border-cream/20">
          {photo.equipment}
        </span>
      </div>

      {photo.rating > 0 && (
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-xs font-medium text-charcoal">
            <Star className="h-3 w-3 fill-current" /> {photo.rating.toFixed(1)}
          </span>
        </div>
      )}
    </Link>
  );
}

function PhotoCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border">
      <div className="aspect-[4/3] w-full bg-muted animate-pulse" />
    </div>
  );
}

export function FeaturedGallery({
  sectionTitle,
  sectionSubtitle,
}: { sectionTitle?: string; sectionSubtitle?: string } = {}) {
  const initialPhotos = readBootstrapCache<FeaturedPhoto[]>("homepage-featured-gallery") ?? [];
  const enabled = useDeferredPublicQuery(450);
  const { data: photos = [], isLoading: loading } = useQuery({
    queryKey: ["homepage-featured-gallery"],
    queryFn: async () => {
      const supabase = await getPublicSupabase();
      const { data, error } = await supabase
        .from("photos")
        .select(
          "id, title, image_url, thumbnail_url, like_count, comment_count, view_count, average_rating, camera_body, phone_model, brand, user_id, created_at",
        )
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error || !data || data.length === 0) {
        if (error) console.error("載入最新作品失敗:", error);
        return [];
      }

      const seenUsers = new Set<string>();
      const unique = data
        .filter((p) => {
          if (seenUsers.has(p.user_id)) return false;
          seenUsers.add(p.user_id);
          return true;
        })
        .slice(0, 13);

      const userIds = [...new Set(unique.map((p) => p.user_id))];
      const profileMap: Record<string, PublicProfile> = {};

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase.rpc("get_public_profiles");

        if (profilesError) throw profilesError;
        (profilesData || [])
          .filter((p: any) => userIds.includes(p.user_id))
          .forEach((p: any) => {
            profileMap[p.user_id] = {
              user_id: p.user_id,
              username: p.username?.trim() || null,
              display_name: p.display_name?.trim() || null,
              avatar_url: p.avatar_url || null,
            };
          });
      }

      const result = unique.map((p: any) => {
        const profile = profileMap[p.user_id];
        return {
          id: p.id,
          title: p.title,
          imageUrl: p.image_url,
          thumbnailUrl: p.thumbnail_url,
          author: getAuthorDisplayName(profile),
          avatarUrl: profile?.avatar_url || null,
          likes: p.like_count || 0,
          comments: p.comment_count || 0,
          views: p.view_count || 0,
          rating: Number(p.average_rating) || 0,
          equipment: p.phone_model || p.camera_body || p.brand || "未知設備",
        } as FeaturedPhoto;
      });
      writeBootstrapCache("homepage-featured-gallery", result);
      return result;
    },
    initialData: initialPhotos,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  if (!loading && photos.length === 0) return null;

  const row1 = photos.slice(0, 4);
  const row2 = photos.slice(4, 9);
  const row3 = photos.slice(9, 13);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">{sectionTitle || "精選作品"}</h2>
            <p className="text-muted-foreground">{sectionSubtitle || "論壇精選的優質攝影作品"}</p>
          </div>
          <Link to="/gallery">
            <Button variant="outline" className="hidden sm:flex gap-2">
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <PhotoCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <PhotoCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <PhotoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : (
          <>
            {row1.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {row1.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            )}
            {row2.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                {row2.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            )}
            {row3.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {row3.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} />
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link to="/gallery">
            <Button variant="outline" className="gap-2">
              查看全部作品
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
