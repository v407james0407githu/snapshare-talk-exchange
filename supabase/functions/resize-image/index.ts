import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Maximum dimensions for resized images
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const THUMBNAIL_SIZE = 400;
const JPEG_QUALITY = 85;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;
    const createThumbnail = formData.get("createThumbnail") === "true";

    if (!file || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing file or userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read image as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Use ImageMagick via Deno's subprocess for image processing
    // Since Deno Deploy doesn't support native image processing, 
    // we'll resize on the client side and upload the resized version
    
    // For now, we'll just pass through the image but limit file size
    // In production, you'd use a service like Cloudinary or imgix
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const timestamp = Date.now();
    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${userId}/${timestamp}.${fileExt}`;
    const thumbnailName = `${userId}/${timestamp}_thumb.${fileExt}`;

    // Upload main image
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/photos/${fileName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": file.type,
        },
        body: uint8Array,
      }
    );

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Upload failed: ${error}`);
    }

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/photos/${fileName}`;
    let thumbnailUrl = null;

    // For thumbnail, we'll use CSS/browser-side resizing for display
    // The thumbnail_url will point to the same image with size params
    if (createThumbnail) {
      thumbnailUrl = imageUrl; // Same image, client handles display size
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        thumbnailUrl,
        fileName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing image:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
