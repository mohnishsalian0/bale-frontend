"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPhoto } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useGoodsTransferBySequenceNumber } from "@/lib/query/hooks/goods-transfers";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatStockUnitNumber, getStockUnitInfo } from "@/lib/utils/product";
import type { Tables } from "@/types/database/supabase";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon } from "@/lib/utils/product";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { StockUnitDetailsModal } from "@/components/layouts/stock-unit-modal";

type Product = Tables<"products">;
type StockUnit = Tables<"stock_units">;
type GoodsTransferItem = Tables<"goods_transfer_items">;

interface TransferItem extends GoodsTransferItem {
  stock_unit:
    | (StockUnit & {
        product: Product | null;
      })
    | null;
}

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    transfer_number: string;
  }>;
}

export default function StockUnitsPage({ params }: PageParams) {
  const router = useRouter();
  const { transfer_number } = use(params);
  const [selectedStockUnitId, setSelectedStockUnitId] = useState<string | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch goods transfer using TanStack Query (cached from layout)
  const {
    data: transferData,
    isLoading: loading,
    isError: error,
  } = useGoodsTransferBySequenceNumber(transfer_number);

  // Extract items from the fetched data
  const items = useMemo(() => {
    if (!transferData) {
      return [];
    }
    return (transferData.goods_transfer_items || []) as TransferItem[];
  }, [transferData]);

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

  if (error || !transferData) {
    return (
      <ErrorState
        title="Goods transfer not found"
        message="This goods transfer does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <IconPhoto className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-700 mb-1">
          No stock units
        </h3>
        <p className="text-sm text-gray-500">
          This goods transfer has no stock units.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul>
        {items.map((item) => {
          const stockUnit = item.stock_unit;
          const product = stockUnit?.product;
          const productImage = product?.product_images?.[0];
          const productName = product?.name || "Unknown Product";
          const stockType = product?.stock_type as StockType;
          const measuringUnit = product?.measuring_unit as MeasuringUnit;

          return (
            <li
              key={item.id}
              onClick={() => stockUnit && handleStockUnitClick(stockUnit.id)}
              className="flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer border-b border-border"
            >
              {/* Product Image */}
              <ImageWrapper
                size="md"
                shape="square"
                imageUrl={productImage}
                alt={productName}
                placeholderIcon={getProductIcon(stockType)}
              />

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-medium text-gray-700 truncate"
                  title={productName}
                >
                  {product?.name || "Unknown Product"}
                </p>

                <p className="text-sm text-gray-500">
                  {stockUnit?.sequence_number
                    ? formatStockUnitNumber(
                        stockUnit.sequence_number,
                        stockType,
                      )
                    : "No unit number"}
                </p>

                {/* Additional Details */}
                <div className="text-xs text-gray-500">
                  {getStockUnitInfo(stockUnit)}
                </div>
              </div>

              {/* Quantity */}
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-700">
                  {item.quantity_transferred}{" "}
                  {getMeasuringUnitAbbreviation(measuringUnit)}
                </p>
                <p className="text-sm text-gray-500">Transferred</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Stock Unit Details Modal */}
      <StockUnitDetailsModal
        open={modalOpen}
        onOpenChange={handleModalClose}
        stockUnitId={selectedStockUnitId}
      />
    </>
  );
}
