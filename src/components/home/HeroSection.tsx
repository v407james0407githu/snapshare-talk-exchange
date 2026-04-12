import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Users, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useQuery } from "@tanstack/react-query";
import { unsplashSrcSet } from '@/lib/responsiveImage';
import { readBootstrapCache, writeBootstrapCache } from "@/lib/bootstrapCache";
import { getPublicSupabase } from "@/lib/publicSupabase";

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  cta_primary_text: string | null;
  cta_primary_link: string | null;
  cta_secondary_text: string | null;
  cta_secondary_link: string | null;
  text_align: string;
  gradient_type: string;
  gradient_opacity: number;
}

/** Single safe fallback with no feature-specific content */
const safeFallback: Banner = {
  id: "default",
  title: null,
  subtitle: null,
  image_url: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=640&auto=format&q=75",
  link_url: null,
  cta_primary_text: null,
  cta_primary_link: null,
  cta_secondary_text: null,
  cta_secondary_link: null,
  text_align: "left",
  gradient_type: "none",
  gradient_opacity: 0,
};

/** Optimize Unsplash URLs: ensure auto=format and reasonable width */
function optimizeUnsplashUrl(url: string): string {
  if (!url.includes('unsplash.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('auto', 'format');
    if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
    // Default to 640 for mobile-first; srcSet handles larger screens
    const w = parseInt(u.searchParams.get('w') || '0');
    if (w > 1280 || w === 0) u.searchParams.set('w', '640');
    return u.toString();
  } catch { return url; }
}

function getGradientStyle(type: string, opacity: number): React.CSSProperties | undefined {
  if (type === "none") return undefined;
  const dirMap: Record<string, string> = {
    "left-to-right": "to right",
    "right-to-left": "to left",
    "top-to-bottom": "to bottom",
    "bottom-to-top": "to top",
  };
  const dir = dirMap[type] || "to right";
  return {
    background: `linear-gradient(${dir}, rgba(0,0,0,${opacity}), rgba(0,0,0,${opacity * 0.3}), transparent)`,
  };
}

function getAlignClasses(align: string) {
  switch (align) {
    case "center": return { container: "items-center text-center mx-auto", flex: "justify-center" };
    case "right": return { container: "ml-auto text-right", flex: "justify-end" };
    default: return { container: "", flex: "justify-start" };
  }
}

function BannerLink({ url, children, className }: { url: string; children?: React.ReactNode; className?: string }) {
  const isExternal = url.startsWith("http");
  if (isExternal) {
    return <a href={url} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  }
  return <Link to={url} className={className}>{children}</Link>;
}

export function HeroSection({ sectionTitle: _sectionTitle, sectionSubtitle: _sectionSubtitle }: { sectionTitle?: string; sectionSubtitle?: string } = {}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const initialBanners = readBootstrapCache<Banner[]>("hero-banners") ?? [];

  const { data: banners, isLoading } = useQuery({
    queryKey: ["hero-banners"],
    queryFn: async () => {
      const supabase = await getPublicSupabase();
      const { data, error } = await supabase
        .from("hero_banners")
        .select("id, title, subtitle, image_url, link_url, cta_primary_text, cta_primary_link, cta_secondary_text, cta_secondary_link, text_align, gradient_type, gradient_opacity")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const result = data.map(b => ({
        ...b,
        image_url: optimizeUnsplashUrl(b.image_url),
      })) as Banner[];
      writeBootstrapCache("hero-banners", result);
      return result;
    },
    initialData: initialBanners,
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  // Show skeleton while loading to prevent flash of stale content
  if (isLoading && !initialBanners.length) {
    return (
      <>
        <section className="relative aspect-[16/9] md:aspect-auto md:h-[50vh] md:max-h-[60vh] overflow-hidden bg-muted animate-pulse" />
        <div className="hero-scroll-target" />
      </>
    );
  }

  const slides = banners && banners.length > 0 ? banners : [safeFallback];

  const hasTextContent = (banner: Banner) =>
    banner.title || banner.subtitle || (banner.cta_primary_text && banner.cta_primary_link);

  return (
    <>
    {/* Fixed aspect-ratio container: 16:9 on mobile, 50vh on desktop — NEVER changes height */}
    <section className="relative aspect-[16/9] md:aspect-auto md:h-[50vh] md:max-h-[60vh] overflow-hidden group">
      <div ref={emblaRef} className="overflow-hidden h-full">
        <div className="flex h-full">
          {slides.map((banner, idx) => {
            const align = getAlignClasses(banner.text_align ?? "left");
            const gradientStyle = getGradientStyle(banner.gradient_type ?? "left-to-right", banner.gradient_opacity ?? 0.6);
            const showContent = hasTextContent(banner);
            const isFirst = idx === 0;

            return (
              <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative h-full">
                <img
                  src={banner.image_url}
                  srcSet={unsplashSrcSet(banner.image_url, [400, 640, 960, 1280]) || undefined}
                  sizes="(min-width: 1280px) 1280px, 100vw"
                  alt={banner.title || "Banner"}
                  width={1280}
                  height={720}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                  loading={isFirst ? "eager" : "lazy"}
                  fetchPriority={isFirst ? "high" : undefined}
                  decoding={isFirst ? "sync" : "async"}
                />
                {banner.link_url && (
                  <BannerLink url={banner.link_url} className="absolute inset-0 z-[1]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent md:hidden" />
                {gradientStyle && (
                  <div className="absolute inset-0 hidden md:block" style={gradientStyle} />
                )}

                {showContent && (
                  <div className="absolute inset-0 z-[2] flex items-end md:items-center pointer-events-none">
                    <div className="container px-4 md:px-8 pb-4 md:pb-0">
                      <div className={`max-w-lg md:max-w-xl ${align.container}`}>
                        <div className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 pointer-events-auto">
                          {banner.title && (
                            <h1 className="font-serif text-[1.25rem] md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-1 md:mb-3">
                              {banner.title}
                            </h1>
                          )}
                          {banner.subtitle && (
                            <p className="text-xs md:text-lg text-white/80 mb-3 md:mb-6 line-clamp-2">
                              {banner.subtitle}
                            </p>
                          )}
                          <div className={`flex flex-col sm:flex-row gap-2 md:gap-3 ${align.flex}`}>
                            {banner.cta_primary_text && banner.cta_primary_link && (
                              <Link to={banner.cta_primary_link}>
                                <Button variant="hero" size="default" className="group/btn w-full sm:w-auto text-sm md:text-base md:h-11">
                                  <Camera className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                                  {banner.cta_primary_text}
                                </Button>
                              </Link>
                            )}
                            {banner.cta_secondary_text && banner.cta_secondary_link && (
                              <Link to={banner.cta_secondary_link}>
                                <Button variant="glass" size="default" className="text-white w-full sm:w-auto text-sm md:text-base md:h-11">
                                  <Users className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                                  {banner.cta_secondary_text}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop-only navigation arrows */}
      <button
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white rounded-full p-2 hidden md:block"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white rounded-full p-2 hidden md:block"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => emblaApi?.scrollTo(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                idx === selectedIndex
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/70"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <button
          onClick={() => {
            const section = document.querySelector('.hero-scroll-target');
            section?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="md:hidden"
          aria-label="向下滑動"
        >
          <ChevronDown className="h-5 w-5 text-white/60" />
        </button>
      </div>
    </section>
    <div className="hero-scroll-target" />
    </>
  );
}
