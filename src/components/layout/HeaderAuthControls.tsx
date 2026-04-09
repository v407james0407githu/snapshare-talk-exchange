import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell } from "lucide-react";

const UserDropdown = lazy(() => import("./UserDropdown"));

function UserDropdownFallback({ initial }: { initial: string }) {
  return (
    <Avatar className="h-8 w-8">
      <AvatarFallback className="bg-gradient-gold text-charcoal">{initial}</AvatarFallback>
    </Avatar>
  );
}

export function HeaderAuthControls() {
  const { user, profile } = useAuth();

  if (!user) {
    return (
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
    );
  }

  const initial = profile?.display_name?.[0] || profile?.username?.[0] || "U";

  return (
    <>
      <Link to="/upload" className="hidden sm:block">
        <Button variant="gold" size="sm" className="gap-2">
          上傳作品
        </Button>
      </Link>

      <Button variant="ghost" size="icon" className="relative" asChild>
        <Link to="/notifications">
          <Bell className="h-5 w-5" />
        </Link>
      </Button>

      <Suspense fallback={<UserDropdownFallback initial={initial} />}>
        <UserDropdown />
      </Suspense>
    </>
  );
}
