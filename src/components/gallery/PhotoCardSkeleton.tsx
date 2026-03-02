import { Skeleton } from "@/components/ui/skeleton";

const heights = ["h-48", "h-56", "h-64", "h-72", "h-80", "h-44", "h-60"];

export function PhotoCardSkeleton({ index, viewMode }: { index: number; viewMode: "grid" | "masonry" }) {
  const h = viewMode === "masonry" ? heights[index % heights.length] : "h-48";

  return (
    <div
      className={`rounded-lg overflow-hidden border border-border/50 ${
        viewMode === "masonry" ? "mb-3 break-inside-avoid" : ""
      }`}
    >
      <Skeleton className={`w-full ${h}`} />
      <div className="p-2 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}
