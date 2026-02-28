import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Smartphone, Camera, Wrench, Coffee } from "lucide-react";

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  children?: ForumCategory[];
}

const iconMap: Record<string, React.ReactNode> = {
  Smartphone: <Smartphone className="h-5 w-5" />,
  Camera: <Camera className="h-5 w-5" />,
  Wrench: <Wrench className="h-5 w-5" />,
  Coffee: <Coffee className="h-5 w-5" />,
};

const colorMap: Record<string, string> = {
  green: "bg-green-500/10 text-green-600 border-green-500/20",
  blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  purple: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  orange: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

export const getCategoryColor = (color: string | null) =>
  colorMap[color || ""] || "bg-muted text-muted-foreground";

export const getCategoryIcon = (icon: string | null) =>
  iconMap[icon || ""] || <span className="text-lg">{icon || "📁"}</span>;

export function useForumCategories() {
  return useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories" as any)
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      const cats = data as unknown as ForumCategory[];

      // Build tree
      const roots = cats.filter((c) => !c.parent_id);
      const children = cats.filter((c) => c.parent_id);
      return roots.map((root) => ({
        ...root,
        children: children
          .filter((c) => c.parent_id === root.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
    },
  });
}

interface ForumCategorySidebarProps {
  categories: ForumCategory[] | undefined;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  onSelectCategory: (catId: string | null) => void;
  onSelectSubCategory: (subId: string | null) => void;
  topicCounts: Record<string, number>;
}

export function ForumCategorySidebar({
  categories,
  selectedCategory,
  selectedSubCategory,
  onSelectCategory,
  onSelectSubCategory,
  topicCounts,
}: ForumCategorySidebarProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-semibold mb-4">討論分類</h3>
      <div className="space-y-1">
        <button
          onClick={() => { onSelectCategory(null); onSelectSubCategory(null); }}
          className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-left ${
            !selectedCategory ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
          }`}
        >
          <span className="font-medium">全部</span>
        </button>
        {categories?.map((cat) => (
          <div key={cat.id}>
            <button
              onClick={() => { onSelectCategory(cat.id); onSelectSubCategory(null); }}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors group w-full text-left ${
                selectedCategory === cat.id && !selectedSubCategory
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className={`p-2 rounded-lg border ${getCategoryColor(cat.color)}`}>
                {getCategoryIcon(cat.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium group-hover:text-primary transition-colors">
                  {cat.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {topicCounts[cat.name] || 0} 主題
                </div>
              </div>
            </button>
            {selectedCategory === cat.id && cat.children && cat.children.length > 0 && (
              <div className="ml-6 mt-1 space-y-1">
                {cat.children.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => onSelectSubCategory(sub.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-sm w-full text-left transition-colors ${
                      selectedSubCategory === sub.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <span>{sub.icon}</span>
                    <span>{sub.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
