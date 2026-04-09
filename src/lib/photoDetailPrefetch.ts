import { supabase } from "@/integrations/supabase/client";

type PrefetchPhoto = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  category: string;
  brand: string | null;
  camera_body: string | null;
  lens: string | null;
  phone_model: string | null;
  view_count: number;
  like_count: number;
  photo_series_id: string | null;
  comment_count: number;
  average_rating: number;
  rating_count: number;
  series_order: number | null;
  is_featured: boolean;
  is_hidden: boolean;
  exif_data: Record<string, unknown> | null;
  created_at: string;
};

type PrefetchProfile = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

type RelatedWork = {
  id: string;
  title: string;
  image_url: string;
  thumbnail_url?: string | null;
  average_rating: number;
  view_count: number;
};

type DetailBundle = {
  photo: PrefetchPhoto | null;
  photographer: PrefetchProfile | null;
  prevPhotoId: string | null;
  nextPhotoId: string | null;
};

const detailCache = new Map<string, DetailBundle>();
const detailPromiseCache = new Map<string, Promise<DetailBundle>>();
const authorWorksCache = new Map<string, RelatedWork[]>();
const recommendedWorksCache = new Map<string, RelatedWork[]>();
const imagePrefetchCache = new Set<string>();
const routeChunkPromise = import("@/pages/PhotoDetail");
const PHOTO_DETAIL_SELECT_FALLBACK =
  "id, user_id, title, description, image_url, thumbnail_url, category, brand, camera_body, lens, phone_model, view_count, like_count, comment_count, average_rating, rating_count, is_featured, is_hidden, exif_data, created_at";

function preloadImage(url?: string | null) {
  if (!url || imagePrefetchCache.has(url)) return;
  imagePrefetchCache.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

async function fetchAdjacentPhotoIds(photoId: string, createdAt: string) {
  const [{ data: prev }, { data: next }] = await Promise.all([
    supabase
      .from("photos")
      .select("id, image_url, thumbnail_url")
      .eq("is_hidden", false)
      .gt("created_at", createdAt)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("photos")
      .select("id, image_url, thumbnail_url")
      .eq("is_hidden", false)
      .lt("created_at", createdAt)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const prevItem = prev?.[0];
  const nextItem = next?.[0];

  preloadImage(prevItem?.thumbnail_url || prevItem?.image_url || null);
  preloadImage(prevItem?.image_url || null);
  preloadImage(nextItem?.thumbnail_url || nextItem?.image_url || null);
  preloadImage(nextItem?.image_url || null);

  return {
    prevPhotoId: prevItem?.id || null,
    nextPhotoId: nextItem?.id || null,
  };
}

async function fetchAuthorWorks(photo: PrefetchPhoto) {
  const cacheKey = `${photo.user_id}:${photo.id}`;
  if (authorWorksCache.has(cacheKey)) return authorWorksCache.get(cacheKey) || [];

  const { data } = await supabase
    .from("photos")
    .select("id, title, image_url, thumbnail_url, average_rating, view_count")
    .eq("user_id", photo.user_id)
    .neq("id", photo.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(8);

  const works = (data || []) as RelatedWork[];
  authorWorksCache.set(cacheKey, works);
  works.forEach((work) => {
    preloadImage(work.thumbnail_url || work.image_url);
    preloadImage(work.image_url);
  });
  return works;
}

async function fetchRecommendedWorks(photo: PrefetchPhoto) {
  const cacheKey = photo.id;
  if (recommendedWorksCache.has(cacheKey)) return recommendedWorksCache.get(cacheKey) || [];

  const { data: smartData } = await supabase
    .from("photos")
    .select("id, title, image_url, thumbnail_url, average_rating, view_count, brand, category")
    .neq("id", photo.id)
    .eq("is_hidden", false)
    .or(`brand.eq.${photo.brand},category.eq.${photo.category}`)
    .order("average_rating", { ascending: false })
    .limit(12);

  let works: RelatedWork[] = [];

  if (smartData && smartData.length > 0) {
    const sorted = [...smartData].sort((a, b) => {
      const scoreA = (a.brand === photo.brand ? 2 : 0) + (a.category === photo.category ? 1 : 0);
      const scoreB = (b.brand === photo.brand ? 2 : 0) + (b.category === photo.category ? 1 : 0);
      return scoreB - scoreA;
    });
    works = sorted.slice(0, 12) as RelatedWork[];
  } else {
    const { data: fallbackData } = await supabase
      .from("photos")
      .select("id, title, image_url, thumbnail_url, average_rating, view_count")
      .neq("id", photo.id)
      .eq("is_hidden", false)
      .order("average_rating", { ascending: false })
      .limit(12);

    works = (fallbackData || []) as RelatedWork[];
  }

  recommendedWorksCache.set(cacheKey, works);
  works.forEach((work) => {
    preloadImage(work.thumbnail_url || work.image_url);
    preloadImage(work.image_url);
  });
  return works;
}

export function readPrefetchedPhotoDetail(photoId: string) {
  return detailCache.get(photoId) || null;
}

export function readPrefetchedAuthorWorks(userId: string, photoId: string) {
  return authorWorksCache.get(`${userId}:${photoId}`) || null;
}

export function readPrefetchedRecommendedWorks(photoId: string) {
  return recommendedWorksCache.get(photoId) || null;
}

export function prefetchPhotoDetailBundle(photoId: string, preview?: Partial<PrefetchPhoto> | null) {
  void routeChunkPromise;

  if (preview?.thumbnail_url) preloadImage(preview.thumbnail_url);
  if (preview?.image_url) preloadImage(preview.image_url);

  const cached = detailCache.get(photoId);
  if (cached) {
    if (cached.photo) {
      void fetchAuthorWorks(cached.photo);
      void fetchRecommendedWorks(cached.photo);
    }
    return Promise.resolve(cached);
  }

  const inflight = detailPromiseCache.get(photoId);
  if (inflight) return inflight;

  const promise = (async (): Promise<DetailBundle> => {
    const fallbackRes = await supabase
      .from("photos")
      .select(PHOTO_DETAIL_SELECT_FALLBACK)
      .eq("id", photoId)
      .eq("is_hidden", false)
      .single();

    if (fallbackRes.error) throw fallbackRes.error;

    const photoData: PrefetchPhoto = {
      ...(fallbackRes.data as Omit<PrefetchPhoto, "photo_series_id" | "series_order">),
      photo_series_id: null,
      series_order: null,
    };

    preloadImage(photoData.thumbnail_url);
    preloadImage(photoData.image_url);

    const [profileRes, adjacent] = await Promise.all([
      supabase.rpc("get_public_profile", { target_user_id: photoData.user_id }),
      fetchAdjacentPhotoIds(photoId, photoData.created_at),
    ]);

    const photographer = profileRes.data?.[0]
      ? (profileRes.data[0] as unknown as PrefetchProfile)
      : null;

    const bundle: DetailBundle = {
      photo: photoData as PrefetchPhoto,
      photographer,
      prevPhotoId: adjacent.prevPhotoId,
      nextPhotoId: adjacent.nextPhotoId,
    };

    detailCache.set(photoId, bundle);
    detailPromiseCache.delete(photoId);

    void fetchAuthorWorks(photoData as PrefetchPhoto);
    void fetchRecommendedWorks(photoData as PrefetchPhoto);

    return bundle;
  })();

  detailPromiseCache.set(photoId, promise);
  return promise;
}
