"use client";

import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { Tables } from "@/types/database/supabase";
import type { ProductWithAttributes } from "@/lib/queries/products";
import type { MeasuringUnit, StockType } from "@/types/database/enums";

type StockUnit = Tables<"stock_units">;

export interface StockUnitWithProduct extends StockUnit {
  product: ProductWithAttributes | null;
}

interface StockUnitDetailsContentProps {
  stockUnit: StockUnitWithProduct;
  /**
   * Whether to show the action buttons
   */
  showActions?: boolean;
  /**
   * Custom action handlers
   */
  onWastage?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function StockUnitDetailsContent({
  stockUnit,
  showActions = true,
  onWastage,
  onEdit,
  onDelete,
}: StockUnitDetailsContentProps) {
  const product = stockUnit.product;
  const unitAbbr = product?.measuring_unit
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "units";
  const productInfoText = product ? getProductInfo(product) : "";

  const handleWastage = () => {
    if (onWastage) {
      onWastage();
    } else {
      console.log("Add wastage");
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
                className="text-base font-medium text-gray-900 truncate"
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
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="flex gap-3 w-full pb-2 px-4 md:px-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <IconTrash />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleEdit}
          >
            <IconEdit />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleWastage}
            className="flex-1"
          >
            <IconPlus />
            Wastage
          </Button>
        </div>
      )}
    </>
  );
}
