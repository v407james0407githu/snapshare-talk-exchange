import { useEffect } from "react";
import { usePublicSystemSettings } from "@/hooks/usePublicSystemSettings";

function withCacheBust(url: string) {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(url)}`;
}

export function DynamicMeta() {
  const { get, siteName } = usePublicSystemSettings();

  const title = get("seo_title", siteName || "愛屁543論壇");
  const description = get("seo_description", "分享攝影作品、交流攝影技巧、買賣二手器材");
  const favicon = get("site_favicon_url", "");

  useEffect(() => {
    if (title) {
      document.title = title;
      document.querySelector('meta[name="author"]')?.setAttribute("content", siteName || title);
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    }
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", description);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    }
    if (favicon) {
      const faviconHref = withCacheBust(favicon);
      const faviconType = favicon.endsWith(".svg") ? "image/svg+xml" : "image/png";
      const linkSpecs = [
        { selector: 'link[rel="icon"]', rel: "icon", type: faviconType },
        { selector: 'link[rel="shortcut icon"]', rel: "shortcut icon", type: faviconType },
        { selector: 'link[rel="apple-touch-icon"]', rel: "apple-touch-icon" },
      ];

      linkSpecs.forEach(({ selector, rel, type }) => {
        let link = document.querySelector(selector) as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.rel = rel;
          document.head.appendChild(link);
        }
        link.href = faviconHref;
        if (type) {
          link.type = type;
        } else {
          link.removeAttribute("type");
        }
      });
    }
  }, [title, description, favicon, siteName]);

  return null;
}
