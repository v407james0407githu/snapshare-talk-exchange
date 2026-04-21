import { useState, useEffect, useMemo, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, Star, ImagePlus, Aperture, Clock, Sun, Award, ChevronLeft, ChevronRight, Sparkles, Camera } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GalleryFilters } from "@/components/gallery/GalleryFilters";
import { PhotoCardSkeleton } from "@/components/gallery/PhotoCardSkeleton";
import { pickImageSrc, SIZES } from "@/lib/responsiveImage";
import { useQuery } from "@tanstack/react-query";
import { prefetchPhotoDetailBundle } from "@/lib/photoDetailPrefetch";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { Json } from "@/integrations/supabase/types";

interface Photo {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url: string | null;
  user_id: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  average_rating: number;
  category: string;
  brand: string | null;
  camera_body: string | null;
  lens: string | null;
  phone_model: string | null;
  exif_data: Json | null;
  is_featured: boolean;
  profiles?: {
    user_id?: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PhotographerSpotlight {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  cover_photo: {
    id: string;
    title: string;
    image_url: string;
    thumbnail_url: string | null;
    like_count: number;
    comment_count: number;
    view_count: number;
    created_at: string;
  };
  photo_count: number;
}

const PAGE_SIZE = 20;

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

async function fetchGalleryPage({
  page,
  selectedCategory,
  selectedBrand,
  debouncedSearch,
  sortBy,
  featuredOnly,
}: {
  page: number;
  selectedCategory: string;
  selectedBrand: string;
  debouncedSearch: string;
  sortBy: "newest" | "most_liked" | "highest_rated";
  featuredOnly: boolean;
}) {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const orderColumn =
    sortBy === "most_liked" ? "like_count" : sortBy === "highest_rated" ? "average_rating" : "created_at";

  let query = supabase
    .from("photos")
    .select(
      "id, title, image_url, thumbnail_url, user_id, like_count, comment_count, view_count, average_rating, category, brand, camera_body, lens, phone_model, exif_data, is_featured, created_at",
      { count: "exact" }
    )
    .eq("is_hidden", false)
    .order(orderColumn, { ascending: false })
    .range(from, to);

  if (selectedCategory !== "全部") {
    query = query.eq("category", selectedCategory);
  }

  if (selectedBrand !== "全部品牌") {
    query = query.eq("brand", selectedBrand);
  }

  if (debouncedSearch) {
    query = query.or(
      `title.ilike.%${debouncedSearch}%,brand.ilike.%${debouncedSearch}%,camera_body.ilike.%${debouncedSearch}%,phone_model.ilike.%${debouncedSearch}%`
    );
  }

  if (featuredOnly) {
    query = query.eq("is_featured", true);
  }

  const { data: photosData, error, count } = await query;
  if (error) throw error;

  const userIds = [...new Set((photosData || []).map((p) => p.user_id))];
  let profilesMap = new Map<string, Photo["profiles"]>();
  if (userIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase.rpc("get_public_profiles");

    if (profilesError) throw profilesError;
    profilesMap = new Map(
      (profilesData || [])
        .filter((profile) => userIds.includes(profile.user_id))
        .map((profile) => [
          profile.user_id,
          {
            user_id: profile.user_id,
            username: profile.username?.trim() || null,
            display_name: profile.display_name?.trim() || null,
            avatar_url: profile.avatar_url || null,
          },
        ]),
    );
  }

  const items = (photosData || []).map((photo) => ({
    ...photo,
    profiles: profilesMap.get(photo.user_id),
  })) as Photo[];

  return {
    items,
    totalCount: count ?? items.length,
  };
}

function GalleryCardImage({
  photo,
  index,
  viewMode,
}: {
  photo: Photo;
  index: number;
  viewMode: "grid" | "masonry";
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = pickImageSrc(photo.image_url, photo.thumbnail_url);
  const isPriority = index < 6;

  return (
    <div className={`overflow-hidden rounded-lg relative bg-muted ${viewMode === "grid" ? "aspect-[4/3]" : ""}`}>
      {!imgLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
      <img
        src={imgSrc}
        sizes={SIZES.card}
        alt={photo.title}
        width={640}
        height={480}
        className={`w-full content-fade ${imgLoaded ? "media-reveal" : ""} transition-all duration-500 ease-out group-hover:scale-[1.02] group-hover:brightness-105 ${
          viewMode === "grid" ? "h-full object-cover" : "h-auto object-contain"
        } ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        data-loaded={imgLoaded ? "true" : "false"}
        loading={isPriority ? "eager" : "lazy"}
        fetchPriority={isPriority ? "high" : undefined}
        decoding={isPriority ? "sync" : "async"}
        onLoad={() => setImgLoaded(true)}
      />
    </div>
  );
}

function getPublicName(profile: { display_name: string | null; username: string | null }, userId: string) {
  return profile.display_name?.trim() || profile.username?.trim() || `會員 ${userId.slice(0, 8)}`;
}

function PhotographerSpotlightCard({ item }: { item: PhotographerSpotlight }) {
  const coverImage = pickImageSrc(item.cover_photo.image_url, item.cover_photo.thumbnail_url);
  const authorName = getPublicName(item, item.user_id);

  return (
    <Link
      to={`/user/${item.user_id}`}
      className="group min-w-[260px] max-w-[260px] overflow-hidden rounded-2xl border border-border bg-card motion-card-surface motion-press"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={coverImage}
          alt={item.cover_photo.title}
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
          <p className="line-clamp-1 text-lg font-semibold motion-list-title">{authorName}</p>
          <p className="line-clamp-1 text-sm text-muted-foreground">{item.cover_photo.title}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Camera className="h-3.5 w-3.5" />
            {item.photo_count} 張作品
          </span>
          <span>{formatDistanceToNow(new Date(item.cover_photo.created_at), { addSuffix: true, locale: zhTW })}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {item.cover_photo.like_count || 0}</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> {item.cover_photo.comment_count || 0}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {item.cover_photo.view_count || 0}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Gallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const galleryTopRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("masonry");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "全部");
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get("brand") || "全部品牌");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState<"newest" | "most_liked" | "highest_rated">("newest");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const parsed = Number(searchParams.get("page") || "1");
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBrand, debouncedSearch, sortBy, featuredOnly]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (searchQuery) next.set("q", searchQuery);
    else next.delete("q");
    if (selectedCategory !== "全部") next.set("category", selectedCategory);
    else next.delete("category");
    if (selectedBrand !== "全部品牌") next.set("brand", selectedBrand);
    else next.delete("brand");
    if (currentPage > 1) next.set("page", String(currentPage));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  }, [currentPage, searchQuery, selectedCategory, selectedBrand, searchParams, setSearchParams]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["gallery-photos", currentPage, selectedCategory, selectedBrand, debouncedSearch, sortBy, featuredOnly],
    queryFn: () =>
      fetchGalleryPage({
        page: currentPage,
        selectedCategory,
        selectedBrand,
        debouncedSearch,
        sortBy,
        featuredOnly,
      }),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
  });

  const { data: spotlightPhotographers, isLoading: spotlightLoading } = useQuery({
    queryKey: ["gallery-photographer-spotlights"],
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data: recentPhotos, error: photosError } = await supabase
        .from("photos")
        .select("id, user_id, title, image_url, thumbnail_url, like_count, comment_count, view_count, created_at")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(120);

      if (photosError) throw photosError;

      const grouped = new Map<string, PhotographerSpotlight["cover_photo"]>();
      const counts = new Map<string, number>();

      for (const photo of recentPhotos || []) {
        counts.set(photo.user_id, (counts.get(photo.user_id) || 0) + 1);
        if (!grouped.has(photo.user_id)) {
          grouped.set(photo.user_id, {
            id: photo.id,
            title: photo.title,
            image_url: photo.image_url,
            thumbnail_url: photo.thumbnail_url,
            like_count: photo.like_count || 0,
            comment_count: photo.comment_count || 0,
            view_count: photo.view_count || 0,
            created_at: photo.created_at,
          });
        }
      }

      const userIds = [...grouped.keys()];
      if (userIds.length === 0) return [] as PhotographerSpotlight[];

      const { data: profilesData, error: profilesError } = await supabase.rpc("get_public_profiles");
      if (profilesError) throw profilesError;

      const profileMap = new Map(
        (((profilesData as Array<{ user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }> | null) || [])
          .filter((profile) => userIds.includes(profile.user_id))
          .map((profile) => [profile.user_id, profile])),
      );

      return shuffle(
        userIds
          .map((userId) => {
            const profile = profileMap.get(userId);
            const coverPhoto = grouped.get(userId);
            if (!coverPhoto) return null;
            return {
              user_id: userId,
              username: profile?.username || null,
              display_name: profile?.display_name || null,
              avatar_url: profile?.avatar_url || null,
              cover_photo: coverPhoto,
              photo_count: counts.get(userId) || 1,
            } satisfies PhotographerSpotlight;
          })
          .filter((item): item is PhotographerSpotlight => !!item),
      ).slice(0, 8);
    },
  });

  const photos = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    for (let p = start; p <= end; p += 1) pages.push(p);
    return pages;
  }, [currentPage, totalPages]);

  const getEquipmentDisplay = (photo: Photo) => {
    if (photo.phone_model) return photo.phone_model;
    if (photo.camera_body) return photo.camera_body;
    if (photo.brand) return photo.brand;
    return "未知設備";
  };

  const getExifDisplay = (photo: Photo) => {
    const exif = photo.exif_data;
    if (!exif) return [];
    const items: { icon: typeof Aperture; label: string }[] = [];
    if (exif.aperture || exif.FNumber) items.push({ icon: Aperture, label: `f/${exif.aperture || exif.FNumber}` });
    if (exif.shutter_speed || exif.ExposureTime) items.push({ icon: Clock, label: `${exif.shutter_speed || exif.ExposureTime}s` });
    if (exif.iso || exif.ISO) items.push({ icon: Sun, label: `ISO ${exif.iso || exif.ISO}` });
    return items;
  };

  const getAuthorDisplay = (photo: Photo) => {
    const displayName = photo.profiles?.display_name?.trim();
    const username = photo.profiles?.username?.trim();
    return displayName || username || `會員 ${photo.user_id.slice(0, 8)}`;
  };

  const getAuthorInitial = (photo: Photo) => {
    const name = getAuthorDisplay(photo);
    return name.slice(0, 1).toUpperCase();
  };

  const scrollToGalleryTop = () => {
    window.requestAnimationFrame(() => {
      galleryTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const goToPage = (page: number) => {
    const nextPage = Math.min(totalPages, Math.max(1, page));
    if (nextPage === currentPage) return;
    setCurrentPage(nextPage);
    scrollToGalleryTop();
  };

  const handleUpload = () => {
    if (!user) { navigate("/auth"); return; }
    navigate("/upload");
  };

  const gridClass = viewMode === "masonry"
    ? "columns-2 sm:columns-3 md:columns-4 xl:columns-4 gap-3 [column-fill:_balance]"
    : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3";

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-hero py-16">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-4">
              作品<span className="text-gradient">分享區</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              瀏覽社群成員分享的精彩攝影作品，為您喜愛的作品點讚評分
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <GalleryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        selectedBrand={selectedBrand}
        onBrandChange={setSelectedBrand}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onUpload={handleUpload}
        featuredOnly={featuredOnly}
        onFeaturedOnlyChange={setFeaturedOnly}
      />

      {/* Gallery Grid */}
      <section className="py-8">
        <div className="container">
          <div ref={galleryTopRef} className="scroll-mt-28" />
          {isLoading ? (
            <div className={gridClass}>
              {Array.from({ length: 12 }).map((_, i) => (
                <PhotoCardSkeleton key={i} index={i} viewMode={viewMode} />
              ))}
            </div>
          ) : photos.length > 0 ? (
            <>
              <div className={gridClass}>
                {photos.map((photo, index) => (
                  <Link
                    key={photo.id}
                    to={`/gallery/${photo.id}`}
                    state={{ photoPreview: photo }}
                    onMouseEnter={() => {
                      void prefetchPhotoDetailBundle(photo.id, photo);
                    }}
                    onFocus={() => {
                      void prefetchPhotoDetailBundle(photo.id, photo);
                    }}
                    onTouchStart={() => {
                      void prefetchPhotoDetailBundle(photo.id, photo);
                    }}
                    className={`group relative block overflow-hidden rounded-lg border border-border/50 motion-card-surface motion-press ${
                      viewMode === "masonry" ? "mb-3 break-inside-avoid" : ""
                    }`}
                  >
                    <GalleryCardImage photo={photo} index={index} viewMode={viewMode} />

                    <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <h3 className="font-serif text-sm md:text-base font-bold text-cream mb-1 line-clamp-1 drop-shadow-md">
                        {photo.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-1.5">
                        {photo.profiles?.avatar_url ? (
                          <img
                            src={photo.profiles.avatar_url}
                            alt={getAuthorDisplay(photo)}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-cream/30"
                          />
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cream/15 text-[10px] font-medium text-cream ring-1 ring-cream/20">
                            {getAuthorInitial(photo)}
                          </span>
                        )}
                        <span className="text-xs text-cream/80 truncate drop-shadow-sm">
                          {getAuthorDisplay(photo)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-cream/70">
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {photo.like_count || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> {photo.comment_count || 0}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {photo.view_count || 0}</span>
                      </div>
                      {(photo.lens || getExifDisplay(photo).length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          {photo.lens && (
                            <span className="px-1.5 py-0.5 rounded bg-cream/10 text-[10px] text-cream/80 backdrop-blur-sm">
                              {photo.lens}
                            </span>
                          )}
                          {getExifDisplay(photo).map((item, i) => {
                            const Icon = item.icon;
                            return (
                              <span key={i} className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cream/10 text-[10px] text-cream/80 backdrop-blur-sm">
                                <Icon className="h-2.5 w-2.5" /> {item.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="px-2 py-0.5 rounded-full bg-charcoal/70 backdrop-blur-sm text-[10px] md:text-xs text-cream/90 border border-cream/20">
                        {getEquipmentDisplay(photo)}
                      </span>
                    </div>

                    {photo.is_featured && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/90 text-[10px] md:text-xs font-medium text-zinc-900 shadow-md backdrop-blur-sm">
                          <Award className="h-2.5 w-2.5" /> 精選
                        </span>
                      </div>
                    )}

                    {(photo.average_rating || 0) > 0 && (
                      <div className={`absolute ${photo.is_featured ? 'top-8' : 'top-2'} right-2`}>
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/90 text-[10px] md:text-xs font-medium text-primary-foreground shadow-md">
                          <Star className="h-2.5 w-2.5 fill-current" /> {Number(photo.average_rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
              <div className="mt-10 flex flex-col items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  第 {currentPage} / {totalPages} 頁，共 {totalCount} 張作品
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || isFetching}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一頁
                  </Button>
                  {visiblePages.map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "gold" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      disabled={isFetching && page === currentPage}
                      className="min-w-10"
                    >
                      {page}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || isFetching}
                    className="gap-1"
                  >
                    下一頁
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-14 space-y-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <Sparkles className="h-5 w-5" />
                      <span className="text-sm font-medium">隨機推薦攝影師</span>
                    </div>
                    <h2 className="font-serif text-2xl font-bold">看看其他攝影師最近的代表作品</h2>
                    <p className="text-sm text-muted-foreground">點進卡片即可前往該攝影師頁面，瀏覽他上傳的全部作品。</p>
                  </div>
                </div>
                {spotlightLoading ? (
                  <div className="flex gap-4 overflow-hidden">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="min-w-[260px] max-w-[260px] overflow-hidden rounded-2xl border border-border bg-card">
                        <div className="aspect-[4/3] animate-pulse bg-muted" />
                        <div className="space-y-2 p-4">
                          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : spotlightPhotographers?.length ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {spotlightPhotographers.map((item) => (
                      <PhotographerSpotlightCard key={item.user_id} item={item} />
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== "全部" || selectedBrand !== "全部品牌"
                  ? "沒有找到符合條件的作品"
                  : "還沒有作品，來上傳第一張吧！"}
              </p>
              <Button onClick={handleUpload} className="gap-2">
                <ImagePlus className="h-4 w-4" />
                上傳作品
              </Button>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
