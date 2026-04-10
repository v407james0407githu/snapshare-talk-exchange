import { useQuery } from "@tanstack/react-query";
import { readBootstrapCache, writeBootstrapCache } from "@/lib/bootstrapCache";
import { getPublicSupabase } from "@/lib/publicSupabase";

interface SystemSetting {
  setting_key: string;
  setting_value: string;
}

const PUBLIC_SETTING_KEYS = [
  "forum_enabled",
  "marketplace_enabled",
  "registration_enabled",
  "site_name",
  "site_logo_url",
  "site_description",
  "site_favicon_url",
  "seo_title",
  "seo_description",
  "social_facebook",
  "social_instagram",
  "social_twitter",
  "social_youtube",
  "footer_social_enabled",
  "footer_about_enabled",
  "footer_about_url",
  "footer_contact_url",
  "footer_privacy_url",
  "footer_terms_url",
  "footer_copyright",
  "footer_community_enabled",
  "footer_community_title",
  "footer_community_label_1",
  "footer_community_url_1",
  "footer_community_label_2",
  "footer_community_url_2",
  "footer_community_label_3",
  "footer_community_url_3",
  "footer_community_label_4",
  "footer_community_url_4",
  "footer_photo_enabled",
  "footer_photo_title",
  "footer_photo_label_1",
  "footer_photo_url_1",
  "footer_photo_label_2",
  "footer_photo_url_2",
  "footer_photo_label_3",
  "footer_photo_url_3",
  "footer_photo_label_4",
  "footer_photo_url_4",
  "footer_section3_enabled",
  "footer_section3_title",
  "footer_section3_label_1",
  "footer_section3_url_1",
  "footer_section3_label_2",
  "footer_section3_url_2",
  "footer_section3_label_3",
  "footer_section3_url_3",
  "footer_section3_label_4",
  "footer_section3_url_4",
  "footer_section4_enabled",
  "footer_section4_title",
  "footer_section4_label_1",
  "footer_section4_url_1",
  "footer_section4_label_2",
  "footer_section4_url_2",
  "footer_section4_label_3",
  "footer_section4_url_3",
  "footer_section4_label_4",
  "footer_section4_url_4",
  "footer_section5_enabled",
  "footer_section5_title",
  "footer_section5_label_1",
  "footer_section5_url_1",
  "footer_section5_label_2",
  "footer_section5_url_2",
  "footer_section5_label_3",
  "footer_section5_url_3",
  "footer_section5_label_4",
  "footer_section5_url_4",
];

export function usePublicSystemSettings() {
  const initialSettings = readBootstrapCache<SystemSetting[]>("public-system-settings") ?? [];
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["system-settings-public-light"],
    queryFn: async () => {
      const supabase = await getPublicSupabase();
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", PUBLIC_SETTING_KEYS);

      if (error) throw error;
      const result = (data ?? []) as SystemSetting[];
      writeBootstrapCache("public-system-settings", result);
      return result;
    },
    initialData: initialSettings,
    staleTime: 10 * 60 * 1000,
  });

  const get = (key: string, fallback = "") =>
    settings.find((s) => s.setting_key === key)?.setting_value ?? fallback;

  const getBool = (key: string, fallback = true) => {
    const val = settings.find((s) => s.setting_key === key)?.setting_value;
    return val !== undefined ? val === "true" : fallback;
  };

  const getNum = (key: string, fallback = 0) => {
    const val = settings.find((s) => s.setting_key === key)?.setting_value;
    return val !== undefined ? Number(val) : fallback;
  };

  return {
    settings,
    isLoading,
    get,
    getBool,
    getNum,
    galleryEnabled: true,
    forumEnabled: getBool("forum_enabled", true),
    marketplaceEnabled: getBool("marketplace_enabled", true),
    registrationEnabled: getBool("registration_enabled", true),
    siteName: get("site_name", "愛屁543論壇"),
    siteFavicon: get("site_favicon_url", ""),
    siteLogo: get("site_logo_url", ""),
  };
}
