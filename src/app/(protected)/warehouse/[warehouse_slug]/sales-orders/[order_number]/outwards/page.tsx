"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useGoodsOutwardsBySalesOrder } from "@/lib/query/hooks/stock-flow";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import {
  getOutwardProductsSummary,
  getOutwardQuantitiesByUnit,
} from "@/lib/utils/stock-flow";
import { Separator } from "@/components/ui/separator";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    order_number: string;
  }>;
}

export default function OutwardsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, order_number } = use(params);

  // 2. Fetch outwards using the order ID from the first query
  const {
    data: outwardsResponse,
    isLoading: outwardsLoading,
    isError: outwardsError,
  } = useGoodsOutwardsBySalesOrder(order_number);

  const outwards = outwardsResponse?.data || [];
  const outwardsCount = outwardsResponse?.totalCount || 0;

  if (outwardsLoading) {
    return <LoadingState message="Loading outwards..." />;
  }

  if (outwardsError) {
    return (
      <ErrorState
        title="Error"
        message="Could not load outwards for this order."
        onRetry={() => router.refresh()}
      />
    );
  }

  if (!outwards || outwardsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-700">No outwards linked yet</p>
        <p className="text-sm text-gray-500">
          Create an outward to dispatch items from this order
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {outwards.map((outward) => (
        <>
          <button
            key={outward.id}
            onClick={() => {
              router.push(
                `/warehouse/${warehouse_slug}/goods-outward/${outward.sequence_number}`,
              );
            }}
            className="flex items-center gap-4 p-4 hover:bg-gray-100 hover:cursor-pointer transition-colors"
          >
            <div className="flex-3 text-left">
              <p className="text-base font-medium text-gray-700">
                GO-{outward.sequence_number}
                <span> &nbsp;•&nbsp; </span>
                {formatAbsoluteDate(outward.outward_date)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {getOutwardProductsSummary(outward)}
              </p>
            </div>
            <div className="flex-1 items-end justify-center text-right text-wrap">
              <p className="text-sm font-semibold text-teal-700">
                {formatMeasuringUnitQuantities(
                  getOutwardQuantitiesByUnit(outward),
                )}
              </p>
              <p className="text-xs text-gray-500">Out</p>
            </div>
          </button>
          <Separator />
        </>
      ))}
    </div>
  );
}
