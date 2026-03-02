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

const Index = () => {
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

  const orderedKeys = sections
    ? sections.filter((s) => s.is_visible).map((s) => s.section_key)
    : defaultOrder;

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
