import { useState, lazy, Suspense } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { 
  Camera, 
  Menu, 
  X, 
  Search,
  Bell
} from "lucide-react";

// Lazy-load the user dropdown (includes admin check, heavy icons, radix dropdown)
const UserDropdown = lazy(() => import("./UserDropdown"));

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { galleryEnabled, forumEnabled, marketplaceEnabled, siteLogo, siteName } = useSystemSettings();

  const navItems = [
    { label: "首頁", href: "/" },
    ...(galleryEnabled ? [{ label: "作品分享", href: "/gallery" }] : []),
    ...(forumEnabled ? [{ label: "討論區", href: "/forums" }] : []),
    ...(marketplaceEnabled ? [{ label: "二手交易", href: "/marketplace" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full h-16 glass border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group h-8 min-w-[120px]">
          {siteLogo ? (
            <img src={siteLogo} alt={siteName} className="h-8 max-w-[160px] object-contain" width={160} height={32} />
          ) : (
            <>
              <div className="relative">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight">
                {siteName}
              </span>
            </>
          )}
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                location.pathname === item.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Search - desktop only */}
          <div className="hidden sm:flex relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜尋..."
              className="pl-9 w-44 h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                  navigate(`/gallery?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }
              }}
            />
          </div>

          {user ? (
            <>
              {galleryEnabled && (
                <Link to="/upload" className="hidden sm:block">
                  <Button variant="gold" size="sm" className="gap-2">
                    上傳作品
                  </Button>
                </Link>
              )}

              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link to="/notifications">
                  <Bell className="h-5 w-5" />
                </Link>
              </Button>

              <Suspense fallback={
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-gold text-charcoal">
                    {profile?.display_name?.[0] || profile?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
              }>
                <UserDropdown />
              </Suspense>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  登入
                </Button>
              </Link>
              <Link to="/auth?tab=register">
                <Button variant="gold" size="sm">
                  註冊
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <nav className="container py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/upload"
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-primary bg-primary/10"
              >
                上傳作品
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
