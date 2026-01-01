import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Gallery from "./pages/Gallery";
import PhotoDetail from "./pages/PhotoDetail";
import Forums from "./pages/Forums";
import ForumTopic from "./pages/ForumTopic";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Upload from "./pages/Upload";
import Marketplace from "./pages/Marketplace";
import CreateListing from "./pages/CreateListing";
import ListingDetail from "./pages/ListingDetail";
import Notifications from "./pages/Notifications";
import Favorites from "./pages/Favorites";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import ReportManagement from "./pages/admin/ReportManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/reports" element={<ReportManagement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
