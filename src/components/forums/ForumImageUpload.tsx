import { useState, useRef, useCallback } from 'react';
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
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    const remaining = maxImages - imageUrls.length;
    if (remaining <= 0) {
      toast.error(`最多只能上傳 ${maxImages} 張圖片`);
      return;
    }

    const validFiles = files
      .filter(f => {
        if (!f.type.startsWith('image/')) { toast.error(`${f.name} 不是圖片檔案，已跳過`); return false; }
        if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} 超過 10MB，已跳過`); return false; }
        return true;
      })
      .slice(0, remaining);

    if (files.length > remaining) {
      toast.info(`已選取 ${files.length} 張，僅上傳前 ${remaining} 張`);
    }

    if (!validFiles.length) return;

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of validFiles) {
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
  }, [imageUrls, maxImages, onImagesChange]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    uploadFiles(Array.from(e.target.files || []));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !uploading) setDragOver(true);
  }, [disabled, uploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled || uploading) return;

    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) {
      uploadFiles(files);
    }
  }, [disabled, uploading, uploadFiles]);

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
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />上傳中...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
              <ImagePlus className="h-5 w-5" />
              <span>點擊或拖拉圖片到此處上傳</span>
              <span className="text-xs">({imageUrls.length}/{maxImages})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Hook for textarea drag-drop forwarding
export function useTextareaDrop(
  uploadFiles: (files: File[]) => void,
  disabled?: boolean
) {
  const [dragOver, setDragOver] = useState(false);

  const handlers = {
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setDragOver(true);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) uploadFiles(files);
    },
  };

  return { dragOver, handlers };
}
