import { supabase } from "@/integrations/supabase/client";

type PrefetchListing = {
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
  updated_at: string;
};

type SellerProfile = {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_vip: boolean;
  created_at: string;
};

type ListingDetailBundle = {
  listing: PrefetchListing | null;
  seller: SellerProfile | null;
};

const detailCache = new Map<string, ListingDetailBundle>();
const detailPromiseCache = new Map<string, Promise<ListingDetailBundle>>();
const imagePrefetchCache = new Set<string>();
const routeChunkPromise = import("@/pages/ListingDetail");

function preloadImage(url?: string | null) {
  if (!url || imagePrefetchCache.has(url)) return;
  imagePrefetchCache.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
}

function preloadListingImages(listing?: Partial<PrefetchListing> | null) {
  if (!listing) return;
  preloadImage(listing.verification_image_url);
  (listing.additional_images || []).forEach((url) => preloadImage(url));
}

export function readPrefetchedListingDetail(listingId: string) {
  return detailCache.get(listingId) || null;
}

export function prefetchListingDetailBundle(
  listingId: string,
  preview?: Partial<PrefetchListing> | null,
) {
  void routeChunkPromise;
  preloadListingImages(preview);

  const cached = detailCache.get(listingId);
  if (cached) return Promise.resolve(cached);

  const inflight = detailPromiseCache.get(listingId);
  if (inflight) return inflight;

  const promise = (async (): Promise<ListingDetailBundle> => {
    const { data: listingData, error } = await supabase
      .from("marketplace_listings")
      .select(
        "id, user_id, title, description, category, brand, model, condition, price, currency, location, verification_image_url, additional_images, is_sold, is_verified, view_count, created_at, updated_at",
      )
      .eq("id", listingId)
      .single();

    if (error) throw error;

    preloadListingImages(listingData as PrefetchListing);

    const { data: sellerData, error: sellerError } = await supabase.rpc(
      "get_public_profile",
      { target_user_id: listingData.user_id },
    );

    if (sellerError) throw sellerError;

    const bundle: ListingDetailBundle = {
      listing: listingData as PrefetchListing,
      seller: (sellerData?.[0] as SellerProfile | null) || null,
    };

    detailCache.set(listingId, bundle);
    detailPromiseCache.delete(listingId);
    return bundle;
  })();

  detailPromiseCache.set(listingId, promise);
  return promise;
}
