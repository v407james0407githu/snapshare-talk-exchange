import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { EquipmentCategories } from "@/components/home/EquipmentCategories";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { FeaturedGallery } from "@/components/home/FeaturedGallery";
import { ForumPreview } from "@/components/home/ForumPreview";
import { MarketplacePreview } from "@/components/home/MarketplacePreview";
import { CTASection } from "@/components/home/CTASection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const sectionComponents: Record<string, React.FC> = {
  hero: HeroSection,
  equipment_categories: EquipmentCategories,
  featured_carousel: FeaturedCarousel,
  featured_gallery: FeaturedGallery,
  forum_preview: ForumPreview,
  marketplace_preview: MarketplacePreview,
  cta: CTASection,
};

const defaultOrder = [
  "hero",
  "equipment_categories",
  "featured_carousel",
  "featured_gallery",
  "forum_preview",
  "marketplace_preview",
  "cta",
];

// Map section keys to the feature toggle that controls them
const sectionFeatureMap: Record<string, string> = {
  forum_preview: "forum_enabled",
  equipment_categories: "forum_enabled",
  marketplace_preview: "marketplace_enabled",
};

const Index = () => {
  const { forumEnabled, marketplaceEnabled } = useSystemSettings();

  const featureFlags: Record<string, boolean> = {
    forum_enabled: forumEnabled,
    marketplace_enabled: marketplaceEnabled,
  };

  const { data: sections } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_sections")
        .select("section_key, is_visible, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data as { section_key: string; is_visible: boolean; sort_order: number }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const orderedKeys = (sections
    ? sections.filter((s) => s.is_visible).map((s) => s.section_key)
    : defaultOrder
  ).filter((key) => {
    const featureKey = sectionFeatureMap[key];
    return !featureKey || featureFlags[featureKey] !== false;
  });

  return (
    <MainLayout>
      {orderedKeys.map((key) => {
        const Component = sectionComponents[key];
        return Component ? <Component key={key} /> : null;
      })}
    </MainLayout>
  );
};

export default Index;
