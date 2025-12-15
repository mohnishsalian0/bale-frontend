"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import type { DiscountType } from "@/types/database/enums";
import { PAYMENT_TERMS } from "@/types/database/enums";
import type { SalesOrderUpdate } from "@/types/sales-orders.types";
import type { PurchaseOrderUpdate } from "@/types/purchase-orders.types";

interface PaymentTermsEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    data: Partial<SalesOrderUpdate> | Partial<PurchaseOrderUpdate>,
    onSuccessCallback?: () => void,
  ) => void;
  isPending: boolean;
  currentPaymentTerms: string | null;
  currentAdvanceAmount: number;
  currentDiscountType: DiscountType;
  currentDiscountValue: number;
}

export function PaymentTermsEditSheet({
  open,
  onOpenChange,
  onSave,
  isPending,
  currentPaymentTerms,
  currentAdvanceAmount,
  currentDiscountType,
  currentDiscountValue,
}: PaymentTermsEditSheetProps) {
  const [paymentTerms, setPaymentTerms] = useState(currentPaymentTerms || "");
  const [advanceAmount, setAdvanceAmount] = useState(currentAdvanceAmount);
  const [discountType, setDiscountType] =
    useState<DiscountType>(currentDiscountType);
  const [discountValue, setDiscountValue] = useState(currentDiscountValue);

  const handleSave = () => {
    onSave(
      {
        payment_terms: paymentTerms.trim() || null,
        advance_amount: advanceAmount,
        discount_type: discountType,
        discount_value: discountType === "none" ? 0 : discountValue,
      },
      () => onOpenChange(false),
    );
  };

  const formContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="payment-terms">Payment Terms</Label>
        <Input
          id="payment-terms"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          placeholder="e.g., NET 30"
          disabled={isPending}
        />
        <div className="flex flex-wrap gap-2">
          {PAYMENT_TERMS.map((term) => (
            <Badge
              key={term}
              variant="secondary"
              color="gray"
              onClick={() => !isPending && setPaymentTerms(term)}
              className={`cursor-pointer ${!isPending && "hover:bg-gray-200"}`}
            >
              {term}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="advance-amount">Advance Amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            ₹
          </span>
          <Input
            id="advance-amount"
            type="number"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            min={0}
            step={0.01}
            className="pl-7"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Discount Type</Label>
        <RadioGroup
          value={discountType}
          onValueChange={(value) => setDiscountType(value as DiscountType)}
          name="discount-type"
          disabled={isPending}
        >
          <RadioGroupItem value="none">None</RadioGroupItem>
          <RadioGroupItem value="percentage">Percentage</RadioGroupItem>
          <RadioGroupItem value="flat_amount">Flat Amount</RadioGroupItem>
        </RadioGroup>
      </div>

      {discountType !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="discount-value">Discount Value</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              {discountType === "percentage" ? "%" : "₹"}
            </span>
            <Input
              id="discount-value"
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              min={0}
              max={discountType === "percentage" ? 100 : undefined}
              step={discountType === "percentage" ? 1 : 0.01}
              className="pl-7"
              disabled={isPending}
            />
          </div>
        </div>
      )}
    </div>
  );

  const footerButtons = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Payment Terms"
      description="Update payment terms, advance amount, and discount"
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
