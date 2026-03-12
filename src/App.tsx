import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { DynamicMeta } from "@/components/layout/DynamicMeta";
import { usePageTracking } from "@/hooks/usePageTracking";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { Loader2 } from "lucide-react";

// Eagerly loaded (critical path)
import Index from "./pages/Index";

// Auth is not needed on initial homepage load
const Auth = lazy(() => import("./pages/Auth"));

// Lazy loaded pages
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <PageTracker />
          <DynamicMeta />
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
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/reports" element={<ReportManagement />} />
              <Route path="/admin/banners" element={<BannerManagement />} />
              <Route path="/admin/categories" element={<CategoryManagement />} />
              <Route path="/admin/content" element={<ContentManagement />} />
              <Route path="/admin/photos" element={<PhotoManagement />} />
              <Route path="/admin/sections" element={<ContentManagement />} />
              <Route path="/admin/analytics" element={<AnalyticsDashboard />} />
              <Route path="/admin/settings" element={<SystemSettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
