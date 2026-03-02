import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { resizeImage } from '@/lib/imageResize';

// Each image can be either a pending local file or an already-uploaded URL
export interface ImageItem {
  id: string;
  previewUrl: string;  // objectURL for local, or remote URL for uploaded
  file?: File;         // present if not yet uploaded
  uploadedUrl?: string; // present if already on server
}

interface ForumImageUploadProps {
  items: ImageItem[];
  onItemsChange: (items: ImageItem[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

let _idCounter = 0;
function genId() { return `img_${Date.now()}_${++_idCounter}`; }

/** Convert File[] to ImageItem[] with local preview URLs */
export function filesToItems(files: File[]): ImageItem[] {
  return files
    .filter(f => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name} 不是圖片檔案，已跳過`); return false; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} 超過 10MB，已跳過`); return false; }
      return true;
    })
    .map(file => ({
      id: genId(),
      previewUrl: URL.createObjectURL(file),
      file,
    }));
}

/** Convert already-uploaded URLs to ImageItem[] */
export function urlsToItems(urls: string[]): ImageItem[] {
  return urls.map(url => ({
    id: genId(),
    previewUrl: url,
    uploadedUrl: url,
  }));
}

/** Upload all pending files and return final URL list. Throws on failure. */
export async function uploadPendingItems(items: ImageItem[]): Promise<string[]> {
  const urls: string[] = [];
  for (const item of items) {
    if (item.uploadedUrl) {
      urls.push(item.uploadedUrl);
    } else if (item.file) {
      const resized = await resizeImage(item.file, 1920, 0.85);
      const path = `forum/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage
        .from('photos')
        .upload(path, resized.blob, { contentType: 'image/jpeg' });
      if (error) throw error;
      const { data } = supabase.storage.from('photos').getPublicUrl(path);
      urls.push(data.publicUrl);
    }
  }
  return urls;
}

export function ForumImageUpload({ items, onItemsChange, disabled, maxImages = 5 }: ForumImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up objectURLs on unmount
  useEffect(() => {
    return () => {
      items.forEach(item => {
        if (item.file) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []); // only on unmount

  const addFiles = useCallback((files: File[]) => {
    const remaining = maxImages - items.length;
    if (remaining <= 0) {
      toast.error(`最多只能上傳 ${maxImages} 張圖片`);
      return;
    }
    const newItems = filesToItems(files).slice(0, remaining);
    if (files.length > remaining) {
      toast.info(`已選取 ${files.length} 張，僅保留前 ${remaining} 張`);
    }
    if (newItems.length > 0) {
      onItemsChange([...items, ...newItems]);
    }
  }, [items, maxImages, onItemsChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) addFiles(files);
  }, [disabled, addFiles]);

  const removeItem = (id: string) => {
    const item = items.find(i => i.id === id);
    if (item?.file) URL.revokeObjectURL(item.previewUrl);
    onItemsChange(items.filter(i => i.id !== id));
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInput}
        disabled={disabled}
      />

      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {items.map((item) => (
            <div key={item.id} className="relative group">
              <img
                src={item.previewUrl}
                alt="預覽圖片"
                className="h-24 w-24 rounded-lg border border-border object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeItem(item.id)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
              {item.file && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white text-center rounded-b-lg py-0.5">
                  待上傳
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {items.length < maxImages && (
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
          <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <ImagePlus className="h-5 w-5" />
            <span>點擊或拖拉圖片到此處上傳</span>
            <span className="text-xs">({items.length}/{maxImages})</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for textarea drag-drop forwarding (now adds local previews)
export function useTextareaDrop(
  addFiles: (files: File[]) => void,
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
      if (files.length > 0) addFiles(files);
    },
  };

  return { dragOver, handlers };
}
