import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ImagePlus,
  Loader2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Photo {
  id: string;
  title: string;
  image_url: string;
  user_id: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  average_rating: number;
  category: string;
  brand: string | null;
  camera_body: string | null;
  lens: string | null;
  phone_model: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const categories = [
  "全部",
  "風景",
  "城市",
  "街拍",
  "夜景",
  "微距",
  "生活",
  "天文",
  "人像",
  "其他",
];

export default function Gallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch photos from database
  const { data: photos, isLoading } = useQuery({
    queryKey: ["gallery-photos"],
    queryFn: async () => {
      const { data: photosData, error: photosError } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (photosError) throw photosError;

      // Fetch profiles for all photos
      const userIds = [...new Set(photosData.map((p) => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, p]) || []
      );

      return photosData.map((photo) => ({
        ...photo,
        profiles: profilesMap.get(photo.user_id),
      })) as Photo[];
    },
  });

  const getEquipmentDisplay = (photo: Photo) => {
    if (photo.phone_model) return photo.phone_model;
    if (photo.camera_body) return photo.camera_body;
    if (photo.brand) return photo.brand;
    return "未知設備";
  };

  const filteredPhotos = photos?.filter((photo) => {
    const matchesCategory =
      selectedCategory === "全部" || photo.category === selectedCategory;
    const equipment = getEquipmentDisplay(photo);
    const matchesSearch =
      photo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      photo.profiles?.username
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      photo.profiles?.display_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      equipment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUpload = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/upload");
  };

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
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
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
              <Button variant="gold" className="gap-2" onClick={handleUpload}>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPhotos?.length ? (
            <div
              className={`grid gap-6 ${
                viewMode === "grid"
                  ? "sm:grid-cols-2 lg:grid-cols-3"
                  : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              }`}
            >
              {filteredPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  to={`/gallery/${photo.id}`}
                  className="group relative block overflow-hidden rounded-xl bg-card border border-border hover-lift"
                >
                  {/* Image */}
                  <div
                    className={`overflow-hidden ${
                      viewMode === "grid" ? "aspect-[4/3]" : "aspect-square"
                    }`}
                  >
                    <img
                      src={photo.image_url}
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
                        {photo.profiles?.avatar_url ? (
                          <img
                            src={photo.profiles.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg">👤</span>
                        )}
                        <span className="text-sm text-cream/80">
                          {photo.profiles?.display_name ||
                            photo.profiles?.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-cream/70">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" /> {photo.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-4 w-4" />{" "}
                          {photo.comment_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" /> {photo.view_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Equipment Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 rounded-full bg-zinc-900/70 backdrop-blur-sm text-xs text-cream/90 border border-cream/20">
                      {getEquipmentDisplay(photo)}
                    </span>
                  </div>

                  {/* Rating Badge */}
                  {(photo.average_rating || 0) > 0 && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-xs font-medium text-zinc-900">
                        <Star className="h-3 w-3 fill-current" />{" "}
                        {Number(photo.average_rating).toFixed(1)}
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== "全部"
                  ? "沒有找到符合條件的作品"
                  : "還沒有作品，來上傳第一張吧！"}
              </p>
              <Button onClick={handleUpload} className="gap-2">
                <ImagePlus className="h-4 w-4" />
                上傳作品
              </Button>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
