import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { usePublicSystemSettings } from "@/hooks/usePublicSystemSettings";

const SITE_URL = "https://ip543.com";

function withCacheBust(url: string) {
  if (!url) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(url)}`;
}

function upsertMeta(selector: string, attrs: { name?: string; property?: string; content: string }) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    if (attrs.name) el.name = attrs.name;
    if (attrs.property) el.setAttribute("property", attrs.property);
    document.head.appendChild(el);
  }
  el.content = attrs.content;
}

function upsertCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function DynamicMeta() {
  const location = useLocation();
  const { get, siteName } = usePublicSystemSettings();

  const title = get("seo_title", siteName || "愛屁543論壇");
  const description = get("seo_description", "分享攝影作品、交流攝影技巧、買賣二手器材");
  const favicon = get("site_favicon_url", "");

  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${location.pathname === "/" ? "/" : location.pathname}`;
    upsertCanonical(canonicalUrl);
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });

    if (title) {
      document.title = title;
      upsertMeta('meta[name="author"]', { name: "author", content: siteName || title });
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    }
    if (description) {
      upsertMeta('meta[name="description"]', { name: "description", content: description });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
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
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: faviconHref });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: faviconHref });
    }
  }, [title, description, favicon, siteName, location.pathname]);

  return null;
}
