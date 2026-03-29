import type { QueryClient } from "@tanstack/react-query";
import { format, startOfDay, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE_PHOTOS = 50;
const PAGE_SIZE_FORUMS = 30;
const PAGE_SIZE_MARKETPLACE = 30;

const chunkLoaders: Record<string, Array<() => Promise<unknown>>> = {
  "/admin": [
    () => import("@/components/admin/AdminLayout"),
    () => import("@/pages/admin/AdminDashboard"),
  ],
  "/admin/homepage/sections": [() => import("@/pages/admin/HomepageSections")],
  "/admin/homepage/banners": [() => import("@/pages/admin/BannerManagement")],
  "/admin/homepage/copy": [() => import("@/pages/admin/HomepageCopy")],
  "/admin/content/pages": [() => import("@/pages/admin/ContentPages")],
  "/admin/content/seo": [() => import("@/pages/admin/SeoSettings")],
  "/admin/content/footer": [() => import("@/pages/admin/FooterSettings")],
  "/admin/community/photos": [() => import("@/pages/admin/PhotoManagement")],
  "/admin/community/forums": [() => import("@/pages/admin/CommunityForums")],
  "/admin/community/marketplace": [() => import("@/pages/admin/CommunityMarketplace")],
  "/admin/community/categories": [() => import("@/pages/admin/CategoryManagement")],
  "/admin/members": [() => import("@/pages/admin/UserManagement")],
  "/admin/members/roles": [() => import("@/pages/admin/MemberRoles")],
  "/admin/moderation/reports": [() => import("@/pages/admin/ReportManagement")],
  "/admin/analytics": [() => import("@/pages/admin/AnalyticsDashboard")],
  "/admin/settings": [() => import("@/pages/admin/SystemSettings")],
  "/admin/settings/features": [() => import("@/pages/admin/FeatureToggle")],
};

const loadedChunkKeys = new Set<string>();
let adminWarmupStarted = false;

function normalizeAdminHref(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    return url.pathname;
  } catch {
    return href;
  }
}

function loadChunk(pathname: string) {
  const key = normalizeAdminHref(pathname);
  if (loadedChunkKeys.has(key)) return;
  loadedChunkKeys.add(key);
  const loaders = chunkLoaders[key] ?? [];
  loaders.forEach((loader) => {
    loader().catch(() => {
      loadedChunkKeys.delete(key);
    });
  });
}

async function fetchDashboardKpis() {
  const todayStart = startOfDay(new Date());
  const todayISO = todayStart.toISOString();
  const [
    usersRes,
    photosRes,
    topicsRes,
    listingsRes,
    todayUsersRes,
    todayPhotosRes,
    todayTopicsRes,
    todayListingsRes,
    todayViewsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("photos").select("id", { count: "exact", head: true }),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }),
    supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("photos").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("marketplace_listings").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("page_views").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
  ]);

  [
    usersRes,
    photosRes,
    topicsRes,
    listingsRes,
    todayUsersRes,
    todayPhotosRes,
    todayTopicsRes,
    todayListingsRes,
    todayViewsRes,
  ].forEach((res) => {
    if (res.error) throw res.error;
  });

  return {
    totalUsers: usersRes.count || 0,
    totalPhotos: photosRes.count || 0,
    totalTopics: topicsRes.count || 0,
    totalListings: listingsRes.count || 0,
    todayUsers: todayUsersRes.count || 0,
    todayPhotos: todayPhotosRes.count || 0,
    todayTopics: todayTopicsRes.count || 0,
    todayListings: todayListingsRes.count || 0,
    todayViews: todayViewsRes.count || 0,
  };
}

