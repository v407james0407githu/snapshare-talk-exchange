import { lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useLazySection } from "@/hooks/useLazySection";

// Lazy load below-fold sections to reduce initial JS bundle
const FeaturedCarousel = lazy(() => import("@/components/home/FeaturedCarousel").then(m => ({ default: m.FeaturedCarousel })));
const EquipmentCategories = lazy(() => import("@/components/home/EquipmentCategories").then(m => ({ default: m.EquipmentCategories })));
const FeaturedGallery = lazy(() => import("@/components/home/FeaturedGallery").then(m => ({ default: m.FeaturedGallery })));
const ForumPreview = lazy(() => import("@/components/home/ForumPreview").then(m => ({ default: m.ForumPreview })));
const MarketplacePreview = lazy(() => import("@/components/home/MarketplacePreview").then(m => ({ default: m.MarketplacePreview })));
const CTASection = lazy(() => import("@/components/home/CTASection").then(m => ({ default: m.CTASection })));

interface SectionData {
  section_key: string;
  section_label: string;
  section_subtitle: string;
  is_visible: boolean;
  sort_order: number;
}

const defaultOrder = [
  "hero",
  "equipment_categories",
  "featured_carousel",
  "featured_gallery",
  "forum_preview",
  "marketplace_preview",
  "cta",
];

const sectionFeatureMap: Record<string, string> = {
  featured_gallery: "gallery_enabled",
  featured_carousel: "gallery_enabled",
  forum_preview: "forum_enabled",
  equipment_categories: "forum_enabled",
  marketplace_preview: "marketplace_enabled",
};

/** Loading placeholder matching approximate section heights to prevent CLS */
function SectionFallback({ sectionKey }: { sectionKey: string }) {
  const heights: Record<string, string> = {
    equipment_categories: "min-h-[500px]",
    featured_gallery: "min-h-[480px]",
    forum_preview: "min-h-[500px]",
    marketplace_preview: "min-h-[480px]",
    cta: "min-h-[320px]",
  };
  return <div className={`${heights[sectionKey] || "min-h-[400px]"}`} />;
}

/** Wrapper that renders a lazy section only when it's near the viewport */
function LazyWrapper({ 
  children, 
  sectionKey 
}: { 
  children: React.ReactNode; 
  sectionKey: string;
}) {
  // Hero and first carousel don't need lazy wrapper
  if (sectionKey === 'hero' || sectionKey === 'featured_carousel') {
    return <>{children}</>;
  }
  
  return (
    <Suspense fallback={<SectionFallback sectionKey={sectionKey} />}>
      {children}
    </Suspense>
  );
}

const Index = () => {
  const { galleryEnabled, forumEnabled, marketplaceEnabled } = useSystemSettings();

  const featureFlags: Record<string, boolean> = {
    gallery_enabled: galleryEnabled,
    forum_enabled: forumEnabled,
    marketplace_enabled: marketplaceEnabled,
  };

  const { data: sections } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("section_key, section_label, section_subtitle, is_visible, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as SectionData[];
    },
    staleTime: 60 * 1000,
  });

  const visibleSections = sections
    ? sections.filter((s) => s.is_visible)
    : defaultOrder.map((key) => ({ section_key: key, section_label: "", section_subtitle: "", is_visible: true, sort_order: 0 }));

  const filteredSections = visibleSections.filter((s) => {
    const featureKey = sectionFeatureMap[s.section_key];
    return !featureKey || featureFlags[featureKey] !== false;
  });

  // Map section keys to components (eagerly loaded for critical, lazy for rest)
  const sectionComponents: Record<string, React.FC<{ sectionTitle?: string; sectionSubtitle?: string }>> = {
    hero: HeroSection,
    featured_carousel: FeaturedCarousel,
    equipment_categories: EquipmentCategories,
    featured_gallery: FeaturedGallery,
    forum_preview: ForumPreview,
    marketplace_preview: MarketplacePreview,
    cta: CTASection,
  };

  return (
    <MainLayout>
      {filteredSections.map((s) => {
        const Component = sectionComponents[s.section_key];
        if (!Component) return null;
        return (
          <LazyWrapper key={s.section_key} sectionKey={s.section_key}>
            <Component 
              sectionTitle={s.section_label || undefined} 
              sectionSubtitle={s.section_subtitle || undefined} 
            />
          </LazyWrapper>
        );
      })}
    </MainLayout>
  );
};

export default Index;
