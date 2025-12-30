import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Filter, 
  Grid3X3, 
  LayoutGrid,
  Heart,
  MessageCircle,
  Eye,
  Star,
  ImagePlus
} from "lucide-react";
import { Link } from "react-router-dom";

interface Photo {
  id: string;
  title: string;
  imageUrl: string;
  author: string;
  avatar: string;
  likes: number;
  comments: number;
  views: number;
  rating: number;
  equipment: string;
  category: string;
}

const photos: Photo[] = [
  {
    id: "1",
    title: "都市晨曦",
    imageUrl: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800",
    author: "攝影達人",
    avatar: "🎨",
    likes: 1234,
    comments: 89,
    views: 5678,
    rating: 4.8,
    equipment: "Sony A7 IV",
    category: "城市",
  },
  {
    id: "2",
    title: "山間雲海",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800",
    author: "山野客",
    avatar: "🏔️",
    likes: 2345,
    comments: 156,
    views: 8901,
    rating: 4.9,
    equipment: "Fujifilm X-T5",
    category: "風景",
  },
  {
    id: "3",
    title: "街頭光影",
    imageUrl: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800",
    author: "街拍手",
    avatar: "📸",
    likes: 876,
    comments: 45,
    views: 3456,
    rating: 4.5,
    equipment: "Ricoh GR III",
    category: "街拍",
  },
  {
    id: "4",
    title: "夜色迷離",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800",
    author: "夜行者",
    avatar: "🌙",
    likes: 1567,
    comments: 78,
    views: 4567,
    rating: 4.7,
    equipment: "iPhone 15 Pro",
    category: "夜景",
  },
  {
    id: "5",
    title: "花間蝶影",
    imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800",
    author: "微距狂",
    avatar: "🦋",
    likes: 987,
    comments: 56,
    views: 2345,
    rating: 4.6,
    equipment: "Nikon Z8",
    category: "微距",
  },
  {
    id: "6",
    title: "海岸日落",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
    author: "海風客",
    avatar: "🌅",
    likes: 1890,
    comments: 102,
    views: 6789,
    rating: 4.8,
    equipment: "Samsung S24 Ultra",
    category: "風景",
  },
  {
    id: "7",
    title: "咖啡時光",
    imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800",
    author: "生活家",
    avatar: "☕",
    likes: 654,
    comments: 32,
    views: 1890,
    rating: 4.4,
    equipment: "Fujifilm X100VI",
    category: "生活",
  },
  {
    id: "8",
    title: "雨中漫步",
    imageUrl: "https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800",
    author: "雨季詩人",
    avatar: "🌧️",
    likes: 1123,
    comments: 67,
    views: 3456,
    rating: 4.6,
    equipment: "Sony A7C II",
    category: "街拍",
  },
  {
    id: "9",
    title: "星空銀河",
    imageUrl: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800",
    author: "星空獵人",
    avatar: "⭐",
    likes: 2567,
    comments: 189,
    views: 9876,
    rating: 4.9,
    equipment: "Nikon Z6 III",
    category: "天文",
  },
];

const categories = ["全部", "風景", "城市", "街拍", "夜景", "微距", "生活", "天文", "人像"];

export default function Gallery() {
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPhotos = photos.filter((photo) => {
    const matchesCategory = selectedCategory === "全部" || photo.category === selectedCategory;
    const matchesSearch = photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.equipment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MainLayout>
      {/* Header */}
      <section className="bg-gradient-hero py-16">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-cream mb-4">
              作品<span className="text-gradient">分享區</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              瀏覽社群成員分享的精彩攝影作品，為您喜愛的作品點讚評分
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 bg-background/95 backdrop-blur-sm border-b border-border py-4">
        <div className="container">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search & Filters */}
            <div className="flex flex-1 gap-3 w-full md:w-auto">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋作品、作者或器材..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode & Upload */}
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-border rounded-lg p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "masonry" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("masonry")}
                  className="h-8 w-8"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="gold" className="gap-2">
                <ImagePlus className="h-4 w-4" />
                上傳作品
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section className="py-8">
        <div className="container">
          <div className={`grid gap-6 ${
            viewMode === "grid" 
              ? "sm:grid-cols-2 lg:grid-cols-3"
              : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          }`}>
            {filteredPhotos.map((photo) => (
              <Link
                key={photo.id}
                to={`/gallery/${photo.id}`}
                className="group relative block overflow-hidden rounded-xl bg-card border border-border hover-lift"
              >
                {/* Image */}
                <div className={`overflow-hidden ${viewMode === "grid" ? "aspect-[4/3]" : "aspect-square"}`}>
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-serif text-lg font-bold text-cream mb-1">
                      {photo.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{photo.avatar}</span>
                      <span className="text-sm text-cream/80">{photo.author}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-cream/70">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4" /> {photo.likes}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" /> {photo.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" /> {photo.views}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Equipment Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 rounded-full bg-zinc-900/70 backdrop-blur-sm text-xs text-cream/90 border border-cream/20">
                    {photo.equipment}
                  </span>
                </div>

                {/* Rating Badge */}
                <div className="absolute top-3 right-3">
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-xs font-medium text-zinc-900">
                    <Star className="h-3 w-3 fill-current" /> {photo.rating}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {filteredPhotos.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">沒有找到符合條件的作品</p>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
