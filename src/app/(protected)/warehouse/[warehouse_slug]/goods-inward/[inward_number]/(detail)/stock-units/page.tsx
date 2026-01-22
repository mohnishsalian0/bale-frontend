"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useGoodsInwardBySequenceNumber } from "@/lib/query/hooks/stock-flow";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getStockUnitInfo } from "@/lib/utils/product";
import { formatStockUnitNumber } from "@/lib/utils/product";
import {
  MeasuringUnit,
  StockType,
  StockUnitStatus,
} from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { Tables } from "@/types/database/supabase";
import { Separator } from "@/components/ui/separator";
import { StockUnitDetailsModal } from "@/components/layouts/stock-unit-modal";
import { useStockUnitWithProductDetail } from "@/lib/query/hooks/stock-units";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/utils/date";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";

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
  const [selectedStockUnitId, setSelectedStockUnitId] = useState<string | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch goods inward using TanStack Query (cached from layout)
  const {
    data: inwardData,
    isLoading: loading,
    isError: error,
  } = useGoodsInwardBySequenceNumber(inward_number);

  // Fetch stock unit detail when selected
  const { data: stockUnitDetail } =
    useStockUnitWithProductDetail(selectedStockUnitId);

  // Extract stock units from the fetched data
  const stockUnits = useMemo(() => {
    if (!inwardData) {
      return [];
    }
    return (inwardData.stock_units || []) as StockUnitWithProduct[];
  }, [inwardData]);

  const handleStockUnitClick = (stockUnitId: string) => {
    setSelectedStockUnitId(stockUnitId);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedStockUnitId(null);
  };

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
    <>
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
            <li key={item.id}>
              <div
                onClick={() => item && handleStockUnitClick(item.id)}
                className="flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
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
                    <div className="flex items-center gap-2">
                      <p
                        className="font-medium text-gray-700 truncate"
                        title={productName}
                      >
                        {productName}
                      </p>
                      <StockStatusBadge
                        status={item.status as StockUnitStatus}
                      />
                    </div>
                    <span className="shrink-0 text-sm font-bold text-gray-700">
                      {item.initial_quantity} {unitAbbreviation}
                    </span>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">
                    {formatStockUnitNumber(item.sequence_number, stockType)}
                    {" • "}
                    <span
                      className={`text-sm mt-1 ${
                        item.qr_generated_at
                          ? "text-gray-500"
                          : "text-green-700"
                      }`}
                      title={
                        item.qr_generated_at
                          ? formatAbsoluteDate(item.qr_generated_at)
                          : ""
                      }
                    >
                      {item.qr_generated_at
                        ? `QR generated ${formatRelativeDate(item.qr_generated_at)}`
                        : "QR pending"}
                    </span>
                  </p>

                  {/* Additional Details */}
                  <p className="text-sm text-gray-500">
                    {getStockUnitInfo(item)}
                  </p>
                </div>
              </div>
              <Separator />
            </li>
          );
        })}
      </ul>

      {/* Stock Unit Details Modal */}
      <StockUnitDetailsModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        stockUnit={stockUnitDetail || null}
      />
    </>
  );
}
