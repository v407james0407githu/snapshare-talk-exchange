CREATE OR REPLACE FUNCTION public.get_public_marketplace_preview()
RETURNS TABLE (
  id uuid,
  title text,
  price numeric,
  currency text,
  verification_image_url text,
  condition text,
  location text,
  is_verified boolean,
  created_at timestamptz,
  user_id uuid,
  view_count integer,
  inquiry_count bigint,
  seller_username text,
  seller_display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    listing.id,
    listing.title,
    listing.price,
    listing.currency,
    listing.verification_image_url,
    listing.condition,
    listing.location,
    listing.is_verified,
    listing.created_at,
    listing.user_id,
    COALESCE(listing.view_count, 0) AS view_count,
    COALESCE(conv.inquiry_count, 0) AS inquiry_count,
    profile.username AS seller_username,
    profile.display_name AS seller_display_name
  FROM public.marketplace_listings AS listing
  LEFT JOIN public.profiles AS profile
    ON profile.user_id = listing.user_id
  LEFT JOIN (
    SELECT
      listing_id,
      COUNT(*)::bigint AS inquiry_count
    FROM public.conversations
    WHERE listing_id IS NOT NULL
    GROUP BY listing_id
  ) AS conv
    ON conv.listing_id = listing.id
  WHERE listing.is_hidden = false
    AND listing.is_sold = false
  ORDER BY listing.created_at DESC
  LIMIT 6
$$;
