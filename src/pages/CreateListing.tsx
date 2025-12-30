import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  X,
  Shield,
  Loader2,
  Camera,
  Smartphone,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

export default function CreateListing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const verificationInputRef = useRef<HTMLInputElement>(null);
  const additionalInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [verificationImage, setVerificationImage] = useState<UploadedFile | null>(null);
  const [additionalImages, setAdditionalImages] = useState<UploadedFile[]>([]);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleVerificationUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast({
        title: "格式錯誤",
        description: "請上傳圖片檔案",
        variant: "destructive",
      });
      return;
    }

    if (verificationImage) {
      URL.revokeObjectURL(verificationImage.preview);
    }

    setVerificationImage({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    });
  }, [verificationImage, toast]);

  const handleAdditionalUpload = useCallback((files: FileList | null) => {
    if (!files) return;

    const remainingSlots = 5 - additionalImages.length;
    if (remainingSlots <= 0) {
      toast({
        title: "上傳限制",
        description: "最多只能上傳 5 張附加圖片",
        variant: "destructive",
      });
      return;
    }

    const validFiles = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }));

    setAdditionalImages(prev => [...prev, ...newFiles]);
  }, [additionalImages.length, toast]);

  const removeAdditionalImage = useCallback((id: string) => {
    setAdditionalImages(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleVerificationUpload(e.dataTransfer.files);
  }, [handleVerificationUpload]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate('/auth');
      return;
    }

    if (!verificationImage) {
      toast({
        title: "請上傳驗證照片",
        description: "需要上傳實物驗證照才能刊登商品",
        variant: "destructive",
      });
      return;
    }

    if (!title || !description || !category || !condition || !price) {
      toast({
        title: "請填寫必填欄位",
        description: "標題、說明、分類、狀態和價格為必填",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload verification image
      const verificationExt = verificationImage.file.name.split('.').pop();
      const verificationFileName = `${user.id}/${Date.now()}_verification.${verificationExt}`;

      const { error: verificationUploadError } = await supabase.storage
        .from('verification')
        .upload(verificationFileName, verificationImage.file);

      if (verificationUploadError) throw verificationUploadError;

      const { data: { publicUrl: verificationUrl } } = supabase.storage
        .from('verification')
        .getPublicUrl(verificationFileName);

      // Upload additional images
      const additionalUrls: string[] = [];
      for (const img of additionalImages) {
        const ext = img.file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${img.id}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, img.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        additionalUrls.push(publicUrl);
      }

      // Create listing
      const { error: insertError } = await supabase
        .from('marketplace_listings')
        .insert({
          user_id: user.id,
          title,
          description,
          category,
          brand: brand || null,
          model: model || null,
          condition,
          price: parseFloat(price),
          location: location || null,
          verification_image_url: verificationUrl,
          additional_images: additionalUrls.length > 0 ? additionalUrls : null,
        });

      if (insertError) throw insertError;

      toast({
        title: "刊登成功！",
        description: "您的商品已成功刊登",
      });

      // Clean up
      if (verificationImage) URL.revokeObjectURL(verificationImage.preview);
      additionalImages.forEach(img => URL.revokeObjectURL(img.preview));

      navigate('/marketplace');
    } catch (error) {
      console.error('Error creating listing:', error);
      toast({
        title: "刊登失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">刊登商品</h1>
          <p className="text-muted-foreground">
            請提供詳細的商品資訊，並上傳實物驗證照
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verification Photo */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                實物驗證照 *
              </CardTitle>
              <CardDescription>
                請在商品旁放置一張手寫紙條，標明商品型號與您的用戶名，拍照上傳
              </CardDescription>
            </CardHeader>
            <CardContent>
              {verificationImage ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <img
                    src={verificationImage.preview}
                    alt="Verification"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(verificationImage.preview);
                      setVerificationImage(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={handleDrop}
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    拖放驗證照片至此，或點擊選擇
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => verificationInputRef.current?.click()}
                  >
                    選擇檔案
                  </Button>
                  <input
                    ref={verificationInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleVerificationUpload(e.target.files)}
                  />
                </div>
              )}

              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  驗證照片要求
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 商品需清晰可見</li>
                  <li>• 紙條需手寫您的用戶名</li>
                  <li>• 紙條需手寫商品型號</li>
                  <li>• 紙條需與商品一起入鏡</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>商品資訊</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">標題 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：Sony A7IV 機身 公司貨 極新"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">說明 *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="詳細描述商品狀況、購買時間、保固情況等..."
                  rows={5}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>分類 *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇分類" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">
                        <span className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          手機
                        </span>
                      </SelectItem>
                      <SelectItem value="camera">
                        <span className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          相機
                        </span>
                      </SelectItem>
                      <SelectItem value="lens">鏡頭</SelectItem>
                      <SelectItem value="accessory">配件</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>狀態 *</Label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇狀態" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">全新</SelectItem>
                      <SelectItem value="like_new">幾乎全新</SelectItem>
                      <SelectItem value="good">良好</SelectItem>
                      <SelectItem value="fair">普通</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">品牌</Label>
                  <Input
                    id="brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="例如：Sony、Canon、Apple"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">型號</Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="例如：A7IV、iPhone 15 Pro"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">價格 (TWD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="請輸入價格"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">地點</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="例如：台北市、高雄市"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Images */}
          <Card>
            <CardHeader>
              <CardTitle>附加照片</CardTitle>
              <CardDescription>
                最多可上傳 5 張額外商品照片
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                {additionalImages.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden">
                    <img
                      src={img.preview}
                      alt="Additional"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalImage(img.id)}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {additionalImages.length < 5 && (
                  <button
                    type="button"
                    onClick={() => additionalInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  </button>
                )}
              </div>
              <input
                ref={additionalInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleAdditionalUpload(e.target.files)}
              />
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                刊登中...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-5 w-5" />
                刊登商品
              </>
            )}
          </Button>
        </form>
      </div>
    </MainLayout>
  );
}
