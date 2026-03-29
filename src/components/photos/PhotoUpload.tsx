import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Upload,
  X,
  Camera,
  Smartphone,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { resizeImage, createThumbnail, getOutputExtension, getOutputMimeType } from '@/lib/imageResize';

function useBrandOptions() {
  return useQuery({
    queryKey: ['upload-brand-options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('name, slug, parent_id, sort_order')
        .not('parent_id', 'is', null)
        .order('sort_order');
      if (error) throw error;

      const { data: parents } = await supabase
        .from('forum_categories')
        .select('id, slug')
        .is('parent_id', null);

      const mobileParentId = parents?.find(p => p.slug === 'mobile')?.id;
      const cameraParentId = parents?.find(p => p.slug === 'camera')?.id;

      const toBrandOption = (cat: any) => ({
        value: cat.slug.replace(/^(mobile|camera)-/, ''),
        label: cat.name,
      });

      const phoneBrands = (data || [])
        .filter(c => c.parent_id === mobileParentId)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(toBrandOption);
      phoneBrands.push({ value: 'other', label: '其他' });

      const cameraBrands = (data || [])
        .filter(c => c.parent_id === cameraParentId)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(toBrandOption);
      cameraBrands.push({ value: 'other', label: '其他' });

      return { phoneBrands, cameraBrands };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useBrandModels(category: string, brand: string) {
  return useQuery({
    queryKey: ['brand-models', category, brand],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_models' as any)
        .select('id, model_name, sort_order')
        .eq('category', category)
        .eq('brand', brand)
        .order('sort_order');
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!category && !!brand && brand !== 'other',
    staleTime: 5 * 60 * 1000,
  });
}

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

export function PhotoUpload() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: brandOptions } = useBrandOptions();
  const phoneBrands = brandOptions?.phoneBrands ?? [];
  const cameraBrands = brandOptions?.cameraBrands ?? [];
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const getTodayTW = () => {
    const now = new Date();
    const twTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return twTime.toISOString().split('T')[0];
  };

  const todayTW = getTodayTW();
  const isToday = profile?.last_upload_date === todayTW;
  const dailyUsed = isToday ? (profile?.daily_upload_count || 0) : 0;
  const dailyMax = profile?.is_vip ? 10 : 3;
  const dailyRemaining = Math.max(0, dailyMax - dailyUsed);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'phone' | 'camera' | ''>('');
  const [brand, setBrand] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [cameraBody, setCameraBody] = useState('');
  const [lens, setLens] = useState('');

  const { data: modelOptions } = useBrandModels(category, brand);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const remainingSlots = dailyRemaining - uploadedFiles.length;

    if (remainingSlots <= 0) {
      toast({
        title: "上傳限制",
        description: `今日上傳額度已滿（每日 ${dailyMax} 張，台灣時間重置）`,
        variant: "destructive",
      });
      return;
    }

    const validFiles = Array.from(files)
      .filter(file => file.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (validFiles.length < files.length) {
      toast({
        title: "部分檔案被忽略",
        description: "只能上傳圖片檔案",
        variant: "destructive",
      });
    }

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).substr(2, 9),
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  }, [uploadedFiles.length, profile?.is_vip, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  }, [processFiles]);

  const removeFile = useCallback((id: string) => {
    setUploadedFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: "請先登入", description: "您需要登入才能上傳作品", variant: "destructive" });
      navigate('/auth');
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({ title: "請選擇照片", description: "至少需要上傳一張照片", variant: "destructive" });
      return;
    }

    if (!title.trim()) {
      toast({ title: "請輸入標題", description: "作品標題為必填", variant: "destructive" });
      return;
    }

    if (!category) {
      toast({ title: "請選擇拍攝類型", description: "請選擇拍攝裝備類型", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      for (const uploadedFile of uploadedFiles) {
        const resizedImage = await resizeImage(uploadedFile.file);
        const thumbnail = await createThumbnail(uploadedFile.file);
        
        const ext = getOutputExtension();
        const mime = getOutputMimeType();
        const timestamp = Date.now();
        const fileName = `${user.id}/${timestamp}_${uploadedFile.id}.${ext}`;
        const thumbFileName = `${user.id}/${timestamp}_${uploadedFile.id}_thumb.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, resizedImage.blob, { contentType: mime });

        if (uploadError) throw uploadError;

        const { error: thumbError } = await supabase.storage
          .from('photos')
          .upload(thumbFileName, thumbnail.blob, { contentType: mime });

        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        const { data: { publicUrl: thumbUrl } } = supabase.storage.from('photos').getPublicUrl(thumbFileName);

        const { error: insertError } = await supabase
          .from('photos')
          .insert({
            user_id: user.id,
            title: uploadedFiles.length > 1 ? `${title} - ${uploadedFile.id}` : title,
            description,
            image_url: publicUrl,
            thumbnail_url: thumbError ? null : thumbUrl,
            category,
            brand,
            phone_model: category === 'phone' ? phoneModel : null,
            camera_body: category === 'camera' ? cameraBody : null,
            lens: category === 'camera' ? lens : null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
      }

      toast({ title: "上傳成功！", description: `成功上傳 ${uploadedFiles.length} 張照片` });
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      navigate('/gallery');
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "上傳失敗", description: "請稍後再試", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="py-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">拖放照片至此上傳</h3>
            <p className="text-muted-foreground mb-4">
              支援 JPG、PNG、WebP 格式，單檔最大 5MB（上傳時自動壓縮為 WebP）
            </p>
            <Button variant="gold" onClick={() => fileInputRef.current?.click()}>
              選擇檔案
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
            <p className="text-sm text-muted-foreground mt-4">
              今日可上傳：{dailyRemaining} / {dailyMax} 張（台灣時間每日重置）
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Grid */}
      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="relative group aspect-square rounded-lg overflow-hidden">
              <img src={file.preview} alt="Preview" className="w-full h-full object-cover" />
              <button
                onClick={() => removeFile(file.id)}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>作品資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">標題 *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="為您的作品取個標題" maxLength={100} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">說明</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述一下這張照片的故事..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>拍攝裝備</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>拍攝類型 *</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={category === 'phone' ? 'gold' : 'outline'}
                  className="flex-1"
                  onClick={() => { setCategory('phone'); setBrand(''); setPhoneModel(''); }}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  手機
                </Button>
                <Button
                  type="button"
                  variant={category === 'camera' ? 'gold' : 'outline'}
                  className="flex-1"
                  onClick={() => { setCategory('camera'); setBrand(''); setCameraBody(''); }}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  相機
                </Button>
              </div>
            </div>

            {category && (
              <div className="space-y-2">
                <Label>品牌</Label>
                <Select value={brand} onValueChange={(v) => { setBrand(v); setPhoneModel(''); setCameraBody(''); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇品牌" />
                  </SelectTrigger>
                  <SelectContent>
                    {(category === 'phone' ? phoneBrands : cameraBrands).map((b) => (
                      <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {category === 'phone' && brand && (
              <div className="space-y-2">
                <Label htmlFor="phoneModel">型號</Label>
                {brand !== 'other' && modelOptions && modelOptions.length > 0 && phoneModel !== '__other__' ? (
                  <Select value={phoneModel} onValueChange={setPhoneModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇型號" />
                    </SelectTrigger>
                    <SelectContent>
                      {modelOptions.map((m: any) => (
                        <SelectItem key={m.id} value={m.model_name}>{m.model_name}</SelectItem>
                      ))}
                      <SelectItem value="__other__">其他（手動輸入）</SelectItem>
                    </SelectContent>
                  </Select>
                ) : phoneModel === '__other__' ? (
                  <Input
                    id="phoneModel"
                    value=""
                    onChange={(e) => { if (e.target.value) setPhoneModel(e.target.value); }}
                    placeholder="請輸入型號名稱"
                    autoFocus
                  />
                ) : (
                  <Input
                    id="phoneModel"
                    value={phoneModel}
                    onChange={(e) => setPhoneModel(e.target.value)}
                    placeholder="例如：iPhone 15 Pro Max"
                  />
                )}
              </div>
            )}

            {category === 'camera' && brand && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cameraBody">機身</Label>
                  {brand !== 'other' && modelOptions && modelOptions.length > 0 && cameraBody !== '__other__' ? (
                    <Select value={cameraBody} onValueChange={setCameraBody}>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇機身" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map((m: any) => (
                          <SelectItem key={m.id} value={m.model_name}>{m.model_name}</SelectItem>
                        ))}
                        <SelectItem value="__other__">其他（手動輸入）</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : cameraBody === '__other__' ? (
                    <Input
                      id="cameraBody"
                      value=""
                      onChange={(e) => { if (e.target.value) setCameraBody(e.target.value); }}
                      placeholder="請輸入機身名稱"
                      autoFocus
                    />
                  ) : (
                    <Input
                      id="cameraBody"
                      value={cameraBody}
                      onChange={(e) => setCameraBody(e.target.value)}
                      placeholder="例如：Sony A7IV"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lens">鏡頭</Label>
                  <Input
                    id="lens"
                    value={lens}
                    onChange={(e) => setLens(e.target.value)}
                    placeholder="例如：FE 24-70mm F2.8 GM II"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={isUploading || uploadedFiles.length === 0}>
          {isUploading ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" />上傳中...</>
          ) : (
            <><CheckCircle className="mr-2 h-5 w-5" />發布作品</>
          )}
        </Button>
      </form>
    </div>
  );
}