async function fetchDashboardRecentReports() {
  const [pendingReportsRes, reportsRes] = await Promise.all([
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("reports").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
  ]);
  if (pendingReportsRes.error) throw pendingReportsRes.error;
  if (reportsRes.error) throw reportsRes.error;

  let recentReports: any[] = [];
  if (reportsRes.data?.length) {
    const reporterIds = [...new Set(reportsRes.data.map((report) => report.reporter_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, username")
      .in("user_id", reporterIds);
    if (profilesError) throw profilesError;
    const profileMap = new Map(profiles?.map((profile) => [profile.user_id, profile]) || []);
    recentReports = reportsRes.data.map((report) => ({
      ...report,
      reporter_profile: profileMap.get(report.reporter_id),
    }));
  }

  return {
    pendingReports: pendingReportsRes.count || 0,
    recentReports,
  };
}

async function fetchDashboardHealth() {
  const [settingsRes, pagesRes, bannerCountRes, homeSectionsRes] = await Promise.all([
    supabase
      .from("system_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["seo_title", "seo_description", "seo_og_image_url", "site_favicon_url", "gallery_enabled", "forum_enabled", "marketplace_enabled"]),
    supabase
      .from("site_content")
      .select("section_key, content_value")
      .in("section_key", ["about_content", "contact_content", "terms_content", "privacy_content"]),
    supabase.from("hero_banners").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("homepage_sections").select("section_key, is_visible"),
  ]);
  if (settingsRes.error) throw settingsRes.error;
  if (pagesRes.error) throw pagesRes.error;
  if (bannerCountRes.error) throw bannerCountRes.error;
  if (homeSectionsRes.error) throw homeSectionsRes.error;

  const settingMap = new Map((settingsRes.data || []).map((entry) => [entry.setting_key, entry.setting_value || ""]));
  const warnings: Array<{ text: string; link: string }> = [];
  const seoTitle = settingMap.get("seo_title") || "";
  const seoDesc = settingMap.get("seo_description") || "";
  const ogImage = settingMap.get("seo_og_image_url") || "";
  const favicon = settingMap.get("site_favicon_url") || "";
  if (!seoTitle || seoTitle.includes("IP543")) warnings.push({ text: "SEO 標題尚未自訂", link: "/admin/content/seo" });
  if (!seoDesc) warnings.push({ text: "SEO 描述尚未設定", link: "/admin/content/seo" });
  if (!ogImage) warnings.push({ text: "OG 社群分享圖片未設定", link: "/admin/content/seo" });
  if (!favicon) warnings.push({ text: "Favicon 尚未設定", link: "/admin/content/seo" });

  const pageLabels: Record<string, string> = {
    about_content: "關於我們",
    contact_content: "聯絡我們",
    terms_content: "使用條款",
    privacy_content: "隱私政策",
  };
  (pagesRes.data || []).forEach((page) => {
    if (!page.content_value || page.content_value.trim().length < 10) {
      warnings.push({ text: `${pageLabels[page.section_key] || page.section_key} 頁面內容為空`, link: "/admin/content/pages" });
    }
  });

  if (!bannerCountRes.count) warnings.push({ text: "首頁 Banner 尚未設定", link: "/admin/homepage/banners" });

  const galleryEnabled = (settingMap.get("gallery_enabled") || "true") === "true";
  const forumEnabled = (settingMap.get("forum_enabled") || "true") === "true";
  const marketplaceEnabled = (settingMap.get("marketplace_enabled") || "true") === "true";
  const visibleKeys = (homeSectionsRes.data || []).filter((section) => section.is_visible).map((section) => section.section_key);
  if (!galleryEnabled && visibleKeys.includes("featured_gallery")) warnings.push({ text: "作品功能已關閉，但首頁仍顯示「精選作品」區塊", link: "/admin/settings/features" });
  if (!forumEnabled && visibleKeys.includes("forum_preview")) warnings.push({ text: "討論功能已關閉，但首頁仍顯示「熱門討論」區塊", link: "/admin/settings/features" });
  if (!marketplaceEnabled && visibleKeys.includes("marketplace_preview")) warnings.push({ text: "市集功能已關閉，但首頁仍顯示「二手市集」區塊", link: "/admin/settings/features" });

  return warnings;
}

async function fetchAdminUsers() {
  const [profilesRes, rolesRes, emailsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, user_id, username, display_name, avatar_url, is_suspended, suspended_until, suspension_reason, is_vip, is_verified, warning_count, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id, role"),
    supabase.rpc("get_user_emails"),
  ]);
  if (profilesRes.error) throw profilesRes.error;
  if (rolesRes.error) throw rolesRes.error;
  if (emailsRes.error) throw emailsRes.error;

  const roleMap = new Map((rolesRes.data || []).map((role) => [role.user_id, role.role]));
  const emailMap = new Map(((emailsRes.data as { user_id: string; email: string }[] | null) || []).map((entry) => [entry.user_id, entry.email]));
  return (profilesRes.data || []).map((profile) => ({
    ...profile,
    role: roleMap.get(profile.user_id) || "user",
    email: emailMap.get(profile.user_id) || "",
  }));
}

async function fetchAdminReports(statusFilter = "pending", typeFilter = "all") {
  let query = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (typeFilter !== "all") query = query.eq("content_type", typeFilter);
  const { data, error } = await query;
  if (error) throw error;
  if (!data) return [];

  const ids = [...new Set([...data.map((report) => report.reporter_id), ...data.filter((report) => report.reported_user_id).map((report) => report.reported_user_id!)])];
  const profileMap = new Map<string, string>();
  if (ids.length) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", ids);
    if (profileError) throw profileError;
    profiles?.forEach((profile) => profileMap.set(profile.user_id, profile.display_name || profile.username));
  }

  return data.map((report) => ({
    ...report,
    reporter_name: profileMap.get(report.reporter_id) || "未知",
    reported_user_name: report.reported_user_id ? profileMap.get(report.reported_user_id) || "未知" : undefined,
  }));
}

async function fetchSystemSettings() {
  const { data, error } = await supabase.from("system_settings").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

async function fetchFeatureSettings() {
  const { data, error } = await supabase
    .from("system_settings")
    .select("*")
    .eq("setting_group", "features")
    .eq("setting_type", "boolean")
    .order("sort_order");
  if (error) throw error;
  return data || [];
}

async function fetchAdminSiteContent() {
  const { data, error } = await supabase.from("site_content").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

async function fetchHomepageSections() {
  const { data, error } = await supabase.from("homepage_sections").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

async function fetchBanners() {
  const { data, error } = await supabase.from("hero_banners").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

async function fetchCategories() {
  const { data, error } = await supabase.from("forum_categories").select("*").order("sort_order");
  if (error) throw error;
  return data || [];
}

async function fetchPhotosPage(search = "", filter = "all", page = 0) {
  const from = page * PAGE_SIZE_PHOTOS;
  const to = from + PAGE_SIZE_PHOTOS - 1;
  let query = supabase
    .from("photos")
    .select("id, title, image_url, thumbnail_url, user_id, category, brand, camera_body, phone_model, like_count, comment_count, view_count, average_rating, is_featured, is_hidden, featured_order, created_at")
    .order(filter === "featured" ? "featured_order" : "created_at", { ascending: false })
    .range(from, to);
  if (filter === "featured") query = query.eq("is_featured", true);
  if (filter === "hidden") query = query.eq("is_hidden", true);
  if (search) query = query.or(`title.ilike.%${search}%,brand.ilike.%${search}%,camera_body.ilike.%${search}%,phone_model.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;

  const userIds = [...new Set((data || []).map((photo) => photo.user_id))];
  const profileMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", userIds);
    if (profilesError) throw profilesError;
    profiles?.forEach((profile) => profileMap.set(profile.user_id, profile.display_name || profile.username));
  }

  return (data || []).map((photo) => ({
    ...photo,
    is_featured: photo.is_featured ?? false,
    is_hidden: photo.is_hidden ?? false,
    featured_order: photo.featured_order ?? 0,
    like_count: photo.like_count ?? 0,
    comment_count: photo.comment_count ?? 0,
    view_count: photo.view_count ?? 0,
    average_rating: photo.average_rating ?? 0,
    author_name: profileMap.get(photo.user_id) || "未知",
  }));
}

async function fetchTopicsPage(search = "", filter = "all", page = 0) {
  const from = page * PAGE_SIZE_FORUMS;
  let query = supabase.from("forum_topics").select("*").order("created_at", { ascending: false }).range(from, from + PAGE_SIZE_FORUMS - 1);
  if (filter === "pinned") query = query.eq("is_pinned", true);
  if (filter === "locked") query = query.eq("is_locked", true);
  if (filter === "hidden") query = query.eq("is_hidden", true);
  if (search) query = query.ilike("title", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;

  const userIds = [...new Set((data || []).map((topic: any) => topic.user_id))];
  const profileMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", userIds);
    if (profilesError) throw profilesError;
    profiles?.forEach((profile: any) => profileMap.set(profile.user_id, profile.display_name || profile.username));
  }

  return (data || []).map((topic: any) => ({
    ...topic,
    is_pinned: topic.is_pinned ?? false,
    is_locked: topic.is_locked ?? false,
    is_hidden: topic.is_hidden ?? false,
    reply_count: topic.reply_count ?? 0,
    view_count: topic.view_count ?? 0,
    author_name: profileMap.get(topic.user_id) || "未知",
  }));
}

async function fetchListingsPage(search = "", filter = "all", page = 0) {
  const from = page * PAGE_SIZE_MARKETPLACE;
  let query = supabase.from("marketplace_listings").select("*").order("created_at", { ascending: false }).range(from, from + PAGE_SIZE_MARKETPLACE - 1);
  if (filter === "pending") query = query.eq("is_verified", false).eq("is_sold", false);
  if (filter === "verified") query = query.eq("is_verified", true);
  if (filter === "sold") query = query.eq("is_sold", true);
  if (filter === "hidden") query = query.eq("is_hidden", true);
  if (search) query = query.ilike("title", `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;

  const userIds = [...new Set((data || []).map((listing: any) => listing.user_id))];
  const profileMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name")
      .in("user_id", userIds);
    if (profilesError) throw profilesError;
    profiles?.forEach((profile: any) => profileMap.set(profile.user_id, profile.display_name || profile.username));
  }

  return (data || []).map((listing: any) => ({
    ...listing,
    is_sold: listing.is_sold ?? false,
    is_hidden: listing.is_hidden ?? false,
    is_verified: listing.is_verified ?? false,
    view_count: listing.view_count ?? 0,
    currency: listing.currency ?? "TWD",
    author_name: profileMap.get(listing.user_id) || "未知",
  }));
}

async function fetchRoleUsers() {
  const [rolesRes, profilesRes] = await Promise.all([
    supabase.from("user_roles").select("user_id, role, created_at"),
    supabase.from("profiles").select("user_id, username, display_name, avatar_url"),
  ]);
  if (rolesRes.error) throw rolesRes.error;
  if (profilesRes.error) throw profilesRes.error;

  const profileMap = new Map((profilesRes.data || []).map((profile) => [profile.user_id, profile]));
  return (rolesRes.data || [])
    .filter((role) => role.role !== "user")
    .map((role) => {
      const profile = profileMap.get(role.user_id);
      return {
        user_id: role.user_id,
        role: role.role,
        created_at: role.created_at,
        username: profile?.username || "未知",
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
      };
    });
}

async function fetchAnalyticsStatsData() {
  const todayStart = startOfDay(new Date());
  const weekStart = subDays(new Date(), 7).toISOString();
  const todayISO = todayStart.toISOString();
  const [usersR, photosR, topicsR, repliesR, listingsR, pendingR, todayUsersR, todayPhotosR, weekUsersR, weekPhotosR] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("photos").select("id", { count: "exact", head: true }),
    supabase.from("forum_topics").select("id", { count: "exact", head: true }),
    supabase.from("forum_replies").select("id", { count: "exact", head: true }),
    supabase.from("marketplace_listings").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("photos").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
    supabase.from("photos").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
  ]);
  return {
    totalUsers: usersR.count || 0,
    totalPhotos: photosR.count || 0,
    totalTopics: topicsR.count || 0,
    totalReplies: repliesR.count || 0,
    totalListings: listingsR.count || 0,
    pendingReports: pendingR.count || 0,
    todayNewUsers: todayUsersR.count || 0,
    todayNewPhotos: todayPhotosR.count || 0,
    weekNewUsers: weekUsersR.count || 0,
    weekNewPhotos: weekPhotosR.count || 0,
  };
}

async function fetchAnalyticsTraffic(rangeDays = 14) {
  const startDate = subDays(new Date(), rangeDays).toISOString();
  const todayStart = startOfDay(new Date());
  const { data: views } = await (supabase.from("page_views") as any)
    .select("session_id, page_path, referrer_domain, language, screen_width, country, created_at")
    .gte("created_at", startDate)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (!views?.length) {
    return {
      pvTrend: [],
      uvTrend: [],
      topPages: [],
      topReferrers: [],
      topCountries: [],
      topLanguages: [],
      deviceBreakdown: [],
      totalPV: 0,
      totalUV: 0,
      todayPV: 0,
      todayUV: 0,
      bandwidth: null,
    };
  }

  const pvMap = new Map<string, number>();
  const uvMap = new Map<string, Set<string>>();
  for (let i = 0; i < rangeDays; i += 1) {
    const label = format(subDays(new Date(), rangeDays - 1 - i), "MM/dd");
    pvMap.set(label, 0);
    uvMap.set(label, new Set());
  }

  const pageCount = new Map<string, number>();
  const refCount = new Map<string, number>();
  const countryCount = new Map<string, number>();
  const langCount = new Map<string, number>();
  let mobile = 0;
  let tablet = 0;
  let desktop = 0;
  let photoDetailViews = 0;
  let regularViews = 0;

  views.forEach((view: any) => {
    const label = format(new Date(view.created_at), "MM/dd");
    if (pvMap.has(label)) {
      pvMap.set(label, (pvMap.get(label) || 0) + 1);
      uvMap.get(label)?.add(view.session_id);
    }
    pageCount.set(view.page_path, (pageCount.get(view.page_path) || 0) + 1);
    refCount.set(view.referrer_domain || "直接訪問", (refCount.get(view.referrer_domain || "直接訪問") || 0) + 1);
    countryCount.set(view.country || "未知", (countryCount.get(view.country || "未知") || 0) + 1);
    const lang = view.language?.split("-")[0] || "未知";
    langCount.set(lang, (langCount.get(lang) || 0) + 1);

    const width = view.screen_width || 0;
    if (width < 768) mobile += 1;
    else if (width < 1024) tablet += 1;
    else desktop += 1;

    if (view.page_path?.startsWith("/gallery/") && view.page_path !== "/gallery") photoDetailViews += 1;
    else regularViews += 1;
  });

  const todayViews = views.filter((view: any) => new Date(view.created_at) >= todayStart);
  return {
    pvTrend: [...pvMap.entries()].map(([date, count]) => ({ date, count })),
    uvTrend: [...uvMap.entries()].map(([date, sessions]) => ({ date, count: sessions.size })),
    topPages: [...pageCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    topReferrers: [...refCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
    topCountries: [...countryCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count })),
    topLanguages: [...langCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
    deviceBreakdown: [
      { name: "手機", count: mobile },
      { name: "平板", count: tablet },
      { name: "桌面", count: desktop },
    ].filter((item) => item.count > 0),
    totalPV: views.length,
    totalUV: new Set(views.map((view: any) => view.session_id)).size,
    todayPV: todayViews.length,
    todayUV: new Set(todayViews.map((view: any) => view.session_id)).size,
    bandwidth: {
      totalEstimatedMB: Number((((photoDetailViews * 1800) + (regularViews * 350)) / 1024).toFixed(1)),
      photoViewsMB: Number(((photoDetailViews * 1800) / 1024).toFixed(1)),
      pageViewsMB: Number(((regularViews * 350) / 1024).toFixed(1)),
      dailyTrend: [...pvMap.keys()].map((date) => ({ date, mb: 0 })),
      totalPhotoViews: photoDetailViews,
      totalStoragePhotos: 0,
    },
  };
}

async function fetchAnalyticsContent(rangeDays = 14) {
  const startDate = subDays(new Date(), rangeDays).toISOString();
  const [{ data: recentPhotos }, { data: recentTopics }, { data: recentUsers }, { data: topPhotoRows }, { data: allPhotoUsers }] = await Promise.all([
    supabase.from("photos").select("created_at").gte("created_at", startDate),
    supabase.from("forum_topics").select("created_at").gte("created_at", startDate),
    supabase.from("profiles").select("created_at").gte("created_at", startDate),
    supabase.from("photos").select("id, title, view_count, like_count, average_rating, user_id").eq("is_hidden", false).order("view_count", { ascending: false }).limit(10),
    supabase.from("photos").select("user_id").eq("is_hidden", false),
  ]);

  const buildTrend = (items: { created_at: string }[] | null) => {
    const trendMap = new Map<string, number>();
    for (let i = 0; i < rangeDays; i += 1) trendMap.set(format(subDays(new Date(), rangeDays - 1 - i), "MM/dd"), 0);
    items?.forEach((item) => {
      const label = format(new Date(item.created_at), "MM/dd");
      if (trendMap.has(label)) trendMap.set(label, (trendMap.get(label) || 0) + 1);
    });
    return [...trendMap.entries()].map(([date, count]) => ({ date, count }));
  };

  const countMap = new Map<string, number>();
  allPhotoUsers?.forEach((photo) => countMap.set(photo.user_id, (countMap.get(photo.user_id) || 0) + 1));
  const sortedUsers = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  const allUserIds = [...new Set([...(topPhotoRows || []).map((photo) => photo.user_id), ...sortedUsers.map(([userId]) => userId)])];
  const profileMap = new Map<string, { username: string; display_name: string | null }>();
  if (allUserIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("user_id, username, display_name").in("user_id", allUserIds);
    profiles?.forEach((profile) => profileMap.set(profile.user_id, profile));
  }

  return {
    photoTrend: buildTrend(recentPhotos),
    topicTrend: buildTrend(recentTopics),
    userTrend: buildTrend(recentUsers),
    topPhotos: (topPhotoRows || []).map((photo) => ({
      ...photo,
      view_count: photo.view_count || 0,
      like_count: photo.like_count || 0,
      average_rating: photo.average_rating || 0,
      author_name: profileMap.get(photo.user_id)?.display_name || profileMap.get(photo.user_id)?.username || "未知",
    })),
    activeUsers: sortedUsers.map(([userId, count]) => ({
      user_id: userId,
      username: profileMap.get(userId)?.username || "未知",
      display_name: profileMap.get(userId)?.display_name || profileMap.get(userId)?.username || "未知",
      photo_count: count,
    })),
  };
}

export function preloadAdminRoute(href: string) {
  loadChunk(href);
}

export function prefetchAdminDestination(queryClient: QueryClient, href: string) {
  const pathname = normalizeAdminHref(href);
  loadChunk(pathname);

  switch (pathname) {
    case "/admin":
      queryClient.prefetchQuery({ queryKey: ["admin-dashboard-kpis"], queryFn: fetchDashboardKpis, staleTime: 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: ["admin-dashboard-recent-reports"], queryFn: fetchDashboardRecentReports, staleTime: 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: ["admin-dashboard-health"], queryFn: fetchDashboardHealth, staleTime: 10 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: ["admin-dashboard-trend", 7], queryFn: () => fetchTrendData(7), staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/homepage/sections":
      queryClient.prefetchQuery({ queryKey: ["admin-homepage-sections"], queryFn: fetchHomepageSections, staleTime: 5 * 60 * 1000 });
      break;
    case "/admin/homepage/banners":
      queryClient.prefetchQuery({ queryKey: ["admin-banners"], queryFn: fetchBanners, staleTime: 5 * 60 * 1000 });
      break;
    case "/admin/homepage/copy":
    case "/admin/content/pages":
    case "/admin/content/seo":
    case "/admin/content/footer":
      queryClient.prefetchQuery({ queryKey: ["admin-site-content"], queryFn: fetchAdminSiteContent, staleTime: 5 * 60 * 1000 });
      break;
    case "/admin/community/photos":
      queryClient.prefetchQuery({ queryKey: ["admin-photos", "", "all", 0], queryFn: () => fetchPhotosPage("", "all", 0), staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/community/forums":
      queryClient.prefetchQuery({ queryKey: ["admin-forums", "", "all", 0], queryFn: () => fetchTopicsPage("", "all", 0), staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/community/marketplace":
      queryClient.prefetchQuery({ queryKey: ["admin-marketplace", "", "all", 0], queryFn: () => fetchListingsPage("", "all", 0), staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/community/categories":
      queryClient.prefetchQuery({ queryKey: ["admin-categories"], queryFn: fetchCategories, staleTime: 5 * 60 * 1000 });
      break;
    case "/admin/members":
      queryClient.prefetchQuery({ queryKey: ["admin-users"], queryFn: fetchAdminUsers, staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/members/roles":
      queryClient.prefetchQuery({ queryKey: ["admin-member-roles"], queryFn: fetchRoleUsers, staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/moderation/reports":
      queryClient.prefetchQuery({ queryKey: ["admin-reports", "pending", "all"], queryFn: () => fetchAdminReports("pending", "all"), staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/analytics":
      queryClient.prefetchQuery({ queryKey: ["admin-analytics-stats"], queryFn: fetchAnalyticsStatsData, staleTime: 3 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: ["admin-analytics-traffic", "14"], queryFn: () => fetchAnalyticsTraffic(14), staleTime: 3 * 60 * 1000 });
      queryClient.prefetchQuery({ queryKey: ["admin-analytics-content", "14"], queryFn: () => fetchAnalyticsContent(14), staleTime: 3 * 60 * 1000 });
      break;
    case "/admin/settings":
      queryClient.prefetchQuery({ queryKey: ["admin-system-settings"], queryFn: fetchSystemSettings, staleTime: 5 * 60 * 1000 });
      break;
    case "/admin/settings/features":
      queryClient.prefetchQuery({ queryKey: ["admin-feature-settings"], queryFn: fetchFeatureSettings, staleTime: 5 * 60 * 1000 });
      break;
    default:
      break;
  }
}

function fetchTrendData(trendRange: number) {
  const now = new Date();
  const rangeStart = subDays(now, trendRange - 1);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeISO = rangeStart.toISOString();
  return Promise.all([
    supabase.from("profiles").select("created_at").gte("created_at", rangeISO),
    supabase.from("photos").select("created_at").gte("created_at", rangeISO),
    supabase.from("page_views").select("created_at").gte("created_at", rangeISO),
  ]).then(([trendUsers, trendPhotos, trendViews]) => {
    const days: { date: string; 新會員: number; 新作品: number; 瀏覽量: number }[] = [];
    for (let i = trendRange - 1; i >= 0; i -= 1) {
      const day = subDays(now, i);
      const dayStr = format(day, "yyyy-MM-dd");
      const label = format(day, "MM/dd");
      days.push({
        date: label,
        新會員: (trendUsers.data || []).filter((row) => row.created_at.startsWith(dayStr)).length,
        新作品: (trendPhotos.data || []).filter((row) => row.created_at.startsWith(dayStr)).length,
        瀏覽量: (trendViews.data || []).filter((row) => row.created_at.startsWith(dayStr)).length,
      });
    }
    return days;
  });
}

export function scheduleAdminWarmup(queryClient: QueryClient) {
  if (adminWarmupStarted) return;
  adminWarmupStarted = true;

  const run = () => {
    Object.keys(chunkLoaders).forEach((pathname, index) => {
      window.setTimeout(() => {
        preloadAdminRoute(pathname);
        prefetchAdminDestination(queryClient, pathname);
      }, index * 120);
    });
  };

  if (typeof window !== "undefined") {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => run());
    } else {
      setTimeout(run, 250);
    }
  }
}
