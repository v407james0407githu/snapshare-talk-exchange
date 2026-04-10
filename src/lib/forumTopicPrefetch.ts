import { supabase } from "@/integrations/supabase/client";

type PublicProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type TopicPreview = {
  id: string;
  title: string;
  content: string;
  category: string;
  brand: string | null;
  user_id: string;
  reply_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  last_reply_at: string | null;
  category_id: string | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  tags?: string[];
};

type ForumReply = {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  profiles?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

type PrefetchedForumTopicBundle = {
  topic: TopicPreview | null;
  replies: ForumReply[] | null;
};

const bundleCache = new Map<string, PrefetchedForumTopicBundle>();
const pendingCache = new Map<string, Promise<PrefetchedForumTopicBundle>>();
const prefetchedRoutes = new Set<string>();

function normalizeProfile(profile: PublicProfile | null | undefined, userId: string) {
  const displayName = profile?.display_name?.trim();
  const username = profile?.username?.trim();

  return {
    username: username || displayName || `會員 ${userId.slice(0, 8)}`,
    display_name: displayName || null,
    avatar_url: profile?.avatar_url || null,
  };
}

function preloadImage(url: string | null | undefined) {
  if (!url || typeof Image === "undefined") return;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
}

function resolveForumImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }

  const cleaned = url
    .replace(/^\/+/, "")
    .replace(/^storage\/v1\/object\/public\/photos\//, "")
    .replace(/^photos\//, "");

  if (!cleaned) return null;
  const { data } = supabase.storage.from("photos").getPublicUrl(cleaned);
  return data.publicUrl;
}

function preloadForumTopicRoute() {
  if (prefetchedRoutes.has("/forums/topic")) return;
  prefetchedRoutes.add("/forums/topic");
  void import("@/pages/ForumTopic");
}

export function readPrefetchedForumTopic(topicId: string) {
  return bundleCache.get(topicId) || null;
}

export async function prefetchForumTopicBundle(
  topicId: string,
  preview?: Partial<TopicPreview>,
): Promise<PrefetchedForumTopicBundle> {
  preloadForumTopicRoute();

  if (bundleCache.has(topicId)) return bundleCache.get(topicId)!;
  if (pendingCache.has(topicId)) return pendingCache.get(topicId)!;

  const task = (async () => {
    const [{ data: topicData, error: topicError }, { data: repliesData, error: repliesError }] =
      await Promise.all([
        supabase
          .from("forum_topics")
          .select(
            "id, title, content, category, brand, user_id, reply_count, view_count, is_pinned, is_locked, created_at, last_reply_at, category_id, image_url, image_urls",
          )
          .eq("id", topicId)
          .single(),
        supabase
          .from("forum_replies")
          .select("id, content, user_id, created_at, image_url, image_urls")
          .eq("topic_id", topicId)
          .order("created_at", { ascending: true }),
      ]);

    if (topicError) throw topicError;
    if (repliesError) throw repliesError;

    const userIds = [...new Set([topicData.user_id, ...(repliesData || []).map((reply) => reply.user_id)])];
    const { data: publicProfiles, error: publicProfilesError } = userIds.length
      ? await supabase.rpc("get_public_profiles")
      : { data: [], error: null };

    if (publicProfilesError) throw publicProfilesError;

    const profilesMap = new Map(
      (((publicProfiles as PublicProfile[] | null) || []).filter((profile) => userIds.includes(profile.user_id))).map(
        (profile) => [profile.user_id, normalizeProfile(profile, profile.user_id)],
      ),
    );

    const topic: TopicPreview = {
      ...preview,
      ...topicData,
      image_url: resolveForumImageUrl(topicData.image_url || null),
      image_urls: (topicData.image_urls || []).map(resolveForumImageUrl).filter(Boolean) as string[],
      profiles: profilesMap.get(topicData.user_id) || normalizeProfile(null, topicData.user_id),
    };

    const replies: ForumReply[] = ((repliesData || []) as ForumReply[]).map((reply) => ({
      ...reply,
      image_url: resolveForumImageUrl(reply.image_url || null),
      image_urls: (reply.image_urls || []).map(resolveForumImageUrl).filter(Boolean) as string[],
      profiles: profilesMap.get(reply.user_id) || normalizeProfile(null, reply.user_id),
    }));

    preloadImage(topic.image_url || null);
    (topic.image_urls || []).forEach((url) => preloadImage(url));
    replies.forEach((reply) => {
      preloadImage(reply.image_url || null);
      (reply.image_urls || []).forEach((url) => preloadImage(url));
    });

    const bundle = { topic, replies };
    bundleCache.set(topicId, bundle);
    pendingCache.delete(topicId);
    return bundle;
  })();

  pendingCache.set(topicId, task);
  return task;
}
