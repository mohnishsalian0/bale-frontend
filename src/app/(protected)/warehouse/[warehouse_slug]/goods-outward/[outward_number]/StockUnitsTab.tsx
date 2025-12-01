"use client";

import { useState } from "react";
import { IconPhoto } from "@tabler/icons-react";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatStockUnitNumber } from "@/lib/utils/product";
import type { Tables } from "@/types/database/supabase";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon } from "@/lib/utils/product";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { StockUnitDetailsModal } from "@/components/layouts/stock-unit-modal";
import { useStockUnitWithProductDetail } from "@/lib/query/hooks/stock-units";

type Product = Tables<"products">;
type StockUnit = Tables<"stock_units">;
type GoodsOutwardItem = Tables<"goods_outward_items">;

interface StockUnitsTabProps {
  items: Array<
    GoodsOutwardItem & {
      stock_unit:
        | (StockUnit & {
            product: Product | null;
          })
        | null;
    }
  >;
}

export function StockUnitsTab({ items }: StockUnitsTabProps) {
  const [selectedStockUnitId, setSelectedStockUnitId] = useState<string | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch stock unit detail when selected
  const { data: stockUnitDetail } =
    useStockUnitWithProductDetail(selectedStockUnitId);

  const handleStockUnitClick = (stockUnitId: string) => {
    setSelectedStockUnitId(stockUnitId);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedStockUnitId(null);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <IconPhoto className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-700 mb-1">
          No stock units
        </h3>
        <p className="text-sm text-gray-500">
          This goods outward has no stock units dispatched.
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
          console.log(stockType);

          return (
            <li
              key={item.id}
              onClick={() => stockUnit && handleStockUnitClick(stockUnit.id)}
              className="flex gap-3 p-3 border border-gray-200 rounded-lg mx-4 mt-3 hover:border-gray-300 transition-colors cursor-pointer"
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

                <p className="text-xs text-gray-500 mt-0.5">
                  {stockUnit?.sequence_number
                    ? formatStockUnitNumber(
                        stockUnit.sequence_number,
                        stockType,
                      )
                    : "No unit number"}
                </p>

                {/* Additional Details */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-0.5">
                  {stockUnit?.quality_grade && (
                    <span>Grade: {stockUnit.quality_grade}</span>
                  )}
                  {stockUnit?.supplier_number && (
                    <span>Supplier #: {stockUnit.supplier_number}</span>
                  )}
                  {stockUnit?.warehouse_location && (
                    <span>Location: {stockUnit.warehouse_location}</span>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-700">
                  {item.quantity_dispatched}{" "}
                  {getMeasuringUnitAbbreviation(measuringUnit)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Dispatched</p>
              </div>
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
