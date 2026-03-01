import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SiteContent {
  id: string;
  section_key: string;
  section_label: string;
  content_type: string;
  content_value: string;
  content_meta: Record<string, any>;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

export function useSiteContent() {
  const { data: contents } = useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content" as any)
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as unknown as SiteContent[];
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const get = (key: string, fallback = "") => {
    return contents?.find((c) => c.section_key === key)?.content_value || fallback;
  };

  const getMeta = (key: string) => {
    return contents?.find((c) => c.section_key === key)?.content_meta || {};
  };

  return { contents, get, getMeta };
}
