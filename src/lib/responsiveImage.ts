/**
 * Generate srcSet and sizes for responsive images.
 * Supports Unsplash URLs (w= param) and Supabase Storage URLs.
 */

/** Build Unsplash srcSet with multiple widths */
export function unsplashSrcSet(url: string, widths = [400, 640, 960, 1280]): string {
  if (!url.includes('unsplash.com')) return '';
  try {
    return widths
      .map((w) => {
        const u = new URL(url);
        u.searchParams.set('w', String(w));
        u.searchParams.set('auto', 'format');
        if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
        return `${u.toString()} ${w}w`;
      })
      .join(', ');
  } catch {
    return '';
  }
}

/** Common sizes attribute presets — mobile-first, conservative */
export const SIZES = {
  /** Hero banner: full width on all devices */
  hero: '(min-width: 1280px) 1280px, 100vw',
  /** Card in grid: ~25% on desktop, ~50% on tablet, 100% on mobile */
  card: '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw',
  /** Large card in carousel: ~45% on desktop, 85% on mobile */
  carouselLarge: '(min-width: 1024px) 45vw, 85vw',
  /** Standard carousel card: ~33% on desktop, 100% on mobile */
  carouselCard: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  /** Marketplace card: ~25% desktop, ~50% tablet, 100% mobile */
  marketplace: '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
} as const;

/** Props to spread on an <img> for responsive Unsplash images */
export function responsiveUnsplashProps(
  url: string,
  sizesPreset: keyof typeof SIZES = 'card'
): { srcSet?: string; sizes?: string } {
  const srcSet = unsplashSrcSet(url);
  if (!srcSet) return {};
  return { srcSet, sizes: SIZES[sizesPreset] };
}

/** 
 * Optimize image URL for delivery.
 * - Unsplash: add auto=format, q=75
 * - Supabase Storage: prefer thumbnail_url when available
 */
export function optimizeImageUrl(url: string, preferSmall = false): string {
  if (!url) return url;
  
  // For Unsplash images
  if (url.includes('unsplash.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('auto', 'format');
      if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
      // On mobile-preferred contexts, cap width to 640
      if (preferSmall) {
        u.searchParams.set('w', '640');
      }
      return u.toString();
    } catch {
      return url;
    }
  }
  
  return url;
}

/**
 * Choose the best image source for the current context.
 * Prefers thumbnail on mobile, full image on desktop.
 */
export function pickImageSrc(
  imageUrl: string,
  thumbnailUrl: string | null | undefined
): string {
  // Always prefer thumbnail if available (it's already optimized at 400px)
  if (thumbnailUrl) return thumbnailUrl;
  return optimizeImageUrl(imageUrl);
}
