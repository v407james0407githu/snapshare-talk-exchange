interface Env {
  ASSETS: Fetcher;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface PhotoMeta {
  title: string;
  description: string | null;
  image_url: string;
}

const SITE_URL = "https://ip543.com";
const SITE_NAME = "愛屁543論壇";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getPhotoId(pathname: string) {
  const match = pathname.match(/^\/gallery\/([^/?#]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildMetaTags(photo: PhotoMeta, canonicalUrl: string) {
  const title = `${photo.title} - ${SITE_NAME}`;
  const description = photo.description?.trim() || `由攝影師拍攝的作品：${photo.title}`;

  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta property="og:title" content="${escapeHtml(photo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeHtml(photo.image_url)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(photo.image_url)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
  ].join("\n");
}

async function fetchPhotoMeta(env: Env, photoId: string) {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) return null;

  const endpoint = new URL("/rest/v1/photos", env.VITE_SUPABASE_URL);
  endpoint.searchParams.set("select", "title,description,image_url");
  endpoint.searchParams.set("id", `eq.${photoId}`);
  endpoint.searchParams.set("is_hidden", "eq.false");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: {
      apikey: env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) return null;

  const photos = (await response.json()) as PhotoMeta[];
  return photos[0] ?? null;
}

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    const photoId = getPhotoId(url.pathname);

    if (!photoId || !assetResponse.headers.get("content-type")?.includes("text/html")) {
      return assetResponse;
    }

    const photo = await fetchPhotoMeta(env, photoId);
    if (!photo) return assetResponse;

    const canonicalUrl = `${SITE_URL}/gallery/${encodeURIComponent(photoId)}`;
    const metaTags = buildMetaTags(photo, canonicalUrl);

    return new HTMLRewriter()
      .on("head", {
        element(element) {
          element.prepend(metaTags, { html: true });
        },
      })
      .transform(assetResponse);
  },
} satisfies ExportedHandler<Env>;
