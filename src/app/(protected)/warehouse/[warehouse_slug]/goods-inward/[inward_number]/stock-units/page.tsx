"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useGoodsInwardBySequenceNumber } from "@/lib/query/hooks/stock-flow";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon } from "@/lib/utils/product";
import { formatStockUnitNumber } from "@/lib/utils/product";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { Tables } from "@/types/database/supabase";
import { Separator } from "@/components/ui/separator";

type StockUnit = Tables<"stock_units">;
type Product = Tables<"products">;

interface StockUnitWithProduct extends StockUnit {
  product: Product | null;
}

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    inward_number: string;
  }>;
}

export default function StockUnitsPage({ params }: PageParams) {
  const router = useRouter();
  const { inward_number } = use(params);

  // Fetch goods inward using TanStack Query (cached from layout)
  const {
    data: inwardData,
    isLoading: loading,
    isError: error,
  } = useGoodsInwardBySequenceNumber(inward_number);

  // Extract stock units from the fetched data
  const stockUnits = useMemo(() => {
    if (!inwardData) {
      return [];
    }
    return (inwardData.stock_units || []) as StockUnitWithProduct[];
  }, [inwardData]);

  if (loading) {
    return <LoadingState message="Loading stock units..." />;
  }

  if (error || !inwardData) {
    return (
      <ErrorState
        title="Goods inward not found"
        message="This goods inward does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  if (stockUnits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <IconBox className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No stock units
        </h3>
        <p className="text-sm text-gray-500 text-center">
          No stock units were created from this goods inward
        </p>
      </div>
    );
  }

  return (
    <ul>
      {stockUnits.map((item) => {
        const product = item.product;
        const productImage = product?.product_images?.[0];
        const productName = product?.name || "Unknown Product";
        const stockType = product?.stock_type as StockType;
        const unitAbbreviation = getMeasuringUnitAbbreviation(
          product?.measuring_unit as MeasuringUnit | null,
        );

        return (
          <>
            <li
              key={item.id}
              className="flex gap-3 p-4 hover:border-gray-300 transition-colors"
            >
              {/* Product Image */}
              <ImageWrapper
                size="md"
                shape="square"
                imageUrl={productImage}
                alt={product?.name || ""}
                placeholderIcon={getProductIcon(stockType)}
              />

              {/* Stock Unit Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="font-medium text-gray-900 truncate"
                    title={productName}
                  >
                    {productName}
                  </h3>
                  <span className="shrink-0 text-sm font-bold text-gray-700">
                    {item.initial_quantity} {unitAbbreviation}
                  </span>
                </div>

                <p className="text-xs text-gray-500 mt-0.5">
                  {formatStockUnitNumber(item.sequence_number, stockType)}
                </p>

                {/* Additional Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-0.5">
                  {item.quality_grade && (
                    <span>Grade: {item.quality_grade}</span>
                  )}
                  {item.supplier_number && (
                    <span>Supplier #: {item.supplier_number}</span>
                  )}
                  {item.warehouse_location && (
                    <span>Location: {item.warehouse_location}</span>
                  )}
                  {item.manufacturing_date && (
                    <span>
                      Manufactured on:{" "}
                      {formatAbsoluteDate(item.manufacturing_date)}
                    </span>
                  )}
                </div>
              </div>
            </li>
            <Separator />
          </>
        );
      })}
    </ul>
  );
}
