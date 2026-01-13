"use client";

import { useMemo } from "react";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon } from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { InvoiceItemForAdjustment } from "@/types/adjustment-notes.types";
import type {
  MeasuringUnit,
  StockType,
  InvoiceTaxType,
  AdjustmentType,
} from "@/types/database/enums";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, roundCurrency } from "@/lib/utils/currency";

interface ProductSelection {
  selected: boolean;
  quantity: number;
  rate: number;
}

interface AdjustmentReviewStepProps {
  invoiceItems: InvoiceItemForAdjustment[];
  productSelections: Record<string, ProductSelection>;
  taxType: InvoiceTaxType;
  adjustmentType: AdjustmentType;
  invoiceOutstanding: number;
}

export function AdjustmentReviewStep({
  invoiceItems,
  productSelections,
  taxType,
  adjustmentType,
  invoiceOutstanding,
}: AdjustmentReviewStepProps) {
  // Calculate totals - matches backend logic from 0057_adjustment_note_functions.sql
  const calculations = useMemo(() => {
    // Step 1: Calculate line amounts (matches raw_items + initial_calc CTE lines 142-156)
    let subtotal = 0;
    const lineItems: Array<{
      item: InvoiceItemForAdjustment;
      quantity: number;
      rate: number;
      gstRate: number;
      lineAmount: number;
      lineCGST: number;
      lineSGST: number;
      lineIGST: number;
      lineTotalTax: number;
    }> = [];

    invoiceItems.forEach((item) => {
      const selection = productSelections[item.product_id];
      if (!selection?.selected || selection.quantity <= 0) return;

      // Round quantity and rate (matches backend lines 145-146)
      const qty = roundCurrency(selection.quantity);
      const rate = roundCurrency(selection.rate);
      const gstRate = roundCurrency(item.gst_rate || 0);

      // Calculate line amount WITHOUT rounding (matches backend line 154)
      // Backend: (ri.qty * ri.rate) as line_amount
      const lineAmount = qty * rate;
      subtotal += lineAmount;

      // Step 2: Calculate taxes per line and round (matches backend lines 173-175, 274, 277, 280)
      let lineCGST = 0;
      let lineSGST = 0;
      let lineIGST = 0;

      if (taxType === "gst") {
        // CGST and SGST (matches backend line 173-174)
        lineCGST = roundCurrency((lineAmount * (gstRate / 2)) / 100);
        lineSGST = roundCurrency((lineAmount * (gstRate / 2)) / 100);
      } else if (taxType === "igst") {
        // IGST (matches backend line 175)
        lineIGST = roundCurrency((lineAmount * gstRate) / 100);
      }

      const lineTotalTax = roundCurrency(lineCGST + lineSGST + lineIGST);

      lineItems.push({
        item,
        quantity: qty,
        rate,
        gstRate,
        lineAmount,
        lineCGST,
        lineSGST,
        lineIGST,
        lineTotalTax,
      });
    });

    // Step 3: Aggregate totals (matches backend lines 169-181)
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    lineItems.forEach((item) => {
      totalCGST += item.lineCGST;
      totalSGST += item.lineSGST;
      totalIGST += item.lineIGST;
    });

    // Round aggregated totals (matches backend lines 184-187)
    const totalSubtotal = roundCurrency(subtotal);
    totalCGST = roundCurrency(totalCGST);
    totalSGST = roundCurrency(totalSGST);
    totalIGST = roundCurrency(totalIGST);

    const totalTax = roundCurrency(totalCGST + totalSGST + totalIGST);

    // Step 4: Calculate grand total with round-off (matches backend lines 195-196)
    const grandTotalBeforeRounding = totalSubtotal + totalTax;
    const grandTotal = Math.round(grandTotalBeforeRounding); // Round to nearest integer
    const roundOff = roundCurrency(grandTotal - grandTotalBeforeRounding);

    // Calculate outstanding impact
    const isCreditNote = adjustmentType === "credit";
    const newOutstanding = isCreditNote
      ? invoiceOutstanding - grandTotal
      : invoiceOutstanding + grandTotal;

    return {
      lineItems,
      subtotal: totalSubtotal,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      roundOff,
      grandTotal,
      newOutstanding,
    };
  }, [
    invoiceItems,
    productSelections,
    taxType,
    adjustmentType,
    invoiceOutstanding,
  ]);

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
        {calculations.lineItems.map((lineItem) => {
          const product = lineItem.item.product;
          if (!product) return null;

          const unitAbbreviation = getMeasuringUnitAbbreviation(
            product.measuring_unit as MeasuringUnit | null,
          );

          return (
            <li key={lineItem.item.product_id}>
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
                  <p className="text-sm text-gray-500 truncate">
                    <span>
                      {lineItem.quantity} {unitAbbreviation}
                    </span>
                    <span> × </span>
                    <span>{formatCurrency(lineItem.rate)}</span>
                  </p>
                  {lineItem.lineTotalTax > 0 && (
                    <p className="text-sm text-gray-500">
                      {formatCurrency(lineItem.lineTotalTax)} GST
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCurrency(lineItem.lineAmount)}
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
        <span>Total Amount</span>
        <span>{formatCurrency(calculations.grandTotal)}</span>
      </div>
    </div>
  );
}
