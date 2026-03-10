"use client";

import { useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useInfiniteJobWorks } from "@/lib/query/hooks/job-works";
import { JobWorkStatusBadge } from "@/components/ui/job-work-status-badge";
import {
  getJobWorkDisplayStatus,
  getPendingProductSummary,
  getVendorName,
} from "@/lib/utils/job-work";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { JobWorkStatus } from "@/types/database/enums";

interface JobWorkLinkToStepProps {
  selectedJobWorkId: string | null;
  onSelectJobWork: (jobWorkId: string, outputProductId: string) => void;
}

export function JobWorkLinkToStep({
  selectedJobWorkId,
  onSelectJobWork,
}: JobWorkLinkToStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Fetch active job works with infinite scroll
  const {
    data: jobWorksData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteJobWorks({
    status: ["in_progress"],
    search_term: debouncedSearchQuery || undefined,
  });

  const jobWorks = jobWorksData?.pages.flatMap((page) => page.data) || [];

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Link to job work (optional)
        </h3>
        <p className="text-sm text-gray-500">
          Select a job work to auto-fill output product
        </p>
      </div>

      {/* Search bar */}
      <div className="p-4 border-b border-border shrink-0">
        <Input
          placeholder="Search by vendor or JW number"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Job Work List - Scrollable */}
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading job works...</p>
          </div>
        ) : jobWorks.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "No job works found matching your search"
                : "No active job works found"}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {jobWorks.map((jobWork) => {
                const isSelected = jobWork.id === selectedJobWorkId;
                const displayStatusData = getJobWorkDisplayStatus(
                  jobWork.status as JobWorkStatus,
                  jobWork.due_date,
                );
                const vendorName = getVendorName(jobWork.vendor);
                const pendingProducts = getPendingProductSummary(
                  jobWork.job_work_items,
                );
                // Use first item's product as the output product
                const outputProductId =
                  jobWork.job_work_items[0]?.product?.id || "";

                return (
                  <button
                    key={jobWork.id}
                    onClick={() => onSelectJobWork(jobWork.id, outputProductId)}
                    className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      {/* JW Number and Status Badge */}
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium text-gray-700">
                          JW-{jobWork.sequence_number}
                        </p>
                        <JobWorkStatusBadge
                          status={displayStatusData.status}
                          text={displayStatusData.text}
                        />
                      </div>

                      {/* Products with pending quantities */}
                      <p className="text-sm text-gray-500 mt-1">
                        {pendingProducts}
                      </p>

                      {/* Vendor and date */}
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {vendorName} · {formatAbsoluteDate(jobWork.created_at)}
                      </p>
                    </div>

                    {/* Selection Checkmark */}
                    {isSelected && (
                      <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                        <IconCheck className="size-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 border-t border-border">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 ml-3">Loading more...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
