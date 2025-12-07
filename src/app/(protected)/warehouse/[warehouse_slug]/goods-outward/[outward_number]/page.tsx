"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { OutwardDetailsTab } from "./OutwardDetailsTab";
import { StockUnitsTab } from "./StockUnitsTab";
import { useGoodsOutwardBySequenceNumber } from "@/lib/query/hooks/stock-flow";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    outward_number: string;
  }>;
}

export default function GoodsOutwardDetailPage({ params }: PageParams) {
  const router = useRouter();
  const { outward_number } = use(params);
  const [activeTab, setActiveTab] = useState<"details" | "stock_units">(
    "details",
  );

  // Fetch goods outward using TanStack Query
  const {
    data: outward,
    isLoading: loading,
    isError: error,
  } = useGoodsOutwardBySequenceNumber(outward_number);

  if (loading) {
    return <LoadingState message="Loading goods outward..." />;
  }

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
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "details" | "stock_units")}
          tabs={[
            { value: "details", label: "Outward details" },
            { value: "stock_units", label: "Stock units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1 border-r border-border">
          {activeTab === "details" ? (
            <OutwardDetailsTab outward={outward} />
          ) : (
            <StockUnitsTab items={outward.goods_outward_items} />
          )}
        </div>
      </div>
    </div>
  );
}
