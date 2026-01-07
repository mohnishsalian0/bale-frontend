"use client";

import { useMemo } from "react";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { ProductWithInventoryListView } from "@/types/products.types";
import type {
  MeasuringUnit,
  StockType,
  InvoiceTaxType,
} from "@/types/database/enums";
import { getProductsWithInventoryByIds } from "@/lib/queries/products";
import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/currency";

interface InvoiceReviewStepProps {
  warehouseId: string;
  productSelections: Record<
    string,
    { selected: boolean; quantity: number; rate: number }
  >;
  taxType: InvoiceTaxType;
  discountType: "none" | "percentage" | "flat_amount";
  discountValue: number;
}

export function InvoiceReviewStep({
  warehouseId,
  productSelections,
  taxType,
  discountType,
  discountValue,
}: InvoiceReviewStepProps) {
  const [products, setProducts] = useState<ProductWithInventoryListView[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch selected products
  useEffect(() => {
    const selectedProductIds = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId]) => productId);

    if (selectedProductIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getProductsWithInventoryByIds(selectedProductIds, warehouseId)
      .then((fetchedProducts) => {
        setProducts(fetchedProducts);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setProducts([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productSelections, warehouseId]);

  // Calculate totals
  const calculations = useMemo(() => {
    let subtotal = 0;
    const lineItems: Array<{
      product: ProductWithInventoryListView;
      quantity: number;
      rate: number;
      lineTotal: number;
      lineTax: number;
    }> = [];

    products.forEach((product) => {
      const selection = productSelections[product.id];
      if (!selection?.selected || selection.quantity <= 0) return;

      const lineTotal = selection.quantity * selection.rate;
      subtotal += lineTotal;

      // Calculate tax for this line (only if product has GST and invoice allows tax)
      const hasTax = product.tax_type === "gst" && taxType !== "no_tax";
      const gstRate = hasTax ? product.gst_rate || 0 : 0;
      const lineTax = hasTax ? (lineTotal * gstRate) / 100 : 0;

      lineItems.push({
        product,
        quantity: selection.quantity,
        rate: selection.rate,
        lineTotal,
        lineTax,
      });
    });

    // Calculate discount
    let discountAmount = 0;
    if (discountType === "percentage") {
      discountAmount = (subtotal * discountValue) / 100;
    } else if (discountType === "flat_amount") {
      discountAmount = discountValue;
    }

    const taxableAmount = subtotal - discountAmount;

    // Calculate total tax (proportional after discount)
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    lineItems.forEach((item) => {
      const hasTax = item.product.tax_type === "gst" && taxType !== "no_tax";
      if (!hasTax) return;

      const gstRate = item.product.gst_rate || 0;
      const proportionalTaxable =
        subtotal > 0 ? (item.lineTotal / subtotal) * taxableAmount : 0;

      if (taxType === "gst") {
        const lineCGST = (proportionalTaxable * gstRate) / 200; // Half of GST
        const lineSGST = (proportionalTaxable * gstRate) / 200; // Half of GST
        totalCGST += lineCGST;
        totalSGST += lineSGST;
      } else if (taxType === "igst") {
        const lineIGST = (proportionalTaxable * gstRate) / 100;
        totalIGST += lineIGST;
      }
    });

    const totalTax = totalCGST + totalSGST + totalIGST;
    const grandTotal = taxableAmount + totalTax;

    return {
      lineItems,
      subtotal,
      discountAmount,
      taxableAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      grandTotal,
    };
  }, [products, productSelections, taxType, discountType, discountValue]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Loading items...</p>
      </div>
    );
  }

  if (calculations.lineItems.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">No items selected</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Line Items List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {calculations.lineItems.map(
          ({ product, quantity, rate, lineTotal, lineTax }) => {
            const unitAbbreviation = getMeasuringUnitAbbreviation(
              product.measuring_unit as MeasuringUnit | null,
            );
            const productInfoText = getProductInfo(product);

            return (
              <li key={product.id}>
                <div className="flex gap-3 p-4">
                  <ImageWrapper
                    size="sm"
                    shape="square"
                    imageUrl={product.product_images?.[0]}
                    alt={product.name}
                    placeholderIcon={getProductIcon(
                      product.stock_type as StockType,
                    )}
                  />

                  <div className="flex-1 min-w-0">
                    <p
                      title={product.name}
                      className="text-sm font-medium text-gray-700 truncate"
                    >
                      {product.name}
                    </p>
                    <p
                      title={productInfoText}
                      className="text-sm text-gray-500 truncate"
                    >
                      <span>
                        {quantity} {unitAbbreviation}
                      </span>
                      <span> × </span>
                      <span>{formatCurrency(rate)}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatCurrency(lineTax)} GST
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-gray-700">
                      {formatCurrency(lineTotal)}
                    </p>
                  </div>
                </div>
                <Separator />
              </li>
            );
          },
        )}
      </div>

      {/* Totals Summary - Fixed at bottom */}
      <div className="border-t border-gray-200 p-4 space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Subtotal</span>
          <span className="font-semibold">
            {formatCurrency(calculations.subtotal)}
          </span>
        </div>

        {calculations.discountAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">
              Discount
              {discountType === "percentage" && ` (${discountValue}%)`}
            </span>
            <span className="font-semibold text-green-700">
              - {formatCurrency(calculations.discountAmount)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-gray-700">Taxable Amount</span>
          <span className="font-semibold">
            {formatCurrency(calculations.taxableAmount)}
          </span>
        </div>

        {taxType === "gst" &&
          (calculations.totalCGST > 0 || calculations.totalSGST > 0) && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">CGST</span>
                <span className="font-semibold">
                  {formatCurrency(calculations.totalCGST)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">SGST</span>
                <span className="font-semibold">
                  {formatCurrency(calculations.totalSGST)}
                </span>
              </div>
            </>
          )}

        {taxType === "igst" && calculations.totalIGST > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">IGST</span>
            <span className="font-semibold">
              {formatCurrency(calculations.totalIGST)}
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-between p-4 text-base font-semibold border-t">
        <span>Grand Total</span>
        <span>{formatCurrency(calculations.grandTotal)}</span>
      </div>
    </div>
  );
}
