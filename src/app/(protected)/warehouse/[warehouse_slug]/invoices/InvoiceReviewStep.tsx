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
import type { Partner } from "@/types/partners.types";
import {
  mapPartnerBillingAddress,
  getPartnerShippingAddress,
  getFormattedAddress,
} from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";
import { useLedgers } from "@/lib/query/hooks/ledgers";
import type { CreateInvoiceCharge } from "@/types/invoices.types";

interface InvoiceReviewStepProps {
  warehouseId: string;
  productSelections: Record<
    string,
    { selected: boolean; quantity: number; rate: number }
  >;
  taxType: InvoiceTaxType;
  discountType: "none" | "percentage" | "flat_amount";
  discountValue: number;
  additionalCharges: CreateInvoiceCharge[];
  partner?: Pick<
    Partner,
    | "display_name"
    | "gst_number"
    | "billing_address_line1"
    | "billing_address_line2"
    | "billing_city"
    | "billing_state"
    | "billing_country"
    | "billing_pin_code"
    | "shipping_same_as_billing"
    | "shipping_address_line1"
    | "shipping_address_line2"
    | "shipping_city"
    | "shipping_state"
    | "shipping_country"
    | "shipping_pin_code"
  > | null;
}

export function InvoiceReviewStep({
  warehouseId,
  productSelections,
  taxType,
  discountType,
  discountValue,
  additionalCharges,
  partner,
}: InvoiceReviewStepProps) {
  const [products, setProducts] = useState<ProductWithInventoryListView[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch ledgers for charge details
  const { data: allLedgers = [] } = useLedgers();

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

  // Calculate totals - matches backend logic from 0049_invoice_items.sql (update_invoice_totals trigger)
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

    // Calculate amount after discount (matches backend logic)
    const amountAfterDiscount = roundCurrency(subtotal - globalDiscountAmount);

    // Step 3: Calculate additional charges and their GST (matches backend trigger logic)
    const chargeLineItems: Array<{
      ledgerName: string;
      chargeType: "percentage" | "flat_amount";
      chargeValue: number;
      chargeAmount: number;
      gstRate: number;
      chargeCGST: number;
      chargeSGST: number;
      chargeIGST: number;
      chargeTotalTax: number;
    }> = [];

    let totalChargesAmount = 0;
    let totalChargesCGST = 0;
    let totalChargesSGST = 0;
    let totalChargesIGST = 0;

    additionalCharges.forEach((charge) => {
      if (!charge.ledger_id || charge.charge_value <= 0) return;

      const ledger = allLedgers.find((l) => l.id === charge.ledger_id);
      if (!ledger) return;

      // Calculate charge amount based on type (matches backend trigger logic)
      let chargeAmount = 0;
      if (charge.charge_type === "percentage") {
        chargeAmount = roundCurrency(
          (amountAfterDiscount * charge.charge_value) / 100,
        );
      } else {
        chargeAmount = roundCurrency(charge.charge_value);
      }

      // Calculate GST on charge amount (matches backend trigger logic)
      const gstRate = ledger.gst_rate || 0;
      let chargeCGST = 0;
      let chargeSGST = 0;
      let chargeIGST = 0;

      if (gstRate > 0) {
        if (taxType === "gst") {
          chargeCGST = roundCurrency((chargeAmount * (gstRate / 2)) / 100);
          chargeSGST = roundCurrency((chargeAmount * (gstRate / 2)) / 100);
        } else if (taxType === "igst") {
          chargeIGST = roundCurrency((chargeAmount * gstRate) / 100);
        }
      }

      const chargeTotalTax = roundCurrency(chargeCGST + chargeSGST + chargeIGST);

      chargeLineItems.push({
        ledgerName: ledger.name,
        chargeType: charge.charge_type,
        chargeValue: charge.charge_value,
        chargeAmount,
        gstRate,
        chargeCGST,
        chargeSGST,
        chargeIGST,
        chargeTotalTax,
      });

      totalChargesAmount += chargeAmount;
      totalChargesCGST += chargeCGST;
      totalChargesSGST += chargeSGST;
      totalChargesIGST += chargeIGST;
    });

    totalChargesAmount = roundCurrency(totalChargesAmount);
    totalChargesCGST = roundCurrency(totalChargesCGST);
    totalChargesSGST = roundCurrency(totalChargesSGST);
    totalChargesIGST = roundCurrency(totalChargesIGST);

    // Step 4: Distribute discount proportionally across line items (matches with_proportional_discount CTE)
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

    // Step 5: Calculate taxes per line (matches lines 222-224)
    let totalItemsCGST = 0;
    let totalItemsSGST = 0;
    let totalItemsIGST = 0;

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
        totalItemsCGST += item.lineCGST;
        totalItemsSGST += item.lineSGST;
      } else if (taxType === "igst") {
        // IGST is full GST rate (line 224)
        item.lineIGST = roundCurrency((item.lineTaxableValue * gstRate) / 100);
        totalItemsIGST += item.lineIGST;
      }

      item.lineTotalTax = roundCurrency(
        item.lineCGST + item.lineSGST + item.lineIGST,
      );
    });

    // Step 6: Calculate totals (matches backend trigger logic from 0049_invoice_items.sql)
    const totalGrossAmount = roundCurrency(subtotal);
    const totalDiscountAmount = roundCurrency(globalDiscountAmount);

    // Taxable amount = amount_after_discount + charges_amount (matches backend)
    const totalTaxableAmount = roundCurrency(amountAfterDiscount + totalChargesAmount);

    // Total tax = items tax + charges tax (matches backend)
    totalItemsCGST = roundCurrency(totalItemsCGST);
    totalItemsSGST = roundCurrency(totalItemsSGST);
    totalItemsIGST = roundCurrency(totalItemsIGST);

    const totalCGST = roundCurrency(totalItemsCGST + totalChargesCGST);
    const totalSGST = roundCurrency(totalItemsSGST + totalChargesSGST);
    const totalIGST = roundCurrency(totalItemsIGST + totalChargesIGST);
    const totalTax = roundCurrency(totalCGST + totalSGST + totalIGST);

    // Step 7: Calculate grand total and round-off (matches backend)
    const grandTotalBeforeRounding = totalTaxableAmount + totalTax;
    const grandTotal = Math.round(grandTotalBeforeRounding); // Round to nearest integer
    const roundOff = roundCurrency(grandTotal - grandTotalBeforeRounding);

    return {
      lineItems,
      chargeLineItems,
      subtotal: totalGrossAmount,
      discountAmount: totalDiscountAmount,
      chargesAmount: totalChargesAmount,
      taxableAmount: totalTaxableAmount,
      totalCGST,
      totalSGST,
      totalIGST,
      totalTax,
      roundOff,
      grandTotal,
    };
  }, [
    products,
    productSelections,
    taxType,
    discountType,
    discountValue,
    additionalCharges,
    allLedgers,
  ]);

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
    <div className="flex-1 overflow-y-auto">
      {/* Partner Section */}
      {partner && (
        <div className="border-b border-border">
          <div className="flex items-center gap-3 p-4">
            {/* Partner Image */}
            <ImageWrapper
              size="sm"
              shape="circle"
              imageUrl={undefined}
              alt={partner.display_name || "Partner"}
              placeholderInitials={getInitials(
                partner.display_name || "Partner",
              )}
            />

            {/* Partner Info */}
            <div className="flex-1 min-w-0">
              <p
                title={partner.display_name || "Partner"}
                className="text-base font-medium text-gray-700 truncate"
              >
                {partner.display_name || "Partner"}
              </p>
              {partner.gst_number && (
                <p
                  title={`GSTIN: ${partner.gst_number}`}
                  className="text-sm text-gray-500 truncate"
                >
                  GSTIN: {partner.gst_number}
                </p>
              )}
            </div>
          </div>

          {/* Addresses */}
          <div className="flex border-t border-border">
            {/* Billing Address */}
            <div className="flex-1 p-4 border-r border-border">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Billing Address
              </p>
              <div className="text-sm text-gray-700">
                {getFormattedAddress(mapPartnerBillingAddress(partner)).map(
                  (line, idx) => (
                    <p key={idx}>{line}</p>
                  ),
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="flex-1 p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Shipping Address
              </p>
              <div className="text-sm text-gray-700 space-y-0.5">
                {partner.shipping_same_as_billing ? (
                  <p className="text-gray-500 italic">Same as billing</p>
                ) : (
                  getFormattedAddress(getPartnerShippingAddress(partner)).map(
                    (line, idx) => <p key={idx}>{line}</p>,
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Line Items List */}
      <div>
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

      {/* Totals Summary */}
      <div className="p-4 space-y-4">
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

        {/* Additional Charges */}
        {calculations.chargeLineItems.length > 0 && (
          <>
            <Separator className="my-2" />
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase">
                Additional Charges
              </p>
              {calculations.chargeLineItems.map((charge, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {charge.ledgerName}
                    {charge.chargeType === "percentage" &&
                      ` (${charge.chargeValue}%)`}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(charge.chargeAmount + charge.chargeTotalTax)}
                  </span>
                </div>
              ))}
            </div>
            <Separator className="my-2" />
          </>
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
