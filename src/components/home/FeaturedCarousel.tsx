import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Eye, Star, ArrowRight, Loader2 } from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';

interface FeaturedPhoto {
  id: string;
  title: string;
  image_url: string;
  user_id: string;
  like_count: number;
  view_count: number;
  average_rating: number;
  category: string;
  camera_body: string | null;
  phone_model: string | null;
  brand: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function FeaturedCarousel() {
  const [api, setApi] = useState<any>(null);
  const [current, setCurrent] = useState(0);

  const { data: featuredPhotos, isLoading } = useQuery({
    queryKey: ['featured-photos'],
    queryFn: async () => {
      // Fetch featured photos (is_featured = true) or top rated photos
      const { data: photosData, error: photosError } = await supabase
        .from('photos')
        .select('*')
        .eq('is_hidden', false)
        .order('is_featured', { ascending: false })
        .order('average_rating', { ascending: false })
        .order('like_count', { ascending: false })
        .limit(8);

      if (photosError) throw photosError;

      // Fetch profiles for all photos
      const userIds = [...new Set(photosData.map((p) => p.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map((p) => [p.user_id, p]) || []
      );

      return photosData.map((photo) => ({
        ...photo,
        profiles: profilesMap.get(photo.user_id),
      })) as FeaturedPhoto[];
    },
  });

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on('select', () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const getEquipmentDisplay = (photo: FeaturedPhoto) => {
    if (photo.phone_model) return photo.phone_model;
    if (photo.camera_body) return photo.camera_body;
    if (photo.brand) return photo.brand;
    return null;
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </section>
    );
  }

  if (!featuredPhotos?.length) {
    return null;
  }

  return (
    <section className="py-12 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              精選<span className="text-gradient">輪播</span>
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

        <Carousel
          setApi={setApi}
          opts={{
            align: 'start',
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 5000,
              stopOnInteraction: true,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {featuredPhotos.map((photo) => (
              <CarouselItem key={photo.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <Link
                  to={`/gallery/${photo.id}`}
                  className="group relative block overflow-hidden rounded-xl bg-card border border-border hover-lift"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={photo.image_url}
                      alt={photo.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="font-serif text-lg font-bold text-cream mb-2">
                        {photo.title}
                      </h3>
                      <Link
                        to={`/user/${photo.user_id}`}
                        className="flex items-center gap-2 mb-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={photo.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {photo.profiles?.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-cream/80 hover:text-cream">
                          {photo.profiles?.display_name || photo.profiles?.username}
                        </span>
                      </Link>
                      <div className="flex items-center gap-4 text-sm text-cream/70">
                        <span className="flex items-center gap-1">
                          <Heart className="h-4 w-4" /> {photo.like_count || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" /> {photo.view_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Equipment Badge */}
                  {getEquipmentDisplay(photo) && (
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="bg-zinc-900/70 backdrop-blur-sm text-cream/90 border-cream/20">
                        {getEquipmentDisplay(photo)}
                      </Badge>
                    </div>
                  )}

                  {/* Rating Badge */}
                  {(photo.average_rating || 0) > 0 && (
                    <div className="absolute top-3 right-3">
                      <Badge className="gap-1 bg-primary/90 text-zinc-900">
                        <Star className="h-3 w-3 fill-current" />
                        {Number(photo.average_rating).toFixed(1)}
                      </Badge>
                    </div>
                  )}
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>

        {/* Dots Indicator */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {featuredPhotos.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                current === index
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
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
