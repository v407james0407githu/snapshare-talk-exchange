import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Grid3X3, LayoutGrid, ImagePlus } from "lucide-react";

const categories = [
  "全部", "風景", "城市", "街拍", "夜景", "微距", "生活", "天文", "人像", "其他",
];

const brands = [
  "全部品牌", "Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "Olympus",
  "Leica", "Pentax", "Apple", "Samsung", "Google", "其他",
];

interface GalleryFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  selectedBrand: string;
  onBrandChange: (value: string) => void;
  viewMode: "grid" | "masonry";
  onViewModeChange: (mode: "grid" | "masonry") => void;
  onUpload: () => void;
}

export function GalleryFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedBrand,
  onBrandChange,
  viewMode,
  onViewModeChange,
  onUpload,
}: GalleryFiltersProps) {
  return (
    <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-4">
      <div className="container">
        <div className="flex flex-col gap-3">
          {/* Row 1: Search + Category + Brand + View + Upload */}
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
            <div className="flex flex-1 gap-2 w-full md:w-auto flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋作品、作者或器材..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger className="w-28">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBrand} onValueChange={onBrandChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center border border-border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => onViewModeChange("grid")}
                  className="h-8 w-8"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "masonry" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => onViewModeChange("masonry")}
                  className="h-8 w-8"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="gold" className="gap-2" onClick={onUpload}>
                <ImagePlus className="h-4 w-4" />
                上傳作品
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
