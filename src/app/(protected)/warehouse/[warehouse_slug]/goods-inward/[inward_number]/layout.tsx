"use client";

import { use } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useGoodsInwardBySequenceNumber } from "@/lib/query/hooks/stock-flow";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    inward_number: string;
  }>;
  children: React.ReactNode;
}

export default function GoodsInwardDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse_slug, inward_number } = use(params);

  // Fetch goods inward using TanStack Query
  const {
    data: inward,
    isLoading: loading,
    isError: error,
  } = useGoodsInwardBySequenceNumber(inward_number);

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/goods-inward/${inward_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/stock-units")) return "stock-units";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading goods inward..." />;
  }

  // Error state
  if (error || !inward) {
    return (
      <ErrorState
        title="Goods inward not found"
        message="This goods inward does not exist or has been deleted"
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
              GI-{inward.sequence_number}
            </h1>
            <p className="text-sm text-gray-500">
              Goods inward on {formatAbsoluteDate(inward.inward_date)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "details", label: "Inward details" },
            { value: "stock-units", label: "Stock units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
