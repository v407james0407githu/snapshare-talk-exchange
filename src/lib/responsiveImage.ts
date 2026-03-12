/**
 * Generate srcSet and sizes for responsive images.
 * Supports Unsplash URLs (w= param) and generic URLs.
 */

/** Build Unsplash srcSet with multiple widths */
export function unsplashSrcSet(url: string, widths = [640, 960, 1280, 1920]): string {
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

/** Common sizes attribute presets */
export const SIZES = {
  /** Hero banner: full width */
  hero: '100vw',
  /** Card in grid: ~25% on desktop, ~50% on tablet, 100% on mobile */
  card: '(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw',
  /** Large card in carousel: ~45% on desktop, 100% on mobile */
  carouselLarge: '(min-width: 1024px) 45vw, (min-width: 640px) 80vw, 100vw',
  /** Standard carousel card: ~33% on desktop */
  carouselCard: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
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

/** Ensure Unsplash URLs have auto=format and q=75 for optimal delivery */
export function optimizeImageUrl(url: string): string {
  if (!url.includes('unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('auto', 'format');
    if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
    return u.toString();
  } catch {
    return url;
  }
}
