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

const sectionComponents: Record<string, React.FC<{ sectionTitle?: string; sectionSubtitle?: string }>> = {
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
  featured_gallery: "gallery_enabled",
  featured_carousel: "gallery_enabled",
  forum_preview: "forum_enabled",
  equipment_categories: "forum_enabled",
  marketplace_preview: "marketplace_enabled",
};

interface SectionData {
  section_key: string;
  section_label: string;
  section_subtitle: string;
  is_visible: boolean;
  sort_order: number;
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

  return (
    <MainLayout>
      {filteredSections.map((s) => {
        const Component = sectionComponents[s.section_key];
        return Component ? <Component key={s.section_key} sectionTitle={s.section_label || undefined} /> : null;
      })}
    </MainLayout>
  );
};

export default Index;
