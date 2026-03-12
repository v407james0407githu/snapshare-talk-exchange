import { useEffect, useState, useRef } from 'react';
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
import { Heart, Eye, Star, ArrowRight, Loader2, Award } from 'lucide-react';
import Autoplay from 'embla-carousel-autoplay';
import { useSiteContent } from '@/hooks/useSiteContent';

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
  is_featured: boolean;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

function getEquipmentDisplay(photo: FeaturedPhoto) {
  if (photo.phone_model) return photo.phone_model;
  if (photo.camera_body) return photo.camera_body;
  if (photo.brand) return photo.brand;
  return null;
}

function PhotoCard({ photo }: { photo: FeaturedPhoto }) {
  const equipment = getEquipmentDisplay(photo);
  return (
    <Link
      to={`/gallery/${photo.id}`}
      className="group relative block overflow-hidden rounded-xl bg-card border border-border hover-lift"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={photo.image_url}
          alt={photo.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-serif text-lg font-bold text-foreground mb-2">
            {photo.title}
          </h3>
          <Link
            to={`/user/${photo.user_id}`}
            className="flex items-center gap-2 mb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={photo.profiles?.avatar_url || undefined} />
              <AvatarFallback>{photo.profiles?.username?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground hover:text-foreground">
              {photo.profiles?.display_name || photo.profiles?.username}
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" /> {photo.like_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> {photo.view_count || 0}
            </span>
          </div>
        </div>
      </div>
      {equipment && (
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/70 backdrop-blur-sm text-foreground/90 border-border/20">
            {equipment}
          </Badge>
        </div>
      )}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
        {photo.is_featured && (
          <Badge className="gap-1 bg-amber-500/90 text-amber-950 border-0">
            <Award className="h-3 w-3" />
            精選
          </Badge>
        )}
        {(photo.average_rating || 0) > 0 && (
          <Badge className="gap-1 bg-primary/90 text-primary-foreground">
            <Star className="h-3 w-3 fill-current" />
            {Number(photo.average_rating).toFixed(1)}
          </Badge>
        )}
      </div>
    </Link>
  );
}

function ClassicCarouselRow({
  photos,
  label,
  autoplayDelay,
}: {
  photos: FeaturedPhoto[];
  label: string;
  autoplayDelay: number;
}) {
  const [api, setApi] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const autoplayRef = useRef(
    Autoplay({ delay: autoplayDelay, stopOnInteraction: true })
  );

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (!photos.length) return null;

  return (
    <div className="mb-4 last:mb-0">
      {label && (
        <h3 className="text-lg font-semibold text-foreground mb-3">{label}</h3>
      )}
      <Carousel
        setApi={setApi}
        opts={{ align: 'start', loop: true }}
        plugins={[autoplayRef.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <PhotoCard photo={photo} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4" />
        <CarouselNext className="hidden md:flex -right-4" />
      </Carousel>
      <div className="flex items-center justify-center gap-2 mt-4">
        {photos.map((_, index) => (
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
    </div>
  );
}

function FreeScrollCarouselRow({
  photos,
  label,
  autoplayDelay,
}: {
  photos: FeaturedPhoto[];
  label: string;
  autoplayDelay: number;
}) {
  const [api, setApi] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const autoplayRef = useRef(
    Autoplay({ delay: autoplayDelay, stopOnInteraction: true })
  );

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on('select', () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  if (!photos.length) return null;

  return (
    <div className="mb-4 last:mb-0">
      {label && (
        <h3 className="text-lg font-semibold text-foreground mb-3">{label}</h3>
      )}
      <Carousel
        setApi={setApi}
        opts={{
          align: 'start',
          loop: true,
          slidesToScroll: 1,
          dragFree: true,
        }}
        plugins={[autoplayRef.current]}
        className="w-full"
      >
        <CarouselContent className="-ml-5">
          {photos.map((photo) => (
            <CarouselItem key={photo.id} className="pl-5 basis-[85%] md:basis-[45.45%]">
              <PhotoCard photo={photo} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4" />
        <CarouselNext className="hidden md:flex -right-4" />
      </Carousel>
      <div className="flex items-center justify-center gap-2 mt-4">
        {photos.map((_, index) => (
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
    </div>
  );
}

export function FeaturedCarousel({
  sectionTitle,
  sectionSubtitle,
}: { sectionTitle?: string; sectionSubtitle?: string } = {}) {
  const { get } = useSiteContent();

  const row1Label = get('featured_carousel_row1_label', '最新精選');
  const row2Label = get('featured_carousel_row2_label', '高評分精選');

  // 最新精選
  const { data: latestPhotos, isLoading: l1 } = useQuery({
    queryKey: ['featured-photos-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('is_hidden', false)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  // 高評分精選
  const { data: topRatedPhotos, isLoading: l2 } = useQuery({
    queryKey: ['featured-photos-top-rated'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('is_hidden', false)
        .eq('is_featured', true)
        .order('average_rating', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const allPhotos = [...(latestPhotos || []), ...(topRatedPhotos || [])];
  const userIds = [...new Set(allPhotos.map((p) => p.user_id))];

  const { data: profilesData } = useQuery({
    queryKey: ['featured-photos-profiles', userIds.join(',')],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .in('user_id', userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const profilesMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);

  const withProfiles = (photos: typeof latestPhotos) =>
    (photos || []).map((photo) => ({
      ...photo,
      profiles: profilesMap.get(photo.user_id),
    })) as FeaturedPhoto[];

  const latestFeatured = withProfiles(latestPhotos);
  const topRatedFeatured = withProfiles(topRatedPhotos);
  const isLoading = l1 || l2;

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

  if (!latestFeatured.length && !topRatedFeatured.length) return null;

  return (
    <section className="py-12 bg-muted/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-2">
              {sectionTitle || '精選作品'}
            </h2>
            <p className="text-muted-foreground">
              {sectionSubtitle || '社群精選的優質攝影作品'}
            </p>
          </div>
          <Link to="/gallery">
            <Button variant="outline" className="hidden sm:flex gap-2">
              查看全部
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <ClassicCarouselRow photos={latestFeatured} label={row1Label} autoplayDelay={5000} />
        <FreeScrollCarouselRow photos={topRatedFeatured} label={row2Label} autoplayDelay={6000} />

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
