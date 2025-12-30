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
import { formatCurrency } from "@/lib/utils/currency";

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
  // Calculate totals
  const calculations = useMemo(() => {
    let subtotal = 0;
    const lineItems: Array<{
      item: InvoiceItemForAdjustment;
      quantity: number;
      rate: number;
      lineTotal: number;
      lineTax: number;
    }> = [];

    invoiceItems.forEach((item) => {
      const selection = productSelections[item.product_id];
      if (!selection?.selected || selection.quantity <= 0) return;

      const lineTotal = selection.quantity * selection.rate;
      subtotal += lineTotal;

      // Calculate tax for this line using original invoice GST rate
      const gstRate = item.gst_rate || 0;
      const lineTax = taxType !== "no_tax" ? (lineTotal * gstRate) / 100 : 0;

      lineItems.push({
        item,
        quantity: selection.quantity,
        rate: selection.rate,
        lineTotal,
        lineTax,
      });
    });

    // Calculate total tax breakdown
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    lineItems.forEach(({ lineTotal, item }) => {
      const gstRate = item.gst_rate || 0;

      if (taxType === "gst") {
        const lineCGST = (lineTotal * gstRate) / 200; // Half of GST
        const lineSGST = (lineTotal * gstRate) / 200; // Half of GST
        totalCGST += lineCGST;
        totalSGST += lineSGST;
      } else if (taxType === "igst") {
        const lineIGST = (lineTotal * gstRate) / 100;
        totalIGST += lineIGST;
      }
    });

    const totalTax = totalCGST + totalSGST + totalIGST;
    const grandTotal = subtotal + totalTax;

    // Calculate outstanding impact
    const isCreditNote = adjustmentType === "credit";
    const newOutstanding = isCreditNote
      ? invoiceOutstanding - grandTotal
      : invoiceOutstanding + grandTotal;

    return {
      lineItems,
      subtotal,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
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
        {calculations.lineItems.map(
          ({ item, quantity, rate, lineTotal, lineTax }) => {
            const product = item.product;
            if (!product) return null;

            const unitAbbreviation = getMeasuringUnitAbbreviation(
              product.measuring_unit as MeasuringUnit | null,
            );

            return (
              <li key={item.product_id}>
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
        <span>Total Amount</span>
        <span>{formatCurrency(calculations.grandTotal)}</span>
      </div>
    </div>
  );
}
