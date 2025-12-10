"use client";

import { use } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useGoodsOutwardBySequenceNumber } from "@/lib/query/hooks/stock-flow";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    outward_number: string;
  }>;
  children: React.ReactNode;
}

export default function GoodsOutwardDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse_slug, outward_number } = use(params);

  // Fetch goods outward using TanStack Query
  const {
    data: outward,
    isLoading: loading,
    isError: error,
  } = useGoodsOutwardBySequenceNumber(outward_number);

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/goods-outward/${outward_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/stock-units")) return "stock-units";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading goods outward..." />;
  }

  // Error state
  if (error || !outward) {
    return (
      <ErrorState
        title="Goods outward not found"
        message="This goods outward does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  return (
    <div className="flex flex-col grow">
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              GO-{outward.sequence_number}
            </h1>
            <p className="text-sm text-gray-500">
              Goods outward on {formatAbsoluteDate(outward.outward_date)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "details", label: "Outward details" },
            { value: "stock-units", label: "Stock units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
