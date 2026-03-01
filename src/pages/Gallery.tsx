import { useState, useEffect, useCallback, useRef } from "react";
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

const PAGE_SIZE = 20;

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
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset when filters change
  useEffect(() => {
    setPhotos([]);
    setPage(0);
    setHasMore(true);
    setIsLoading(true);
  }, [selectedCategory, debouncedSearch]);

  // Fetch photos
  const fetchPhotos = useCallback(async (pageNum: number) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("photos")
      .select("*")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (selectedCategory !== "全部") {
      query = query.eq("category", selectedCategory);
    }

    if (debouncedSearch) {
      query = query.or(
        `title.ilike.%${debouncedSearch}%,brand.ilike.%${debouncedSearch}%,camera_body.ilike.%${debouncedSearch}%,phone_model.ilike.%${debouncedSearch}%`
      );
    }

    const { data: photosData, error } = await query;
    if (error) throw error;

    // Fetch profiles
    const userIds = [...new Set((photosData || []).map((p) => p.user_id))];
    let profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);
      profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
    }

    const enriched = (photosData || []).map((photo) => ({
      ...photo,
      profiles: profilesMap.get(photo.user_id),
    })) as Photo[];

    return enriched;
  }, [selectedCategory, debouncedSearch]);

  // Load page
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (page === 0) setIsLoading(true);
        else setIsLoadingMore(true);

        const data = await fetchPhotos(page);
        if (cancelled) return;

        if (page === 0) {
          setPhotos(data);
        } else {
          setPhotos((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [page, fetchPhotos]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, isLoadingMore]);

  const getEquipmentDisplay = (photo: Photo) => {
    if (photo.phone_model) return photo.phone_model;
    if (photo.camera_body) return photo.camera_body;
    if (photo.brand) return photo.brand;
    return "未知設備";
  };

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
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
          ) : photos.length > 0 ? (
            <>
              <div
                className={
                  viewMode === "masonry"
                    ? "columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3"
                    : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
                }
              >
                {photos.map((photo) => (
                  <Link
                    key={photo.id}
                    to={`/gallery/${photo.id}`}
                    className={`group relative block overflow-hidden rounded-lg ${
                      viewMode === "masonry" ? "mb-3 break-inside-avoid" : ""
                    }`}
                  >
                    <div className={`overflow-hidden rounded-lg ${viewMode === "grid" ? "aspect-[4/3]" : ""}`}>
                      <img
                        src={photo.image_url}
                        alt={photo.title}
                        className={`w-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.03] group-hover:brightness-110 ${
                          viewMode === "grid" ? "h-full" : "h-auto"
                        }`}
                        loading="lazy"
                      />
                    </div>

                    <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-charcoal/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <h3 className="font-serif text-sm md:text-base font-bold text-cream mb-1 line-clamp-1 drop-shadow-md">
                        {photo.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-1.5">
                        {photo.profiles?.avatar_url ? (
                          <img
                            src={photo.profiles.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-cream/30"
                          />
                        ) : (
                          <span className="text-sm">👤</span>
                        )}
                        <span className="text-xs text-cream/80 truncate drop-shadow-sm">
                          {photo.profiles?.display_name || photo.profiles?.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-cream/70">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {photo.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {photo.comment_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {photo.view_count || 0}
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="px-2 py-0.5 rounded-full bg-charcoal/70 backdrop-blur-sm text-[10px] md:text-xs text-cream/90 border border-cream/20">
                        {getEquipmentDisplay(photo)}
                      </span>
                    </div>

                    {(photo.average_rating || 0) > 0 && (
                      <div className="absolute top-2 right-2">
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/90 text-[10px] md:text-xs font-medium text-primary-foreground shadow-md">
                          <Star className="h-2.5 w-2.5 fill-current" /> {Number(photo.average_rating).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-4" />
              {isLoadingMore && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">載入更多作品...</span>
                </div>
              )}
              {!hasMore && photos.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">已顯示所有作品</p>
              )}
            </>
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
