const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const WEBP_QUALITY = 0.82;

export interface ResizedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
}

/** Check if browser supports WebP encoding */
function supportsWebP(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

const USE_WEBP = supportsWebP();
const OUTPUT_MIME = USE_WEBP ? "image/webp" : "image/jpeg";
const OUTPUT_EXT = USE_WEBP ? "webp" : "jpg";

/** Get the preferred output file extension */
export function getOutputExtension(): string {
  return OUTPUT_EXT;
}

/** Get the preferred output MIME type */
export function getOutputMimeType(): string {
  return OUTPUT_MIME;
}

/**
 * Resize an image file to fit within max dimensions while maintaining aspect ratio.
 * Outputs WebP when supported, JPEG as fallback.
 */
export async function resizeImage(
  file: File,
  maxWidth: number = MAX_WIDTH,
  maxHeight: number = MAX_HEIGHT,
  quality: number = WEBP_QUALITY
): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Use better quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Draw the resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob — prefer WebP for smaller file size
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height, mimeType: OUTPUT_MIME });
          } else {
            reject(new Error("Could not create blob from canvas"));
          }
        },
        OUTPUT_MIME,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };

    // Load the image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Create a thumbnail from an image file
 */
export async function createThumbnail(
  file: File,
  size: number = 400
): Promise<ResizedImage> {
  return resizeImage(file, size, size, 0.75);
}

/**
 * Check if image needs resizing
 */
export function needsResizing(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.width > MAX_WIDTH || img.height > MAX_HEIGHT);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      resolve(false);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
}
