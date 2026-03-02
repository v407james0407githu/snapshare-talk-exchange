import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, Star, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

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

interface PhotoCardProps {
  photo: FeaturedPhoto;
}

function PhotoCard({ photo }: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/gallery/${photo.id}`}
      className="group relative block overflow-hidden rounded-xl bg-card border border-border hover-lift"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={photo.thumbnailUrl || photo.imageUrl}
          alt={photo.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>

      <div
        className={`absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif text-lg font-bold text-cream mb-1">
            {photo.title}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            {photo.avatarUrl ? (
              <img src={photo.avatarUrl} alt={photo.author} className="w-5 h-5 rounded-full object-cover" />
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

      <div className="absolute top-3 right-3">
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-xs font-medium text-charcoal">
          <Star className="h-3 w-3 fill-current" /> {photo.rating.toFixed(1)}
        </span>
      </div>
    </Link>
  );
}

function PhotoCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border">
      <Skeleton className="aspect-[4/3] w-full" />
    </div>
  );
}

export function FeaturedGallery() {
  const [photos, setPhotos] = useState<FeaturedPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatured() {
      const { data, error } = await supabase
        .from("photos")
        .select("id, title, image_url, thumbnail_url, like_count, comment_count, view_count, average_rating, camera_body, phone_model, brand, user_id, profiles!inner(username, display_name, avatar_url)")
        .eq("is_featured", true)
        .eq("is_hidden", false)
        .order("like_count", { ascending: false })
        .limit(13);

      if (error) {
        console.error("載入精選作品失敗:", error);
        setLoading(false);
        return;
      }

      const mapped: FeaturedPhoto[] = (data || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url,
        thumbnailUrl: p.thumbnail_url,
        author: p.profiles?.display_name || p.profiles?.username || "匿名",
        avatarUrl: p.profiles?.avatar_url,
        likes: p.like_count || 0,
        comments: p.comment_count || 0,
        views: p.view_count || 0,
        rating: Number(p.average_rating) || 0,
        equipment: p.phone_model || p.camera_body || p.brand || "未知設備",
      }));

      setPhotos(mapped);
      setLoading(false);
    }

    fetchFeatured();
  }, []);

  // 不顯示空區塊
  if (!loading && photos.length === 0) return null;

  // 分配到三行: 4-5-4
  const row1 = photos.slice(0, 4);
  const row2 = photos.slice(4, 9);
  const row3 = photos.slice(9, 13);

  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              精選<span className="text-gradient">作品</span>
            </h2>
            <p className="text-muted-foreground">
              社群精選的優質攝影作品
            </p>
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
              {Array.from({ length: 4 }).map((_, i) => <PhotoCardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <PhotoCardSkeleton key={i} />)}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <PhotoCardSkeleton key={i} />)}
            </div>
          </div>
        ) : (
          <>
            {row1.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {row1.map((photo) => <PhotoCard key={photo.id} photo={photo} />)}
              </div>
            )}
            {row2.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                {row2.map((photo) => <PhotoCard key={photo.id} photo={photo} />)}
              </div>
            )}
            {row3.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {row3.map((photo) => <PhotoCard key={photo.id} photo={photo} />)}
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
