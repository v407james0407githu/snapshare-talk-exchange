import { useAdminPage } from "@/components/admin/AdminPageContext";
import { Construction } from "lucide-react";

interface AdminPlaceholderProps {
  title: string;
  subtitle?: string;
  description?: string;
}

export function AdminPlaceholder({ title, subtitle, description }: AdminPlaceholderProps) {
  useAdminPage(title, subtitle);
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="p-4 rounded-2xl bg-muted mb-4">
        <Construction className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">功能建置中</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {description || `「${title}」模組正在開發中，將於後續版本推出。`}
      </p>
    </div>
  );
}
