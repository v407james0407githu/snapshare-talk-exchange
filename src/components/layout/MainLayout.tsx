import { lazy, Suspense } from "react";
import { Header } from "./Header";
import { useLazySection } from "@/hooks/useLazySection";

const Footer = lazy(() => import("./Footer").then((m) => ({ default: m.Footer })));

interface MainLayoutProps {
  children: React.ReactNode;
}

function FooterPlaceholder() {
  return <div className="h-[240px] border-t border-border bg-card" />;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [footerRef, showFooter] = useLazySection("800px 0px");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <div ref={footerRef}>
        <Suspense fallback={<FooterPlaceholder />}>
          {showFooter ? <Footer /> : <FooterPlaceholder />}
        </Suspense>
      </div>
    </div>
  );
}
