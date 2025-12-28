"use client";

import { useState } from "react";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { getProductIcon } from "@/lib/utils/product";
import type { InvoiceItemForAdjustment } from "@/types/adjustment-notes.types";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { formatCurrency } from "@/lib/utils/currency";
import { AdjustmentProductQuantitySheet } from "./AdjustmentProductQuantitySheet";

interface ProductSelection {
  selected: boolean;
  quantity: number;
  rate: number;
}

interface AdjustmentProductSelectionStepProps {
  invoiceItems: InvoiceItemForAdjustment[];
  productSelections: Record<string, ProductSelection>;
  onQuantityChange: (productId: string, quantity: number, rate: number) => void;
  onRemoveProduct: (productId: string) => void;
}

export function AdjustmentProductSelectionStep({
  invoiceItems,
  productSelections,
  onQuantityChange,
  onRemoveProduct,
}: AdjustmentProductSelectionStepProps) {
  const [selectedItem, setSelectedItem] =
    useState<InvoiceItemForAdjustment | null>(null);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);

  const handleOpenQuantitySheet = (item: InvoiceItemForAdjustment) => {
    setSelectedItem(item);
    setShowQuantitySheet(true);
  };

  const handleQuantityConfirm = (data: { quantity: number; rate: number }) => {
    if (selectedItem) {
      onQuantityChange(selectedItem.product_id, data.quantity, data.rate);
      setShowQuantitySheet(false);
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-1 p-4 shrink-0 border-b border-border">
        <h3 className="text-lg font-semibold text-gray-900">
          Select products for adjustment
        </h3>
        <p className="text-sm text-gray-500">
          Product quantities should be limited to the invoice quantity.
        </p>
      </div>

      {/* Product List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {invoiceItems.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No products in invoice</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {invoiceItems.map((item) => {
              const product = item.product;
              if (!product) return null;

              const selection = productSelections[item.product_id] || {
                selected: false,
                quantity: 0,
                rate: 0,
              };
              const imageUrl = product.product_images?.[0];
              const unitAbbreviation = getMeasuringUnitAbbreviation(
                product.measuring_unit as MeasuringUnit | null,
              );

              return (
                <div
                  key={item.product_id}
                  className="flex items-center gap-3 p-4 border-b border-gray-200"
                >
                  {/* Product Image */}
                  <ImageWrapper
                    size="md"
                    shape="square"
                    imageUrl={imageUrl}
                    alt={product.name}
                    placeholderIcon={getProductIcon(
                      product.stock_type as StockType,
                    )}
                  />

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={product.name}
                      className="text-base font-medium text-gray-700 truncate"
                    >
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Rate: {formatCurrency(item.rate)} • GST: {item.gst_rate}%
                    </p>
                  </div>

                  {/* Add/Quantity Button */}
                  <div className="flex flex-col items-end gap-2">
                    {selection.selected && selection.quantity > 0 ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleOpenQuantitySheet(item)}
                        >
                          {selection.quantity} {unitAbbreviation}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          onClick={() => onRemoveProduct(item.product_id)}
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenQuantitySheet(item)}
                      >
                        <IconPlus />
                        Add
                      </Button>
                    )}
                    <p className="text-xs text-gray-500">
                      {item.quantity} {unitAbbreviation} in invoice
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Quantity Sheet */}
      {selectedItem && selectedItem.product && (
        <AdjustmentProductQuantitySheet
          key={selectedItem.product_id}
          open={showQuantitySheet}
          onOpenChange={setShowQuantitySheet}
          product={{
            id: selectedItem.product.id,
            name: selectedItem.product.name,
            stock_type: selectedItem.product.stock_type as StockType,
            measuring_unit: selectedItem.product
              .measuring_unit as MeasuringUnit,
          }}
          invoiceQuantity={selectedItem.quantity}
          gstRate={selectedItem.gst_rate || 0}
          initialQuantity={
            productSelections[selectedItem.product_id]?.quantity || 0
          }
          initialRate={
            productSelections[selectedItem.product_id]?.rate ||
            selectedItem.rate
          }
          onConfirm={handleQuantityConfirm}
        />
      )}
    </>
  );
}
