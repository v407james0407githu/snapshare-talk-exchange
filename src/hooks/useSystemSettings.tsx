import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SystemSetting {
  setting_key: string;
  setting_value: string;
  setting_group: string;
}

export function useSystemSettings() {
  const { data: settings = [] } = useQuery({
    queryKey: ["system-settings-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value, setting_group");
      if (error) throw error;
      return data as SystemSetting[];
    },
    staleTime: 5 * 60 * 1000,
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
    get,
    getBool,
    getNum,
    forumEnabled: getBool("forum_enabled"),
    marketplaceEnabled: getBool("marketplace_enabled"),
    registrationEnabled: getBool("registration_enabled"),
    siteName: get("site_name", "光影社群"),
  };
}
