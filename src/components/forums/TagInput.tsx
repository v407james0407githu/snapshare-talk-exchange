import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ tags, onChange, placeholder = "輸入標籤後按 Enter" }: TagInputProps) {
  const [input, setInput] = useState("");

  const { data: suggestions } = useQuery({
    queryKey: ["tag-suggestions", input],
    queryFn: async () => {
      if (input.length < 1) return [];
      const { data } = await supabase
        .from("tags" as any)
        .select("name")
        .ilike("name", `%${input}%`)
        .limit(5);
      return (data as any[] | null)?.map((t: any) => t.name as string) || [];
    },
    enabled: input.length >= 1,
  });

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            #{tag}
            <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addTag(input); }
          }}
          placeholder={tags.length >= 5 ? "最多 5 個標籤" : placeholder}
          disabled={tags.length >= 5}
        />
        {suggestions && suggestions.length > 0 && input.length >= 1 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg">
            {suggestions.filter((s) => !tags.includes(s)).map((s) => (
              <button
                key={s}
                onClick={() => addTag(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                #{s}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">最多 5 個標籤，輸入後按 Enter 新增</p>
    </div>
  );
}
