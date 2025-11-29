"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { InwardDetailsTab } from "./InwardDetailsTab";
import { StockUnitsTab } from "./StockUnitsTab";
import { useGoodsInwardBySequenceNumber } from "@/lib/query/hooks/stock-flow";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    inward_number: string;
  }>;
}

export default function GoodsInwardDetailPage({ params }: PageParams) {
  const router = useRouter();
  const { inward_number } = use(params);
  const [activeTab, setActiveTab] = useState<"details" | "stock_units">(
    "details",
  );

  // Fetch goods inward using TanStack Query
  const {
    data: inwardData,
    isLoading: loading,
    isError: error,
  } = useGoodsInwardBySequenceNumber(inward_number);

  // Extract inward and stock units from the fetched data
  const { inward, stockUnits } = useMemo(() => {
    if (!inwardData) {
      return { inward: null, stockUnits: [] };
    }

    return {
      inward: inwardData,
      stockUnits: inwardData.stock_units || [],
    };
  }, [inwardData]);

  if (loading) {
    return <LoadingState message="Loading goods inward..." />;
  }

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
    <div className="flex flex-col flex-1 overflow-y-auto">
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
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "details" | "stock_units")}
          tabs={[
            { value: "details", label: "Inward details" },
            { value: "stock_units", label: "Stock units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === "details" ? (
            <InwardDetailsTab inward={inward} />
          ) : (
            <StockUnitsTab stockUnits={stockUnits} />
          )}
        </div>
      </div>
    </div>
  );
}
