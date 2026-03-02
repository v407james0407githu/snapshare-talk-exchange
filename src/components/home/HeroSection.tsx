import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  cta_primary_text: string | null;
  cta_primary_link: string | null;
  cta_secondary_text: string | null;
  cta_secondary_link: string | null;
  text_align: string;
  gradient_type: string;
  gradient_opacity: number;
}

const fallbackBanners: Banner[] = [
  {
    id: "1",
    title: "用光影說故事，與同好共鳴",
    subtitle: "全台最活躍的攝影創作者社群，分享作品、交流心得。",
    image_url: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1920&q=80",
    cta_primary_text: "開始創作之旅",
    cta_primary_link: "/auth",
    cta_secondary_text: "瀏覽精選作品",
    cta_secondary_link: "/gallery",
    text_align: "left",
    gradient_type: "left-to-right",
    gradient_opacity: 0.6,
  },
  {
    id: "2",
    title: "捕捉每一刻的美好",
    subtitle: "用鏡頭記錄生活中的感動瞬間，與攝影愛好者一起成長。",
    image_url: "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=1920&q=80",
    cta_primary_text: "上傳作品",
    cta_primary_link: "/upload",
    cta_secondary_text: "探索社群",
    cta_secondary_link: "/forums",
    text_align: "left",
    gradient_type: "left-to-right",
    gradient_opacity: 0.6,
  },
  {
    id: "3",
    title: "攝影交流，找到你的最佳夥伴",
    subtitle: "二手買賣、攝影評測分享，讓每一分投資都值得。",
    image_url: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1920&q=80",
    cta_primary_text: "逛逛市集",
    cta_primary_link: "/marketplace",
    cta_secondary_text: "攝影討論",
    cta_secondary_link: "/forums",
    text_align: "left",
    gradient_type: "left-to-right",
    gradient_opacity: 0.6,
  },
];

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

export function HeroSection() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ["hero-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hero_banners" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error || !data || data.length === 0) return fallbackBanners;
      return data as unknown as Banner[];
    },
  });

  const slides = banners ?? fallbackBanners;

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

  const hasTextContent = (banner: Banner) =>
    banner.title || banner.subtitle || (banner.cta_primary_text && banner.cta_primary_link);

  return (
    <section className="relative min-h-[40vh] md:min-h-[50vh] max-h-[60vh] overflow-hidden group">
      <div ref={emblaRef} className="overflow-hidden h-[50vh] md:h-[55vh] max-h-[60vh]">
        <div className="flex h-full">
          {slides.map((banner) => {
            const align = getAlignClasses(banner.text_align ?? "left");
            const gradientStyle = getGradientStyle(banner.gradient_type ?? "left-to-right", banner.gradient_opacity ?? 0.6);
            const showContent = hasTextContent(banner);

            return (
              <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative h-full">
                <img
                  src={banner.image_url}
                  alt={banner.title || "Banner"}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                {gradientStyle && (
                  <div className="absolute inset-0" style={gradientStyle} />
                )}

                {showContent && (
                  <div className="relative z-10 h-full flex items-center">
                    <div className="container">
                      <div className={`max-w-xl ${align.container}`}>
                        <div className="backdrop-blur-xl bg-black/30 border border-white/10 rounded-2xl p-6 md:p-8">
                          {banner.title && (
                            <h1 className="font-serif text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3">
                              {banner.title}
                            </h1>
                          )}
                          {banner.subtitle && (
                            <p className="text-sm md:text-lg text-white/80 mb-6">
                              {banner.subtitle}
                            </p>
                          )}
                          <div className={`flex flex-col sm:flex-row gap-3 ${align.flex}`}>
                            {banner.cta_primary_text && banner.cta_primary_link && (
                              <Link to={banner.cta_primary_link}>
                                <Button variant="hero" size="lg" className="group/btn w-full sm:w-auto">
                                  <Camera className="h-4 w-4 mr-2 transition-transform group-hover/btn:scale-110" />
                                  {banner.cta_primary_text}
                                </Button>
                              </Link>
                            )}
                            {banner.cta_secondary_text && banner.cta_secondary_link && (
                              <Link to={banner.cta_secondary_link}>
                                <Button variant="glass" size="lg" className="text-white w-full sm:w-auto">
                                  <Users className="h-4 w-4 mr-2" />
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

      <button
        onClick={() => emblaApi?.scrollPrev()}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={() => emblaApi?.scrollNext()}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
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
    </section>
  );
}
