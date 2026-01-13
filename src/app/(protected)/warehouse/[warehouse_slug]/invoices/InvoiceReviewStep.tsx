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
import { formatCurrency, roundCurrency } from "@/lib/utils/currency";

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

  // Calculate totals - matches backend logic from 0056_invoice_functions.sql
  const calculations = useMemo(() => {
    // Step 1: Calculate line gross amounts and build line items
    let subtotal = 0;
    const lineItems: Array<{
      product: ProductWithInventoryListView;
      quantity: number;
      rate: number;
      lineGrossAmount: number;
      lineDiscountAmount: number;
      lineTaxableValue: number;
      lineCGST: number;
      lineSGST: number;
      lineIGST: number;
      lineTotalTax: number;
    }> = [];

    // Build initial line items with gross amounts (matches raw_items + initial_calc CTE)
    products.forEach((product) => {
      const selection = productSelections[product.id];
      if (!selection?.selected || selection.quantity <= 0) return;

      // Round quantity and rate (matches backend lines 142-143)
      const qty = roundCurrency(selection.quantity);
      const rate = roundCurrency(selection.rate);
      const lineGrossAmount = roundCurrency(qty * rate);
      subtotal += lineGrossAmount;

      lineItems.push({
        product,
        quantity: qty,
        rate,
        lineGrossAmount,
        lineDiscountAmount: 0, // Will be calculated next
        lineTaxableValue: 0, // Will be calculated next
        lineCGST: 0,
        lineSGST: 0,
        lineIGST: 0,
        lineTotalTax: 0,
      });
    });

    // Step 2: Calculate global discount amount (matches calc_discount CTE lines 159-167)
    let globalDiscountAmount = 0;
    if (discountType === "percentage") {
      globalDiscountAmount = roundCurrency((subtotal * discountValue) / 100);
    } else if (discountType === "flat_amount") {
      globalDiscountAmount = roundCurrency(discountValue);
    }

    // Step 3: Distribute discount proportionally across line items (matches with_proportional_discount CTE)
    lineItems.forEach((item) => {
      // Calculate proportional discount for this line (lines 174-178)
      const proportionalDiscount =
        subtotal > 0
          ? roundCurrency(
              (item.lineGrossAmount / subtotal) * globalDiscountAmount,
            )
          : 0;

      item.lineDiscountAmount = proportionalDiscount;

      // Calculate taxable value (matches line 205: line_gross_amount - line_discount_amount)
      item.lineTaxableValue = roundCurrency(
        item.lineGrossAmount - item.lineDiscountAmount,
      );
    });

    // Step 4: Calculate taxes per line (matches lines 222-224)
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    lineItems.forEach((item) => {
      const hasTax = item.product.tax_type === "gst" && taxType !== "no_tax";
      if (!hasTax) return;

      const gstRate = item.product.gst_rate || 0;

      if (taxType === "gst") {
        // CGST and SGST are half of GST rate each (lines 222-223)
        item.lineCGST = roundCurrency(
          (item.lineTaxableValue * (gstRate / 2)) / 100,
        );
        item.lineSGST = roundCurrency(
          (item.lineTaxableValue * (gstRate / 2)) / 100,
        );
        totalCGST += item.lineCGST;
        totalSGST += item.lineSGST;
      } else if (taxType === "igst") {
        // IGST is full GST rate (line 224)
        item.lineIGST = roundCurrency((item.lineTaxableValue * gstRate) / 100);
        totalIGST += item.lineIGST;
      }

      item.lineTotalTax = roundCurrency(
        item.lineCGST + item.lineSGST + item.lineIGST,
      );
    });

    // Step 5: Calculate totals (matches lines 215-232)
    const totalGrossAmount = roundCurrency(subtotal);
    const totalDiscountAmount = roundCurrency(globalDiscountAmount);
    const totalTaxableAmount = roundCurrency(
      lineItems.reduce((sum, item) => sum + item.lineTaxableValue, 0),
    );
    totalCGST = roundCurrency(totalCGST);
    totalSGST = roundCurrency(totalSGST);
    totalIGST = roundCurrency(totalIGST);
    const totalTax = roundCurrency(totalCGST + totalSGST + totalIGST);

    // Step 6: Calculate grand total and round-off (matches lines 245-246)
    const grandTotalBeforeRounding = totalTaxableAmount + totalTax;
    const grandTotal = Math.round(grandTotalBeforeRounding); // Round to nearest integer
    const roundOff = roundCurrency(grandTotal - grandTotalBeforeRounding);

    return {
      lineItems,
      subtotal: totalGrossAmount,
      discountAmount: totalDiscountAmount,
      taxableAmount: totalTaxableAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      roundOff,
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
        {calculations.lineItems.map((item) => {
          const unitAbbreviation = getMeasuringUnitAbbreviation(
            item.product.measuring_unit as MeasuringUnit | null,
          );
          const productInfoText = getProductInfo(item.product);

          return (
            <li key={item.product.id}>
              <div className="flex gap-3 p-4">
                <ImageWrapper
                  size="sm"
                  shape="square"
                  imageUrl={item.product.product_images?.[0]}
                  alt={item.product.name}
                  placeholderIcon={getProductIcon(
                    item.product.stock_type as StockType,
                  )}
                />

                <div className="flex-1 min-w-0">
                  <p
                    title={item.product.name}
                    className="text-sm font-medium text-gray-700 truncate"
                  >
                    {item.product.name}
                  </p>
                  <p
                    title={productInfoText}
                    className="text-sm text-gray-500 truncate"
                  >
                    <span>
                      {item.quantity} {unitAbbreviation}
                    </span>
                    <span> × </span>
                    <span>{formatCurrency(item.rate)}</span>
                  </p>
                  {item.lineTotalTax > 0 && (
                    <p className="text-sm text-gray-500">
                      {formatCurrency(item.lineTotalTax)} GST
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCurrency(item.lineGrossAmount)}
                  </p>
                </div>
              </div>
              <Separator />
            </li>
          );
        })}
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

        {calculations.roundOff !== 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Round Off</span>
            <span
              className={`font-semibold ${calculations.roundOff > 0 ? "text-gray-700" : "text-green-700"}`}
            >
              {calculations.roundOff > 0 ? "+" : ""}
              {formatCurrency(calculations.roundOff)}
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
