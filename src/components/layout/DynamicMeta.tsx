import { useEffect } from "react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export function DynamicMeta() {
  const { get } = useSystemSettings();

  const title = get("seo_title", "光影社群 - 攝影愛好者的交流平台");
  const description = get("seo_description", "分享攝影作品、交流攝影技巧、買賣二手器材");

  useEffect(() => {
    if (title) {
      document.title = title;
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", title);
    }
    if (description) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", description);
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
    }
  }, [title, description]);

  return null;
}
