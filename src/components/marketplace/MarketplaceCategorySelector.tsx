import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Camera, ShoppingBag } from "lucide-react";

export interface MarketplaceBrand {
  category: string;
  brand: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  icon: React.ReactNode;
  brands: string[];
}

export function useMarketplaceBrands() {
  return useQuery({
    queryKey: ["marketplace-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_models")
        .select("category, brand")
        .order("brand");
      if (error) throw error;

      const phoneBrands = [...new Set((data || []).filter(d => d.category === "phone").map(d => d.brand))];
      const cameraBrands = [...new Set((data || []).filter(d => d.category === "camera").map(d => d.brand))];

      const categories: MarketplaceCategory[] = [
        { id: "phone", name: "手機", slug: "phone", icon: <Smartphone className="h-5 w-5" />, brands: phoneBrands },
        { id: "camera", name: "相機", slug: "camera", icon: <Camera className="h-5 w-5" />, brands: cameraBrands },
      ];
      return categories;
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
}

// Keep old hook name for compatibility but redirect
export function useMarketplaceCategories() {
  return useMarketplaceBrands();
}

export const getCategoryColor = (_color: string | null) => "bg-muted text-muted-foreground";
export const getCategoryIcon = (icon: string | null) =>
  icon === "Smartphone" ? <Smartphone className="h-5 w-5" /> :
  icon === "Camera" ? <Camera className="h-5 w-5" /> :
  <ShoppingBag className="h-5 w-5" />;

interface MarketplaceCategorySidebarProps {
  categories: MarketplaceCategory[] | undefined;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  onSelectSubCategory: (subId: string | null) => void;
  listingCounts: Record<string, number>;
}

export function MarketplaceCategorySidebar({
  categories,
  selectedCategory,
  selectedSubCategory,
  onSelectCategory,
  onSelectSubCategory,
  listingCounts,
}: MarketplaceCategorySidebarProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 motion-panel">
      <h3 className="font-semibold mb-4">商品分類</h3>
      <div className="space-y-1">
        <button
          onClick={() => { onSelectCategory(null); onSelectSubCategory(null); }}
          className={`flex items-center gap-3 p-3 rounded-lg motion-list-item w-full text-left ${
            !selectedCategory ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
          }`}
        >
          <span className="font-medium motion-list-title">全部</span>
        </button>
        {categories?.map((cat) => (
          <div key={cat.id}>
            <button
              onClick={() => { onSelectCategory(cat.id); onSelectSubCategory(null); }}
              className={`flex items-center gap-3 p-3 rounded-lg motion-list-item group w-full text-left ${
                selectedCategory === cat.id && !selectedSubCategory
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="p-2 rounded-lg border bg-muted motion-interactive">
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium motion-list-title">
                  {cat.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {listingCounts[cat.slug] || 0} 件商品
                </div>
              </div>
            </button>
            {selectedCategory === cat.id && cat.brands.length > 0 && (
              <div className="ml-6 mt-1 space-y-1">
                {cat.brands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => onSelectSubCategory(brand)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm w-full text-left motion-list-item ${
                      selectedSubCategory === brand
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <span>{brand}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
