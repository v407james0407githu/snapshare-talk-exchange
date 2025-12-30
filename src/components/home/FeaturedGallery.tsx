import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, Star, ArrowRight } from "lucide-react";

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
}

const featuredPhotos: Photo[] = [
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
  },
];

interface PhotoCardProps {
  photo: Photo;
}

function PhotoCard({ photo }: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={`/gallery/${photo.id}`}
      className="group relative block overflow-hidden rounded-xl bg-card border border-border hover-lift"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={photo.imageUrl}
          alt={photo.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>

      {/* Overlay on Hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/20 to-transparent transition-opacity duration-300 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
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
        <span className="px-2 py-1 rounded-full bg-charcoal/70 backdrop-blur-sm text-xs text-cream/90 border border-cream/20">
          {photo.equipment}
        </span>
      </div>

      {/* Rating Badge */}
      <div className="absolute top-3 right-3">
        <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-xs font-medium text-charcoal">
          <Star className="h-3 w-3 fill-current" /> {photo.rating}
        </span>
      </div>
    </Link>
  );
}

export function FeaturedGallery() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              精選<span className="text-gradient">作品</span>
            </h2>
            <p className="text-muted-foreground">
              社群精選的優質攝影作品
            </p>
          </div>
          <Link to="/gallery">
            <Button variant="outline" className="hidden sm:flex gap-2">
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredPhotos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Link to="/gallery">
            <Button variant="outline" className="gap-2">
              查看全部作品
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
