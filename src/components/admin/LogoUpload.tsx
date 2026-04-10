import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { resizeImage, getOutputExtension, getOutputMimeType, compressToMaxSize } from "@/lib/imageResize";

interface LogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  uploadLabel?: string;
  hint?: string;
  maxBytes?: number;
  preserveOriginalFormat?: boolean;
  pathPrefix?: string;
}

function hasSupportedImageExtension(fileName: string) {
  return /\.(png|jpe?g|webp|gif|svg|ico)$/i.test(fileName);
}

function formatMaxSize(bytes: number) {
  if (bytes % (1024 * 1024) === 0) {
    return `${bytes / (1024 * 1024)}MB`;
  }
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

function createAuthedStorageClient(accessToken: string) {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function LogoUpload({
  value,
  onChange,
  placeholder = "尚未設定 Logo，將顯示預設文字 Logo",
  uploadLabel = "上傳新 Logo",
  hint = "最大 1MB，上傳後自動壓縮",
  maxBytes = 1 * 1024 * 1024,
  preserveOriginalFormat = false,
  pathPrefix = "content/logos",
}: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImageType = file.type.startsWith("image/");
    const hasSupportedExt = hasSupportedImageExtension(file.name);

    if (!isImageType && !hasSupportedExt) {
      toast.error("請上傳圖片檔案");
      return;
    }

    if (file.size > maxBytes) {
      toast.error(`圖片大小不能超過 ${formatMaxSize(maxBytes)}`);
      return;
    }

    setUploading(true);
    try {
      let session = (await supabase.auth.getSession()).data.session;

      if (!session) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error) throw new Error("登入狀態已失效，請重新登入後再上傳");
        session = data.session;
      }

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("登入狀態已失效，請重新登入後再上傳");
      }

      const authedStorage = createAuthedStorageClient(accessToken).storage;

      const shouldKeepOriginal =
        preserveOriginalFormat || file.type === "image/svg+xml" || /\.svg$/i.test(file.name) || /\.ico$/i.test(file.name);

      let uploadBlob: Blob;
      let mime: string;
      let ext: string;

      if (shouldKeepOriginal) {
        uploadBlob = file;
        mime = file.type || (/\.svg$/i.test(file.name) ? "image/svg+xml" : /\.ico$/i.test(file.name) ? "image/x-icon" : "application/octet-stream");
        ext = file.name.split(".").pop()?.toLowerCase() || "png";
      } else {
        // Compress & convert to WebP before uploading, then compress to <=50KB
        const resized = await resizeImage(file, 1200, 1200, 0.80);
        uploadBlob = await compressToMaxSize(resized.blob, 50 * 1024);
        ext = getOutputExtension();
        mime = getOutputMimeType();
      }

      const fileName = `site-logo-${Date.now()}.${ext}`;
      const filePath = `${pathPrefix}/${fileName}`;

      const { error: uploadError } = await authedStorage
        .from("photos")
        .upload(filePath, uploadBlob, { contentType: mime, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = authedStorage
        .from("photos")
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
      toast.success("Logo 上傳成功");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? `上傳失敗：${err.message}` : "上傳失敗，請稍後再試");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative inline-block rounded-lg border border-border bg-muted/30 p-3">
          <img
            src={value}
            alt="Site Logo"
            className="max-h-20 max-w-[200px] object-contain"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 hover:bg-destructive/80 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border p-4 text-muted-foreground">
          <ImageIcon className="h-8 w-8" />
          <span className="text-sm">{placeholder}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {uploading ? "上傳中..." : uploadLabel}
        </Button>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}
