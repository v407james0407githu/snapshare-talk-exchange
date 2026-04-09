import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
};

function normalizePublicName(profile?: PublicProfile, userId?: string) {
  const displayName = profile?.display_name?.trim();
  if (displayName) return displayName;

  const username = profile?.username?.trim();
  if (username) return username;

  return userId ? `會員 ${userId.slice(0, 8)}` : "愛屁543會員";
}

type MarketplaceListing = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  brand: string | null;
  model: string | null;
  condition: string;
  price: number;
  currency: string;
  location: string | null;
  verification_image_url: string;
  additional_images: string[] | null;
  is_sold: boolean;
  is_verified: boolean;
  view_count: number;
  created_at: string;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    is_verified: boolean;
  };
};

const prefetchedRoutes = new Set<string>();

export function preloadPublicRoute(href: string) {
  if (prefetchedRoutes.has(href)) return;
  prefetchedRoutes.add(href);

  if (href === "/forums") {
    void import("@/pages/Forums");
    return;
  }

  if (href === "/marketplace") {
    void import("@/pages/Marketplace");
    return;
  }

  if (href === "/gallery") {
    void import("@/pages/Gallery");
  }
}

async function fetchForumTopics() {
  const { data: topicsData, error } = await supabase
    .from("forum_topics")
    .select("id, title, content, category, brand, user_id, reply_count, view_count, is_pinned, is_locked, created_at, last_reply_at, category_id")
    .eq("is_hidden", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) throw error;

  const userIds = [...new Set((topicsData || []).map((topic) => topic.user_id))];
  const { data: profilesData, error: profilesError } = userIds.length
    ? await supabase.rpc("get_public_profiles")
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const profilesMap = new Map(
    ((profilesData as PublicProfile[] | null) || [])
      .filter((profile) => userIds.includes(profile.user_id))
      .map((profile) => [
        profile.user_id,
        {
          user_id: profile.user_id,
          username: profile.username?.trim() || normalizePublicName(profile, profile.user_id),
          display_name: profile.display_name?.trim() || null,
          avatar_url: profile.avatar_url,
        },
      ]),
  );

  const topicIds = (topicsData || []).map((topic) => topic.id);
  const { data: contentTags, error: contentTagsError } = topicIds.length
    ? await supabase
        .from("content_tags" as any)
        .select("content_id, tag_id")
        .eq("content_type", "forum_topic")
        .in("content_id", topicIds)
    : { data: [], error: null };

  if (contentTagsError) throw contentTagsError;

  const tagMap = new Map<string, string[]>();
  if (contentTags && (contentTags as any[]).length > 0) {
    const tagIds = [...new Set((contentTags as any[]).map((ct: any) => ct.tag_id))];
    const { data: tagsData, error: tagsError } = await supabase
      .from("tags" as any)
      .select("id, name")
      .in("id", tagIds);

    if (tagsError) throw tagsError;

    const tagNameMap = new Map((tagsData as any[] || []).map((tag: any) => [tag.id, tag.name]));
    for (const ct of contentTags as any[]) {
      const name = tagNameMap.get(ct.tag_id);
      if (name) {
        const existing = tagMap.get(ct.content_id) || [];
        existing.push(name);
        tagMap.set(ct.content_id, existing);
      }
    }
  }

  return (topicsData || []).map((topic) => ({
    ...topic,
    profiles: profilesMap.get(topic.user_id),
    tags: tagMap.get(topic.id) || [],
  }));
}

async function fetchForumStats() {
  const [{ count: topicCount }, { count: replyCount }, { count: userCount }] = await Promise.all([
    supabase.from("forum_topics").select("*", { count: "exact", head: true }),
    supabase.from("forum_replies").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
  ]);

  return { topics: topicCount || 0, replies: replyCount || 0, users: userCount || 0 };
}

async function fetchPopularTags() {
  const { data, error } = await supabase
    .from("tags" as any)
    .select("*")
    .order("usage_count", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data as any[] || []) as { id: string; name: string; usage_count: number }[];
}

export async function fetchMarketplaceListings(showSold: boolean) {
  let query = supabase
    .from("marketplace_listings")
    .select("id, user_id, title, description, category, brand, model, condition, price, currency, location, verification_image_url, additional_images, is_sold, is_verified, view_count, created_at")
    .eq("is_hidden", false);
  if (!showSold) query = query.eq("is_sold", false);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;

  const items = ((data || []) as MarketplaceListing[]).map((item) => ({ ...item }));
  const userIds = [...new Set(items.map((listing) => listing.user_id))];

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase.rpc("get_public_profiles");

    if (profilesError) throw profilesError;

    const profileMap = new Map(
      ((profiles as PublicProfile[] | null) || [])
        .filter((profile) => userIds.includes(profile.user_id))
        .map((profile) => [profile.user_id, profile]),
    );
    items.forEach((item) => {
      const profile = profileMap.get(item.user_id);
      item.profiles = {
        username: profile?.username?.trim() || normalizePublicName(profile, item.user_id),
        display_name: profile?.display_name?.trim() || null,
        avatar_url: profile?.avatar_url || null,
        is_verified: profile?.is_verified ?? false,
      };
    });
  }

  return items;
}

export function prefetchForumsData(queryClient: QueryClient) {
  preloadPublicRoute("/forums");
  void queryClient.prefetchQuery({
    queryKey: ["forum-topics"],
    queryFn: fetchForumTopics,
    staleTime: 1000 * 60 * 5,
  });
  void queryClient.prefetchQuery({
    queryKey: ["forum-stats"],
    queryFn: fetchForumStats,
    staleTime: 1000 * 60 * 5,
  });
  void queryClient.prefetchQuery({
    queryKey: ["popular-tags"],
    queryFn: fetchPopularTags,
    staleTime: 1000 * 60 * 10,
  });
}

export function prefetchMarketplaceData(queryClient: QueryClient, showSold = false) {
  preloadPublicRoute("/marketplace");
  void queryClient.prefetchQuery({
    queryKey: ["marketplace-listings", showSold],
    queryFn: () => fetchMarketplaceListings(showSold),
    staleTime: 1000 * 60 * 5,
  });
}
