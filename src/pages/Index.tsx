import { MainLayout } from "@/components/layout/MainLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { EquipmentCategories } from "@/components/home/EquipmentCategories";
import { FeaturedCarousel } from "@/components/home/FeaturedCarousel";
import { FeaturedGallery } from "@/components/home/FeaturedGallery";
import { ForumPreview } from "@/components/home/ForumPreview";
import { MarketplacePreview } from "@/components/home/MarketplacePreview";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <MainLayout>
      <HeroSection />
      <FeaturedCarousel />
      <FeaturedGallery />
      <EquipmentCategories />
      <ForumPreview />
      <MarketplacePreview />
      <CTASection />
    </MainLayout>
  );
};

export default Index;
