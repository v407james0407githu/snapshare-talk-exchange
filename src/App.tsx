import { lazy, Suspense, useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { usePageTracking } from "@/hooks/usePageTracking";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Loader2 } from "lucide-react";

// Eagerly loaded (critical path)
import Index from "./pages/Index";

// Auth is not needed on initial homepage load
const Auth = lazy(() => import("./pages/Auth"));

// Defer non-critical overlays/effects
const Toaster = lazy(() => import("@/components/ui/toaster").then((m) => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));
const DynamicMeta = lazy(() => import("@/components/layout/DynamicMeta").then((m) => ({ default: m.DynamicMeta })));
const Gallery = lazy(() => import("./pages/Gallery"));
const PhotoDetail = lazy(() => import("./pages/PhotoDetail"));
const Forums = lazy(() => import("./pages/Forums"));
const ForumTopic = lazy(() => import("./pages/ForumTopic"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Upload = lazy(() => import("./pages/Upload"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const CreateListing = lazy(() => import("./pages/CreateListing"));
const ListingDetail = lazy(() => import("./pages/ListingDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Messages = lazy(() => import("./pages/Messages"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));

// Admin layout (persistent shell)
const AdminLayoutRoute = lazy(() => import("@/components/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));

// Admin pages (heavy, rarely accessed)
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("./pages/admin/UserManagement"));
const ReportManagement = lazy(() => import("./pages/admin/ReportManagement"));
const BannerManagement = lazy(() => import("./pages/admin/BannerManagement"));
const CategoryManagement = lazy(() => import("./pages/admin/CategoryManagement"));
const ContentManagement = lazy(() => import("./pages/admin/ContentManagement"));
const PhotoManagement = lazy(() => import("./pages/admin/PhotoManagement"));
const AnalyticsDashboard = lazy(() => import("./pages/admin/AnalyticsDashboard"));
const SystemSettings = lazy(() => import("./pages/admin/SystemSettings"));
const HomepageSections = lazy(() => import("./pages/admin/HomepageSections"));
const HomepageCopy = lazy(() => import("./pages/admin/HomepageCopy"));
const ContentPages = lazy(() => import("./pages/admin/ContentPages"));
const SeoSettings = lazy(() => import("./pages/admin/SeoSettings"));
const FooterSettings = lazy(() => import("./pages/admin/FooterSettings"));
const CommunityForums = lazy(() => import("./pages/admin/CommunityForums"));
const CommunityMarketplace = lazy(() => import("./pages/admin/CommunityMarketplace"));
const MemberRoles = lazy(() => import("./pages/admin/MemberRoles"));
const FeatureToggle = lazy(() => import("./pages/admin/FeatureToggle"));

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 minutes - avoid refetching on every mount
      gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageTracker() {
  usePageTracking();
  return null;
}

function DeferredNonCritical() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setEnabled(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <DynamicMeta />
      <Toaster />
      <Sonner />
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <ScrollToTop />
          <PageTracker />
          <DeferredNonCritical />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/gallery/:photoId" element={<PhotoDetail />} />
              <Route path="/forums" element={<Forums />} />
              <Route path="/forums/topic/:topicId" element={<ForumTopic />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:userId" element={<UserProfile />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/create" element={<CreateListing />} />
              <Route path="/marketplace/:listingId" element={<ListingDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/:conversationId" element={<Messages />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Admin routes - persistent layout */}
              <Route path="/admin" element={<AdminLayoutRoute />}>
                <Route index element={<AdminDashboard />} />
                <Route path="homepage/sections" element={<HomepageSections />} />
                <Route path="homepage/banners" element={<BannerManagement />} />
                <Route path="homepage/copy" element={<HomepageCopy />} />
                <Route path="content/pages" element={<ContentPages />} />
                <Route path="content/seo" element={<SeoSettings />} />
                <Route path="content/footer" element={<FooterSettings />} />
                <Route path="community/photos" element={<PhotoManagement />} />
                <Route path="community/forums" element={<CommunityForums />} />
                <Route path="community/marketplace" element={<CommunityMarketplace />} />
                <Route path="community/categories" element={<CategoryManagement />} />
                <Route path="members" element={<UserManagement />} />
                <Route path="members/roles" element={<MemberRoles />} />
                <Route path="moderation/reports" element={<ReportManagement />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="settings" element={<SystemSettings />} />
                <Route path="settings/features" element={<FeatureToggle />} />
            </Route>
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
