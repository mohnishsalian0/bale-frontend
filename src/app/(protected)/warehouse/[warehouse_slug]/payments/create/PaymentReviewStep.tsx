"use client";

import { useMemo } from "react";
import { formatCurrency, roundCurrency } from "@/lib/utils/currency";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { AllocationType } from "@/types/database/enums";
import type { OutstandingInvoiceView } from "@/types/payments.types";
import { Separator } from "@/components/ui/separator";

interface PaymentReviewStepProps {
  allocationType: AllocationType;
  advanceAmount: string;
  invoiceAllocations: Array<{
    invoiceId: string;
    amount: number;
    invoice?: OutstandingInvoiceView;
  }>;
  tdsApplicable: boolean;
  tdsRate: string;
}

export function PaymentReviewStep({
  allocationType,
  advanceAmount,
  invoiceAllocations,
  tdsApplicable,
  tdsRate,
}: PaymentReviewStepProps) {
  // Calculate totals - matches backend logic from 0058_payment_functions.sql
  const calculations = useMemo(() => {
    // Step 1: Calculate total amount and round (matches backend lines 47, 96)
    let totalAmount =
      allocationType === "advance"
        ? roundCurrency(parseFloat(advanceAmount) || 0)
        : invoiceAllocations.reduce(
            (sum, a) => sum + roundCurrency(a.amount),
            0,
          );
    totalAmount = roundCurrency(totalAmount);

    // Step 2: Round TDS rate (matches backend line 48)
    const tdsRateRounded = tdsRate ? roundCurrency(parseFloat(tdsRate)) : 0;

    // Step 3: Calculate TDS amount and round (matches backend line 86)
    const tdsAmount =
      tdsApplicable && tdsRateRounded > 0
        ? roundCurrency((totalAmount * tdsRateRounded) / 100)
        : 0;

    // Step 4: Calculate net amount (matches backend line 90)
    const netAmount = roundCurrency(totalAmount - tdsAmount);

    return {
      totalAmount,
      tdsAmount,
      netAmount,
    };
  }, [
    allocationType,
    advanceAmount,
    invoiceAllocations,
    tdsApplicable,
    tdsRate,
  ]);

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Allocations List - Scrollable */}
        <ul className="flex-1 overflow-y-auto">
          {invoiceAllocations.map((allocation) => (
            <li key={allocation.invoiceId}>
              <div className="flex gap-3 p-4 border-b border-gray-200 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    {allocation.invoice?.invoice_number || allocation.invoiceId}
                  </p>
                  {allocation.invoice && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatAbsoluteDate(allocation.invoice.invoice_date)} •
                      Outstanding:{" "}
                      {formatCurrency(allocation.invoice.outstanding_amount)}
                    </p>
                  )}
                </div>
                <div className="text-sm font-semibold text-gray-700 shrink-0">
                  {formatCurrency(allocation.amount)}
                </div>
              </div>
              <Separator />
            </li>
          ))}
        </ul>

        {/* Totals Summary - Fixed at bottom */}
        <div className="border-t border-gray-200 px-4 py-4 space-y-4 shrink-0">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Total Amount</span>
            <span className="font-semibold">
              {formatCurrency(calculations.totalAmount)}
            </span>
          </div>

          {/* TDS Row */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">
              TDS
              {tdsApplicable && tdsRate && ` (${tdsRate}%)`}
            </span>
            <span className="font-semibold">
              {tdsApplicable && calculations.tdsAmount > 0
                ? `- ${formatCurrency(calculations.tdsAmount)}`
                : "—"}
            </span>
          </div>
        </div>

        <div className="text-gray-700 flex justify-between text-base font-semibold border-t p-4">
          <span>Net Amount</span>
          <span>{formatCurrency(calculations.netAmount)}</span>
        </div>
      </div>
    </>
  );
}
