import { useQuery } from "@tanstack/react-query";
import { readBootstrapCache, writeBootstrapCache } from "@/lib/bootstrapCache";
import { getPublicSupabase } from "@/lib/publicSupabase";
import { useDeferredPublicQuery } from "@/hooks/useDeferredPublicQuery";

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
  const initialContents = readBootstrapCache<SiteContent[]>("site-content") ?? [];
  const enabled = useDeferredPublicQuery(350);
  const { data: contents, isLoading } = useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const supabase = await getPublicSupabase();
      const { data, error } = await supabase
        .from("site_content" as any)
        .select("id, section_key, section_label, content_type, content_value, content_meta, sort_order, is_active, updated_at")
        .eq("is_active", true);
      if (error) throw error;
      const result = (data ?? []) as unknown as SiteContent[];
      writeBootstrapCache("site-content", result);
      return result;
    },
    initialData: initialContents,
    enabled,
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  const get = (key: string, fallback = "") => {
    return contents?.find((c) => c.section_key === key)?.content_value || fallback;
  };

  const getMeta = (key: string) => {
    return contents?.find((c) => c.section_key === key)?.content_meta || {};
  };

  return { contents, isLoading, get, getMeta };
}
