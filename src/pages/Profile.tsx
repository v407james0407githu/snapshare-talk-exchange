import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  CheckCircle,
  ShoppingBag,
  Plus,
  Eye,
  Smartphone,
  Trash2,
  Pencil,
  CheckSquare,
  Square,
  X
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvatarCropDialog } from '@/components/profile/AvatarCropDialog';
import { useRef } from 'react';

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
    // 重新導向到登入頁，並記錄當前頁面以便登入後返回
    navigate('/auth', { state: { from: '/profile' } });
    return null;
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "格式錯誤", description: "請上傳圖片檔案", variant: "destructive" });
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: "檔案過大", description: "頭像大小不能超過 1MB", variant: "destructive" });
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
              <TabsTrigger value="listings" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                我的交易
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
              <MyPhotosTab userId={user.id} />
            </TabsContent>

            <TabsContent value="listings">
              <MyListingsTab userId={user.id} />
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

const conditionLabels: Record<string, string> = {
  new: '全新', like_new: '幾乎全新', good: '良好', fair: '普通',
};

function MyListingsTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('user_id', userId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
      setListings(data || []);
      setIsLoading(false);
    };
    load();
  }, [userId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">尚無刊登商品</h3>
          <p className="text-muted-foreground mb-4">開始刊登您的第一件商品吧！</p>
          <Button variant="gold" onClick={() => navigate('/marketplace/create')}>
            <Plus className="mr-2 h-4 w-4" />
            刊登商品
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="gold" size="sm" onClick={() => navigate('/marketplace/create')}>
          <Plus className="mr-2 h-4 w-4" />
          刊登商品
        </Button>
      </div>
      {listings.map((listing) => (
        <Link key={listing.id} to={`/marketplace/${listing.id}`}>
          <Card className={`hover-lift ${listing.is_sold ? 'opacity-60' : ''}`}>
            <CardContent className="flex items-center gap-4 p-4">
              <img
                src={listing.verification_image_url}
                alt={listing.title}
                className="h-16 w-24 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{listing.title}</h3>
                <p className="text-lg font-bold text-primary">
                  NT$ {listing.price?.toLocaleString()}
                </p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {conditionLabels[listing.condition] || listing.condition}
                  </Badge>
                  {listing.is_sold && (
                    <Badge variant="destructive" className="text-xs">已售出</Badge>
                  )}
                  {listing.is_verified && !listing.is_sold && (
                    <Badge variant="secondary" className="text-xs">已驗證</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function MyPhotosTab({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBatchEditDialog, setShowBatchEditDialog] = useState(false);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [batchCategory, setBatchCategory] = useState<string>('');
  const [batchBrand, setBatchBrand] = useState('');
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('photos')
        .select('id, title, description, thumbnail_url, image_url, category, brand, phone_model, camera_body, lens, view_count, comment_count, average_rating, rating_count, created_at')
        .eq('user_id', userId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
      setPhotos(data || []);
      setIsLoading(false);
    };
    load();
  }, [userId]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === photos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(photos.map(p => p.id)));
    }
  };

  const exitSelecting = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('photos')
      .delete()
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      toast({ title: '刪除失敗', description: error.message, variant: 'destructive' });
    } else {
      setPhotos(prev => prev.filter(p => !selectedIds.has(p.id)));
      toast({ title: '刪除成功', description: `已刪除 ${ids.length} 件作品` });
      exitSelecting();
    }
    setIsDeleting(false);
    setShowDeleteDialog(false);
  };

  const handleSingleDelete = async () => {
    if (!singleDeleteId) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', singleDeleteId)
      .eq('user_id', userId);

    if (error) {
      toast({ title: '刪除失敗', description: error.message, variant: 'destructive' });
    } else {
      setPhotos(prev => prev.filter(p => p.id !== singleDeleteId));
      toast({ title: '刪除成功', description: '作品已刪除' });
    }
    setIsDeleting(false);
    setSingleDeleteId(null);
  };

  const handleBatchEdit = async () => {
    setIsBatchSaving(true);
    const ids = Array.from(selectedIds);
    const updates: Record<string, any> = {};
    if (batchCategory) updates.category = batchCategory;
    if (batchBrand.trim()) updates.brand = batchBrand.trim();

    if (Object.keys(updates).length === 0) {
      toast({ title: '未修改', description: '請至少選擇一項要修改的欄位', variant: 'destructive' });
      setIsBatchSaving(false);
      return;
    }

    const { error } = await supabase
      .from('photos')
      .update(updates)
      .in('id', ids)
      .eq('user_id', userId);

    if (error) {
      toast({ title: '修改失敗', description: error.message, variant: 'destructive' });
    } else {
      setPhotos(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, ...updates } : p));
      toast({ title: '修改成功', description: `已更新 ${ids.length} 件作品` });
      exitSelecting();
    }
    setIsBatchSaving(false);
    setShowBatchEditDialog(false);
    setBatchCategory('');
    setBatchBrand('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (photos.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {isSelecting ? (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                {selectedIds.size === photos.length ? <CheckSquare className="mr-1 h-4 w-4" /> : <Square className="mr-1 h-4 w-4" />}
                {selectedIds.size === photos.length ? '取消全選' : '全選'}
              </Button>
              <span className="text-sm text-muted-foreground">
                已選 {selectedIds.size} / {photos.length}
              </span>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">共 {photos.length} 件作品</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSelecting ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                刪除 ({selectedIds.size})
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => {
                  setBatchCategory('');
                  setBatchBrand('');
                  setShowBatchEditDialog(true);
                }}
              >
                <Pencil className="mr-1 h-4 w-4" />
                批次編輯 ({selectedIds.size})
              </Button>
              <Button variant="ghost" size="sm" onClick={exitSelecting}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsSelecting(true)}>
                <CheckSquare className="mr-1 h-4 w-4" />
                批次管理
              </Button>
              <Button variant="gold" size="sm" onClick={() => navigate('/upload')}>
                <Upload className="mr-1 h-4 w-4" />
                上傳作品
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Photo list */}
      {photos.map((photo) => (
        <div key={photo.id} className="relative">
          {isSelecting ? (
            <div className="cursor-pointer" onClick={() => toggleSelect(photo.id)}>
              <Card className={`hover-lift mb-2 ${selectedIds.has(photo.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(photo.id)}
                      onCheckedChange={() => toggleSelect(photo.id)}
                    />
                  </div>
                  <PhotoCardContent photo={photo} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="hover-lift mb-2 group">
              <CardContent className="flex items-center gap-4 p-4">
                <Link to={`/gallery/${photo.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <PhotoCardContent photo={photo} />
                </Link>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/gallery/${photo.id}`);
                    }}
                    title="編輯"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      setSingleDeleteId(photo.id);
                    }}
                    title="刪除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ))}

      {/* Batch delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除所選的 {selectedIds.size} 件作品嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleBatchDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single delete confirmation */}
      <AlertDialog open={!!singleDeleteId} onOpenChange={(open) => { if (!open) setSingleDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除這件作品嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleSingleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Batch edit dialog */}
      <Dialog open={showBatchEditDialog} onOpenChange={setShowBatchEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批次編輯 ({selectedIds.size} 件作品)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">僅會更新有填寫的欄位，留空則不變更。</p>
            <div className="space-y-2">
              <Label>拍攝類型</Label>
              <Select value={batchCategory} onValueChange={setBatchCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="不變更" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">手機攝影</SelectItem>
                  <SelectItem value="camera">相機攝影</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>品牌</Label>
              <Input
                value={batchBrand}
                onChange={(e) => setBatchBrand(e.target.value)}
                placeholder="不變更"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchEditDialog(false)} disabled={isBatchSaving}>取消</Button>
            <Button onClick={handleBatchEdit} disabled={isBatchSaving}>
              {isBatchSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              確認修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Shared photo card content for reuse in both selecting and normal mode */
function PhotoCardContent({ photo }: { photo: any }) {
  return (
    <>
      <img
        src={photo.thumbnail_url || photo.image_url}
        alt={photo.title}
        className="h-20 w-20 rounded-lg object-cover shrink-0"
      />
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{photo.title}</h3>
        {photo.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{photo.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {photo.category === 'phone' ? <Smartphone className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
            {photo.brand}{photo.phone_model ? ` ${photo.phone_model}` : ''}{photo.camera_body ? ` ${photo.camera_body}` : ''}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {photo.view_count}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {Number(photo.average_rating || 0).toFixed(1)} ({photo.rating_count || 0})
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {photo.comment_count || 0}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(photo.created_at).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </>
  );
}
