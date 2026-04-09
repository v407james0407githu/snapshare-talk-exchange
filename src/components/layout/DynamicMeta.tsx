import { useEffect } from "react";
import { usePublicSystemSettings } from "@/hooks/usePublicSystemSettings";

export function DynamicMeta() {
  const { get } = usePublicSystemSettings();

  const title = get("seo_title", "愛屁543論壇 - 攝影愛好者的交流平台");
  const description = get("seo_description", "分享攝影作品、交流攝影技巧、買賣二手器材");
  const favicon = get("site_favicon_url", "");

  useEffect(() => {
    if (title) {
      document.title = title;
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    }
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", description);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    }
    if (favicon) {
      let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = favicon;
      link.type = favicon.endsWith(".svg") ? "image/svg+xml" : "image/png";
    }
  }, [title, description, favicon]);

  return null;
}
