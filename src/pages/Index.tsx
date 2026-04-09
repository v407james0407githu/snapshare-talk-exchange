import { lazy, Suspense } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { useQuery } from "@tanstack/react-query";
import { usePublicSystemSettings } from "@/hooks/usePublicSystemSettings";
import { useLazySection } from "@/hooks/useLazySection";
import { readBootstrapCache, writeBootstrapCache } from "@/lib/bootstrapCache";
import { getPublicSupabase } from "@/lib/publicSupabase";
import { useDeferredPublicQuery } from "@/hooks/useDeferredPublicQuery";

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
  forum_preview: "forum_enabled",
  equipment_categories: "forum_enabled",
  marketplace_preview: "marketplace_enabled",
};

/** Loading placeholder matching approximate section heights to prevent CLS */
function SectionFallback({ sectionKey }: { sectionKey: string }) {
  const heights: Record<string, string> = {
    featured_carousel: "min-h-[820px]",
    equipment_categories: "min-h-[500px]",
    featured_gallery: "min-h-[480px]",
    forum_preview: "min-h-[500px]",
    marketplace_preview: "min-h-[480px]",
    cta: "min-h-[320px]",
  };
  return <div className={`${heights[sectionKey] || "min-h-[400px]"}`} />;
}

/** Wrapper that mounts a section only when it's near the viewport */
function LazyWrapper({
  children,
  sectionKey
}: {
  children: React.ReactNode;
  sectionKey: string;
}) {
  const isCritical = sectionKey === "hero";
  const [sectionRef, isVisible] = useLazySection(
    sectionKey === "featured_carousel" ? "180px 0px" : "420px 0px"
  );

  if (isCritical) return <>{children}</>;

  return (
    <div ref={sectionRef}>
      {isVisible ? (
        <Suspense fallback={<SectionFallback sectionKey={sectionKey} />}>
          {children}
        </Suspense>
      ) : (
        <SectionFallback sectionKey={sectionKey} />
      )}
    </div>
  );
}

const Index = () => {
  const { forumEnabled, marketplaceEnabled } = usePublicSystemSettings();
  const sectionsEnabled = useDeferredPublicQuery(500);

  const featureFlags: Record<string, boolean> = {
    forum_enabled: forumEnabled,
    marketplace_enabled: marketplaceEnabled,
  };

  const { data: sections } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const supabase = await getPublicSupabase();
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("section_key, section_label, section_subtitle, is_visible, sort_order")
        .order("sort_order");
      if (error) throw error;
      const result = (data ?? []) as SectionData[];
      writeBootstrapCache("homepage-sections", result);
      return result;
    },
    initialData: readBootstrapCache<SectionData[]>("homepage-sections"),
    enabled: sectionsEnabled,
    staleTime: 5 * 60 * 1000,
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
          <Suspense key={s.section_key} fallback={null}>
            <LazyWrapper sectionKey={s.section_key}>
              <Component 
                sectionTitle={s.section_label || undefined} 
                sectionSubtitle={s.section_subtitle || undefined} 
              />
            </LazyWrapper>
          </Suspense>
        );
      })}
    </MainLayout>
  );
};

export default Index;
