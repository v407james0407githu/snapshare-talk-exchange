import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Camera,
  Image,
  Heart,
  MessageCircle,
  Eye,
  Star,
  Calendar,
  ShieldCheck,
  Crown,
  Loader2,
  UserX,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface UserProfile {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_vip: boolean;
  created_at: string;
}

interface Photo {
  id: string;
  title: string;
  image_url: string;
  like_count: number;
  comment_count: number;
  view_count: number;
  average_rating: number;
  category: string;
  created_at: string;
}

interface UserStats {
  totalPhotos: number;
  totalLikes: number;
  totalViews: number;
  totalComments: number;
  avgRating: number;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const [activeTab, setActiveTab] = useState('photos');

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as UserProfile;
    },
    enabled: !!userId,
  });

  // Fetch user photos
  const { data: photos, isLoading: photosLoading } = useQuery({
    queryKey: ['user-photos', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', userId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Photo[];
    },
    enabled: !!userId,
  });

  // Calculate stats
  const stats: UserStats = {
    totalPhotos: photos?.length || 0,
    totalLikes: photos?.reduce((sum, p) => sum + (p.like_count || 0), 0) || 0,
    totalViews: photos?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0,
    totalComments: photos?.reduce((sum, p) => sum + (p.comment_count || 0), 0) || 0,
    avgRating: photos?.length
      ? photos.reduce((sum, p) => sum + (Number(p.average_rating) || 0), 0) / photos.length
      : 0,
  };

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <UserX className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">用戶不存在</h1>
          <p className="text-muted-foreground mb-6">找不到該用戶的資料</p>
          <Link to="/gallery">
            <Button>返回作品區</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Profile Header */}
      <section className="bg-gradient-hero py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <Avatar className="h-32 w-32 border-4 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-4xl bg-muted">
                {profile.display_name?.[0] || profile.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <h1 className="text-3xl font-bold text-cream">
                  {profile.display_name || profile.username}
                </h1>
                {profile.is_verified && (
                  <Badge className="gap-1 bg-primary/20 text-primary">
                    <ShieldCheck className="h-3 w-3" />
                    已認證
                  </Badge>
                )}
                {profile.is_vip && (
                  <Badge className="gap-1 bg-amber-500/20 text-amber-400">
                    <Crown className="h-3 w-3" />
                    VIP
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mb-2">@{profile.username}</p>
              {profile.bio && (
                <p className="text-cream/80 max-w-xl mb-4">{profile.bio}</p>
              )}
              <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  加入於 {format(new Date(profile.created_at), 'yyyy年M月', { locale: zhTW })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 border-b border-border">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="text-center p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-center gap-2 text-primary mb-1">
                  <Image className="h-5 w-5" />
                  <span className="text-2xl font-bold">{stats.totalPhotos}</span>
                </div>
                <p className="text-sm text-muted-foreground">作品數</p>
              </CardContent>
            </Card>
            <Card className="text-center p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-center gap-2 text-red-400 mb-1">
                  <Heart className="h-5 w-5" />
                  <span className="text-2xl font-bold">{stats.totalLikes}</span>
                </div>
                <p className="text-sm text-muted-foreground">獲得讚數</p>
              </CardContent>
            </Card>
            <Card className="text-center p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-center gap-2 text-blue-400 mb-1">
                  <Eye className="h-5 w-5" />
                  <span className="text-2xl font-bold">{stats.totalViews}</span>
                </div>
                <p className="text-sm text-muted-foreground">瀏覽次數</p>
              </CardContent>
            </Card>
            <Card className="text-center p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-center gap-2 text-green-400 mb-1">
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-2xl font-bold">{stats.totalComments}</span>
                </div>
                <p className="text-sm text-muted-foreground">留言數</p>
              </CardContent>
            </Card>
            <Card className="text-center p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="text-2xl font-bold">
                    {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '-'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">平均評分</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="py-8">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="photos" className="gap-2">
                <Camera className="h-4 w-4" />
                作品 ({stats.totalPhotos})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photos">
              {photosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : photos?.length ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {photos.map((photo) => (
                    <Link
                      key={photo.id}
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

                      {/* Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <h3 className="font-serif text-lg font-bold text-cream mb-2">
                            {photo.title}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-cream/70">
                            <span className="flex items-center gap-1">
                              <Heart className="h-4 w-4" /> {photo.like_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-4 w-4" /> {photo.comment_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-4 w-4" /> {photo.view_count || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Rating Badge */}
                      {(photo.average_rating || 0) > 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/90 text-xs font-medium text-zinc-900">
                            <Star className="h-3 w-3 fill-current" />{' '}
                            {Number(photo.average_rating).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">該用戶還沒有上傳作品</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </MainLayout>
  );
}
