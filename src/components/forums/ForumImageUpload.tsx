import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resizeImage } from '@/lib/imageResize';

interface ForumImageUploadProps {
  imageUrls: string[];
  onImagesChange: (urls: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function ForumImageUpload({ imageUrls, onImagesChange, disabled, maxImages = 5 }: ForumImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = maxImages - imageUrls.length;
    if (remaining <= 0) {
      toast.error(`最多只能上傳 ${maxImages} 張圖片`);
      return;
    }

    const filesToUpload = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`已選取 ${files.length} 張，僅上傳前 ${remaining} 張`);
    }

    for (const file of filesToUpload) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} 不是圖片檔案，已跳過`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超過 10MB，已跳過`);
        continue;
      }
    }

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) continue;

        const resized = await resizeImage(file, 1920, 0.85);
        const path = `forum/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(path, resized.blob, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }

      onImagesChange([...imageUrls, ...newUrls]);
      if (newUrls.length > 0) toast.success(`已上傳 ${newUrls.length} 張圖片`);
    } catch (err: any) {
      toast.error('上傳失敗：' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    onImagesChange(imageUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
        disabled={disabled || uploading}
      />

      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt={`上傳圖片 ${i + 1}`}
                className="h-24 w-24 rounded-lg border border-border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(i)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {imageUrls.length < maxImages && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 animate-spin" />上傳中...</>
          ) : (
            <><ImagePlus className="h-4 w-4" />附加圖片 ({imageUrls.length}/{maxImages})</>
          )}
        </Button>
      )}
    </div>
  );
}
