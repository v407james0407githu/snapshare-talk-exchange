import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resizeImage } from '@/lib/imageResize';

interface ForumImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ForumImageUpload({ imageUrl, onImageChange, disabled }: ForumImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片檔案');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('圖片大小不能超過 10MB');
      return;
    }

    setUploading(true);
    try {
      const resized = await resizeImage(file, 1920, 0.85);
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `forum/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, resized.blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path);
      onImageChange(urlData.publicUrl);
      toast.success('圖片上傳成功');
    } catch (err: any) {
      toast.error('上傳失敗：' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        disabled={disabled || uploading}
      />
      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt="上傳圖片"
            className="max-h-48 rounded-lg border border-border object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={() => onImageChange(null)}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
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
            <><ImagePlus className="h-4 w-4" />附加圖片</>
          )}
        </Button>
      )}
    </div>
  );
}
