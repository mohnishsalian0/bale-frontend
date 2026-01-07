"use client";

import { IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { Tables } from "@/types/database/supabase";
import type { ProductListView } from "@/types/products.types";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import {
  useStockUnitAdjustments,
  useStockUnitAdjustmentMutations,
} from "@/lib/query/hooks/stock-unit-adjustments";
import { toast } from "sonner";

type StockUnit = Tables<"stock_units">;

export interface StockUnitWithProduct extends StockUnit {
  product: ProductListView | null;
}

interface StockUnitDetailsContentProps {
  stockUnit: StockUnitWithProductDetailView;
  /**
   * Whether to show the action buttons
   */
  showActions?: boolean;
  /**
   * Custom action handlers
   */
  onAdjustment?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function StockUnitDetailsContent({
  stockUnit,
  showActions = true,
  onAdjustment,
  onEdit,
  onDelete,
}: StockUnitDetailsContentProps) {
  const product = stockUnit.product;
  const unitAbbr = product?.measuring_unit
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "units";
  const productInfoText = product ? getProductInfo(product) : "";

  // Fetch adjustments for this stock unit
  const { data: adjustments = [], isLoading: adjustmentsLoading } =
    useStockUnitAdjustments(stockUnit.id);
  const { delete: deleteAdjustment } = useStockUnitAdjustmentMutations();

  const handleAdjustment = () => {
    if (onAdjustment) {
      onAdjustment();
    } else {
      console.log("Add adjustment");
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      console.log("Edit stock unit");
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    } else {
      console.log("Delete stock unit");
    }
  };

  const handleDeleteAdjustment = (adjustmentId: string) => {
    deleteAdjustment.mutate(adjustmentId, {
      onSuccess: () => {
        toast.success("Adjustment deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting adjustment:", error);
        toast.error("Failed to delete adjustment");
      },
    });
  };

  return (
    <>
      {/* Content */}
      <div className="flex flex-col gap-6 p-4 md:px-0 overflow-y-auto">
        {/* Product Header */}
        {product && (
          <div className="flex items-center gap-3">
            <ImageWrapper
              size="md"
              shape="square"
              imageUrl={product.product_images?.[0]}
              alt={product.name}
              placeholderIcon={getProductIcon(product.stock_type as StockType)}
            />
            <div className="flex-1 min-w-0">
              <p
                title={product.name}
                className="text-base font-medium text-gray-700 truncate"
              >
                {product.name}
              </p>
              <p
                title={productInfoText}
                className="text-xs text-gray-500 truncate"
              >
                {productInfoText}
              </p>
            </div>
          </div>
        )}

        {/* Quantity & Status Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">
            Quantity & Status
          </h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Remaining quantity</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.remaining_quantity} {unitAbbr}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Initial quantity</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.initial_quantity} {unitAbbr}
            </span>
          </div>
        </div>

        {/* Stock Details Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Stock Details</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Quality grade</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.quality_grade || "-"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Supplier number</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.supplier_number || "-"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Warehouse location</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.warehouse_location || "-"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Manufacturing date</span>
            {stockUnit.manufacturing_date ? (
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(stockUnit.manufacturing_date)}
              </span>
            ) : (
              <span className="font-semibold text-gray-700">-</span>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">QR generated at</span>
            {stockUnit.qr_generated_at ? (
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(stockUnit.qr_generated_at)}
              </span>
            ) : (
              <span className="font-semibold text-gray-700">-</span>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Notes</h3>
          <p className="text-sm text-gray-700">{stockUnit.notes || "-"}</p>
        </div>

        {/* Adjustments Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Adjustments</h3>
          {adjustmentsLoading ? (
            <p className="text-sm text-gray-500">Loading adjustments...</p>
          ) : adjustments.length === 0 ? (
            <p className="text-sm text-gray-500">-</p>
          ) : (
            <div className="space-y-2">
              {adjustments.map((adjustment) => {
                const isAddition = adjustment.quantity_adjusted > 0;
                const iconColor = isAddition
                  ? "text-green-600"
                  : "text-red-600";

                return (
                  <div
                    key={adjustment.id}
                    className={`flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-md`}
                  >
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2"></div>
                      <p
                        className="text-xs text-gray-500"
                        title={adjustment.reason}
                      >
                        <span className={`text-sm font-semibold ${iconColor}`}>
                          {isAddition ? "+" : ""}
                          {adjustment.quantity_adjusted} {unitAbbr}
                        </span>
                        {" • "}
                        <span>
                          {formatAbsoluteDate(adjustment.adjustment_date)}
                        </span>
                        {" • "}
                        {adjustment.reason}
                      </p>
                    </div>

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAdjustment(adjustment.id)}
                      className="flex-shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-100"
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3 w-full pb-2 px-4 md:px-0">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleDelete}
          >
            <IconTrash />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleEdit}
            className="flex-1"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAdjustment}
            className="flex-2"
          >
            Adjust quantity
          </Button>
        </div>
      )}
    </>
  );
}
