import { useState, lazy, Suspense, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublicSystemSettings } from "@/hooks/usePublicSystemSettings";
import { preloadPublicRoute, prefetchForumsData, prefetchMarketplaceData } from "@/lib/publicRoutePrefetch";
import { 
  Camera, 
  Menu, 
  X, 
  Search,
} from "lucide-react";

const HeaderAuthControls = lazy(() =>
  import("./HeaderAuthControls").then((m) => ({ default: m.HeaderAuthControls })),
);

function hasLikelySession() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;

  try {
    return Object.keys(localStorage).some((key) => {
      if (!key.startsWith("sb-") || !key.endsWith("-auth-token")) return false;
      const value = localStorage.getItem(key);
      return Boolean(value && value !== "null");
    });
  } catch {
    return false;
  }
}

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [enableAuthControls, setEnableAuthControls] = useState(() => hasLikelySession());
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { forumEnabled, marketplaceEnabled, siteFavicon, siteLogo, siteName } = usePublicSystemSettings();
  const brandImage = siteFavicon || siteLogo;

  const navItems = [
    { label: "首頁", href: "/" },
    { label: "作品分享", href: "/gallery" },
    ...(forumEnabled ? [{ label: "討論區", href: "/forums" }] : []),
    ...(marketplaceEnabled ? [{ label: "二手交易", href: "/marketplace" }] : []),
  ];

  useEffect(() => {
    if (location.pathname !== "/") return;

    const schedule =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (cb: () => void) => (window as any).requestIdleCallback(cb, { timeout: 1500 })
        : (cb: () => void) => window.setTimeout(cb, 900);

    const handle = schedule(() => {
      preloadPublicRoute("/gallery");
      if (forumEnabled) {
        preloadPublicRoute("/forums");
        prefetchForumsData(queryClient);
      }
      if (marketplaceEnabled) {
        preloadPublicRoute("/marketplace");
        prefetchMarketplaceData(queryClient, false);
      }
    });

    return () => {
      if (typeof handle === "number") {
        window.clearTimeout(handle);
      }
    };
  }, [forumEnabled, marketplaceEnabled, location.pathname, queryClient]);

  useEffect(() => {
    if (enableAuthControls) return;
    if (location.pathname.startsWith("/auth")) {
      setEnableAuthControls(true);
      return;
    }

    const schedule =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? (cb: () => void) =>
            (window as Window & {
              requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
            }).requestIdleCallback?.(cb, { timeout: 2500 }) ?? window.setTimeout(cb, 1500)
        : (cb: () => void) => window.setTimeout(cb, 1500);

    const handle = schedule(() => setEnableAuthControls(true));
    return () => {
      if (typeof handle === "number") {
        window.clearTimeout(handle);
      }
    };
  }, [enableAuthControls, location.pathname]);

  const handleNavPrefetch = (href: string) => {
    if (href === "/forums") {
      preloadPublicRoute(href);
      prefetchForumsData(queryClient);
      return;
    }
    if (href === "/marketplace") {
      preloadPublicRoute(href);
      prefetchMarketplaceData(queryClient, false);
      return;
    }
    preloadPublicRoute(href);
  };

  return (
    <header className="sticky top-0 z-50 w-full h-16 glass border-b border-border/50">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group h-12 min-w-[140px]">
          {brandImage ? (
            <>
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full">
                <img
                  src={brandImage}
                  alt={siteName}
                  className="h-full w-full scale-[1.18] object-cover"
                  width={48}
                  height={48}
                />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight">
                {siteName}
              </span>
            </>
          ) : (
            <>
              <div className="relative">
                <Camera className="h-12 w-12 text-primary" />
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
              onMouseEnter={() => handleNavPrefetch(item.href)}
              onMouseDown={() => handleNavPrefetch(item.href)}
              onPointerDown={() => handleNavPrefetch(item.href)}
              onFocus={() => handleNavPrefetch(item.href)}
              onTouchStart={() => handleNavPrefetch(item.href)}
              className={`motion-interactive motion-press px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground ${
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
              className="motion-interactive pl-9 w-44 h-9 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                  navigate(`/gallery?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }
              }}
            />
          </div>

          {enableAuthControls ? (
            <Suspense
              fallback={
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
              }
            >
              <HeaderAuthControls />
            </Suspense>
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
                onMouseEnter={() => handleNavPrefetch(item.href)}
                onMouseDown={() => handleNavPrefetch(item.href)}
                onPointerDown={() => handleNavPrefetch(item.href)}
                onFocus={() => handleNavPrefetch(item.href)}
                onTouchStart={() => handleNavPrefetch(item.href)}
                onClick={() => setIsMenuOpen(false)}
                className={`motion-interactive motion-press px-4 py-3 rounded-lg text-sm font-medium ${
                  location.pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
