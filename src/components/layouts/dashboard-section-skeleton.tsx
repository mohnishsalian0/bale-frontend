import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface DashboardSectionSkeletonProps {
  title: string;
  itemCount?: number;
}

/**
 * Generic skeleton loader for dashboard sections
 * Shows header with title and loading cards
 */
export function DashboardSectionSkeleton({
  title,
  itemCount = 5,
}: DashboardSectionSkeletonProps) {
  return (
    <div className="flex flex-col mt-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <Button variant="ghost" size="sm" disabled>
          View all →
        </Button>
      </div>

      {/* Loading cards */}
      <div className="flex flex-col border-b border-border">
        {Array.from({ length: itemCount }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 p-4 border-t border-dashed border-gray-300"
          >
            {/* Title row */}
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>

            {/* Description */}
            <Skeleton className="h-4 w-full" />

            {/* Footer row */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>

            {/* Action buttons */}
            <div className="flex gap-1">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
