"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useGoodsInwardsByPurchaseOrder } from "@/lib/query/hooks/stock-flow";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import {
  getInwardProductsSummary,
  getInwardQuantitiesByUnit,
} from "@/lib/utils/stock-flow";
import { Separator } from "@/components/ui/separator";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    purchase_number: string;
  }>;
}

export default function PurchaseOrderInwardsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, purchase_number } = use(params);

  const {
    data: inwardsResponse,
    isLoading: inwardsLoading,
    isError: inwardsError,
  } = useGoodsInwardsByPurchaseOrder(purchase_number);

  const inwards = inwardsResponse?.data || [];
  const inwardsCount = inwardsResponse?.totalCount || 0;

  if (inwardsLoading) {
    return <LoadingState message="Loading inwards..." />;
  }

  if (inwardsError) {
    return (
      <ErrorState
        title="Error"
        message="Could not load inwards for this order."
        onRetry={() => router.refresh()}
      />
    );
  }

  if (!inwards || inwardsCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-700">No inwards linked yet</p>
        <p className="text-sm text-gray-500">
          Create an inward to receive items from this order
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {inwards.map((inward) => (
        <li key={inward.id}>
          <button
            onClick={() => {
              router.push(
                `/warehouse/${warehouse_slug}/goods-inward/${inward.sequence_number}`,
              );
            }}
            className="flex items-center gap-4 p-4 hover:bg-gray-100 hover:cursor-pointer transition-colors"
          >
            <div className="flex-3 text-left">
              <p className="text-base font-medium text-gray-700">
                GI-{inward.sequence_number}
                <span> &nbsp;•&nbsp; </span>
                {formatAbsoluteDate(inward.inward_date)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {getInwardProductsSummary(inward)}
              </p>
            </div>
            <div className="flex-1 items-end justify-center text-right text-wrap">
              <p className="text-sm font-semibold text-teal-700">
                {formatMeasuringUnitQuantities(
                  getInwardQuantitiesByUnit(inward),
                )}
              </p>
              <p className="text-xs text-gray-500">In</p>
            </div>
          </button>
          <Separator />
        </li>
      ))}
    </div>
  );
}
