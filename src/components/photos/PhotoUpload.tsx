import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  X,
  ImageIcon,
  Camera,
  Smartphone,
  Loader2,
  Plus,
  CheckCircle
} from 'lucide-react';
import { resizeImage, createThumbnail } from '@/lib/imageResize';
import { TagInput } from '@/components/forums/TagInput';

const phoneBrands = [
  { value: 'apple', label: 'Apple' },
  { value: 'samsung', label: 'Samsung' },
  { value: 'xiaomi', label: '小米' },
  { value: 'vivo', label: 'Vivo' },
  { value: 'oppo', label: 'OPPO' },
  { value: 'google', label: 'Google' },
  { value: 'huawei', label: 'Huawei' },
  { value: 'other', label: '其他' },
];

const cameraBrands = [
  { value: 'sony', label: 'Sony' },
  { value: 'canon', label: 'Canon' },
  { value: 'nikon', label: 'Nikon' },
  { value: 'fujifilm', label: 'Fujifilm' },
  { value: 'ricoh', label: 'Ricoh' },
  { value: 'leica', label: 'Leica' },
  { value: 'panasonic', label: 'Panasonic' },
  { value: 'olympus', label: 'Olympus' },
  { value: 'other', label: '其他' },
];

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

export function PhotoUpload() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'phone' | 'camera' | ''>('');
  const [brand, setBrand] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [cameraBody, setCameraBody] = useState('');
  const [lens, setLens] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);

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

    const maxFiles = profile?.is_vip ? 10 : 3;
    const remainingSlots = maxFiles - uploadedFiles.length;

    if (remainingSlots <= 0) {
      toast({
        title: "上傳限制",
        description: `今日上傳額度已滿（${maxFiles} 張）`,
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
      toast({
        title: "請先登入",
        description: "您需要登入才能上傳作品",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: "請選擇照片",
        description: "至少需要上傳一張照片",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "請輸入標題",
        description: "作品標題為必填",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "請選擇拍攝類型",
        description: "請選擇拍攝裝備類型",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      for (const uploadedFile of uploadedFiles) {
        // Resize image before upload
        const resizedImage = await resizeImage(uploadedFile.file);
        const thumbnail = await createThumbnail(uploadedFile.file);
        
        const timestamp = Date.now();
        const fileName = `${user.id}/${timestamp}_${uploadedFile.id}.jpg`;
        const thumbFileName = `${user.id}/${timestamp}_${uploadedFile.id}_thumb.jpg`;

        // Upload resized main image
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, resizedImage.blob, {
            contentType: 'image/jpeg',
          });

        if (uploadError) throw uploadError;

        // Upload thumbnail
        const { error: thumbError } = await supabase.storage
          .from('photos')
          .upload(thumbFileName, thumbnail.blob, {
            contentType: 'image/jpeg',
          });

        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);

        const { data: { publicUrl: thumbUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(thumbFileName);

        const { data: photoData, error: insertError } = await supabase
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

        // Save tags for photo
        if (customTags.length > 0 && photoData) {
          for (const tagName of customTags) {
            const { data: existingTag } = await supabase
              .from("tags" as any)
              .select("id")
              .eq("name", tagName)
              .maybeSingle();
            let tagId: string;
            if (existingTag) {
              tagId = (existingTag as any).id;
            } else {
              const { data: newTag } = await supabase
                .from("tags" as any)
                .insert({ name: tagName, slug: tagName.toLowerCase().replace(/\s+/g, "-") } as any)
                .select("id")
                .single();
              tagId = (newTag as any).id;
            }
            await supabase.from("content_tags" as any).insert({
              tag_id: tagId, content_id: photoData.id, content_type: "photo",
            } as any);
          }
        }
      }

      toast({
        title: "上傳成功！",
        description: `成功上傳 ${uploadedFiles.length} 張照片`,
      });

      // Clean up previews
      uploadedFiles.forEach(f => URL.revokeObjectURL(f.preview));
      
      navigate('/gallery');
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "上傳失敗",
        description: "請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
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
              支援 JPG、PNG、WebP 格式，單檔最大 10MB
            </p>
            <Button
              variant="gold"
              onClick={() => fileInputRef.current?.click()}
            >
              選擇檔案
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <p className="text-sm text-muted-foreground mt-4">
              今日可上傳：{(profile?.is_vip ? 10 : 3) - (profile?.daily_upload_count || 0)} 張
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Grid */}
      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="relative group aspect-square rounded-lg overflow-hidden">
              <img
                src={file.preview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
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
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="為您的作品取個標題"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">說明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述一下這張照片的故事..."
                rows={3}
              />
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
                  onClick={() => {
                    setCategory('phone');
                    setBrand('');
                  }}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  手機
                </Button>
                <Button
                  type="button"
                  variant={category === 'camera' ? 'gold' : 'outline'}
                  className="flex-1"
                  onClick={() => {
                    setCategory('camera');
                    setBrand('');
                  }}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  相機
                </Button>
              </div>
            </div>

            {category && (
              <div className="space-y-2">
                <Label>品牌</Label>
                <Select value={brand} onValueChange={setBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="選擇品牌" />
                  </SelectTrigger>
                  <SelectContent>
                    {(category === 'phone' ? phoneBrands : cameraBrands).map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {category === 'phone' && (
              <div className="space-y-2">
                <Label htmlFor="phoneModel">型號</Label>
                <Input
                  id="phoneModel"
                  value={phoneModel}
                  onChange={(e) => setPhoneModel(e.target.value)}
                  placeholder="例如：iPhone 15 Pro Max"
                />
              </div>
            )}

            {category === 'camera' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="cameraBody">機身</Label>
                  <Input
                    id="cameraBody"
                    value={cameraBody}
                    onChange={(e) => setCameraBody(e.target.value)}
                    placeholder="例如：Sony A7IV"
                  />
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

            <div className="space-y-2">
              <Label>標籤</Label>
              <TagInput tags={customTags} onChange={setCustomTags} placeholder="輸入標籤後按 Enter，例如：風景、夜拍" />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          variant="gold"
          size="lg"
          className="w-full"
          disabled={isUploading || uploadedFiles.length === 0}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              上傳中...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-5 w-5" />
              發布作品
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
