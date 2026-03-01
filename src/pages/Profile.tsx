import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  User, 
  Camera, 
  Settings, 
  Shield, 
  Star, 
  ImageIcon, 
  MessageSquare,
  Upload,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { AvatarCropDialog } from '@/components/profile/AvatarCropDialog';

export default function Profile() {
  const { user, profile, updateProfile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');

  useState(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setPhone(profile.phone || '');
    }
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!user || !profile) {
    navigate('/auth');
    return null;
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "格式錯誤", description: "請上傳圖片檔案", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "檔案過大", description: "頭像大小不能超過 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCroppedUpload = async (croppedBlob: Blob) => {
    setIsUploadingAvatar(true);
    try {
      const fileName = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Add cache-busting param
      await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` });

      toast({ title: "上傳成功", description: "頭像已更新" });
      setShowCropDialog(false);
      setCropImageSrc(null);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "上傳失敗", description: "請稍後再試", variant: "destructive" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    const { error } = await updateProfile({
      display_name: displayName,
      bio,
      phone,
    });

    if (error) {
      toast({
        title: "儲存失敗",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "儲存成功",
        description: "個人資料已更新",
      });
      setIsEditing(false);
    }

    setIsSaving(false);
  };

  return (
    <MainLayout>
      <div className="container py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Profile Header */}
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-gold" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-16 sm:-mt-12">
                <div className="relative group">
                  <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-4xl bg-primary text-primary-foreground">
                      {profile.display_name?.[0] || profile.username[0]}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-6 w-6 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                </div>

                <div className="flex-1 text-center sm:text-left pb-4">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
                    {profile.is_verified && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        已驗證
                      </Badge>
                    )}
                    {profile.is_vip && (
                      <Badge className="gap-1 bg-gradient-gold text-charcoal">
                        <Star className="h-3 w-3" />
                        VIP
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                <Button
                  variant={isEditing ? "outline" : "gold"}
                  onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      儲存中...
                    </>
                  ) : isEditing ? (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      儲存變更
                    </>
                  ) : (
                    <>
                      <Settings className="mr-2 h-4 w-4" />
                      編輯資料
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Profile Content */}
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList>
              <TabsTrigger value="info" className="gap-2">
                <User className="h-4 w-4" />
                個人資料
              </TabsTrigger>
              <TabsTrigger value="photos" className="gap-2">
                <ImageIcon className="h-4 w-4" />
                我的作品
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                活動紀錄
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>基本資料</CardTitle>
                  <CardDescription>管理您的個人資訊</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">電子郵件</Label>
                      <Input
                        id="email"
                        value={user.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">用戶名</Label>
                      <Input
                        id="username"
                        value={profile.username}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">顯示名稱</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={!isEditing}
                        placeholder="您的顯示名稱"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">手機號碼</Label>
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={!isEditing}
                        placeholder="用於帳號驗證"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">自我介紹</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      disabled={!isEditing}
                      placeholder="介紹一下自己和您的攝影風格..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    會員狀態
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">每日上傳次數</p>
                      <p className="text-2xl font-bold">
                        {profile.daily_upload_count} / {profile.is_vip ? 10 : 3}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">會員等級</p>
                      <p className="text-2xl font-bold">
                        {profile.is_vip ? 'VIP' : '一般會員'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">加入時間</p>
                      <p className="text-2xl font-bold">
                        {new Date(profile.created_at).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos">
              <Card>
                <CardContent className="py-12 text-center">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">尚無作品</h3>
                  <p className="text-muted-foreground mb-4">開始上傳您的第一張作品吧！</p>
                  <Button variant="gold" onClick={() => navigate('/upload')}>
                    <Upload className="mr-2 h-4 w-4" />
                    上傳作品
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">尚無活動紀錄</h3>
                  <p className="text-muted-foreground">開始參與討論和評論吧！</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {cropImageSrc && (
        <AvatarCropDialog
          open={showCropDialog}
          onOpenChange={(open) => {
            setShowCropDialog(open);
            if (!open) setCropImageSrc(null);
          }}
          imageSrc={cropImageSrc}
          onCropComplete={handleCroppedUpload}
          isUploading={isUploadingAvatar}
        />
      )}
    </MainLayout>
  );
}
