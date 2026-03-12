import { Header } from "./Header";
import { Footer } from "./Footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col pt-16">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
