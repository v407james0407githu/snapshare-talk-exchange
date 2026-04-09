import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Heart, Eye, MessageCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { pickImageSrc, SIZES } from "@/lib/responsiveImage";

type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type FollowedPhoto = {
  id: string;
  user_id: string;
  title: string;
  image_url: string;
  thumbnail_url: string | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  created_at: string;
  profiles?: PublicProfile;
};

function getAuthorName(profile?: PublicProfile) {
  return profile?.display_name?.trim() || profile?.username?.trim() || "愛屁543會員";
}

function FollowedPhotoCard({ photo }: { photo: FollowedPhoto }) {
  return (
    <Link
      to={`/gallery/${photo.id}`}
      state={{ photoPreview: photo }}
      className="group overflow-hidden rounded-2xl border border-border bg-card motion-card-surface motion-press"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={pickImageSrc(photo.image_url, photo.thumbnail_url)}
          alt={photo.title}
          sizes={SIZES.card}
          width={400}
          height={300}
          className="h-full w-full object-cover motion-media"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-1 text-base font-semibold motion-list-title">{photo.title}</h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">{getAuthorName(photo.profiles)}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {photo.like_count || 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {photo.comment_count || 0}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {photo.view_count || 0}</span>
        </div>
      </div>
    </Link>
  );
}

export function FollowingFeed() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["homepage-following-feed", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: follows, error: followsError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user!.id)
        .limit(40);

      if (followsError) throw followsError;

      const followingIds = [...new Set((follows || []).map((row) => row.following_id))];
      if (followingIds.length === 0) return { followingIds, photos: [] as FollowedPhoto[] };

      const { data: photos, error: photosError } = await supabase
        .from("photos")
        .select("id, user_id, title, image_url, thumbnail_url, like_count, comment_count, view_count, created_at")
        .in("user_id", followingIds)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(8);

      if (photosError) throw photosError;

      const { data: profilesData, error: profilesError } = await supabase.rpc("get_public_profiles");
      if (profilesError) throw profilesError;

      const profileMap = new Map(
        ((profilesData as PublicProfile[] | null) || [])
          .filter((profile) => followingIds.includes(profile.user_id))
          .map((profile) => [profile.user_id, profile]),
      );

      return {
        followingIds,
        photos: ((photos as FollowedPhoto[] | null) || []).map((photo) => ({
          ...photo,
          profiles: profileMap.get(photo.user_id),
        })),
      };
    },
  });

  if (!user) return null;
  if (isLoading) {
    return (
      <section className="py-10">
        <div className="container space-y-4">
          <div className="h-8 w-52 animate-pulse rounded-lg bg-muted" />
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[4/3] animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!data?.followingIds?.length) {
    return (
      <section className="py-10">
        <div className="container">
          <div className="rounded-3xl border border-border bg-card/70 p-6 md:p-8 motion-panel">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">追蹤攝影師的新作品</span>
                </div>
                <h2 className="font-serif text-2xl font-bold">先追蹤幾位攝影師，首頁就會顯示他們的新作品</h2>
                <p className="text-muted-foreground">在作品頁或攝影師頁點擊追蹤，就能建立你的專屬靈感流。</p>
              </div>
              <Button asChild variant="outline" className="motion-interactive motion-press">
                <Link to="/gallery">去找攝影師</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!data.photos.length) return null;

  return (
    <section className="py-10">
      <div className="container space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium">追蹤攝影師的新作品</span>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-serif text-3xl font-bold">你追蹤的攝影師剛剛更新了作品</h2>
              <p className="text-muted-foreground">回來首頁就能直接看到最新發表，不用再一張一張找。</p>
            </div>
            <Button asChild variant="outline" className="motion-interactive motion-press">
              <Link to="/gallery">瀏覽更多作品</Link>
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.photos.map((photo) => (
            <FollowedPhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      </div>
    </section>
  );
}
