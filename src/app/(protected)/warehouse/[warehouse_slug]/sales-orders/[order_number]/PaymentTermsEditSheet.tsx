"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import type { DiscountType } from "@/types/database/enums";

interface PaymentTermsEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentPaymentTerms: string | null;
  currentAdvanceAmount: number;
  currentDiscountType: DiscountType;
  currentDiscountValue: number;
}

export function PaymentTermsEditSheet({
  open,
  onOpenChange,
  orderId,
  currentPaymentTerms,
  currentAdvanceAmount,
  currentDiscountType,
  currentDiscountValue,
}: PaymentTermsEditSheetProps) {
  const [paymentTerms, setPaymentTerms] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>("none");
  const [discountValue, setDiscountValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setPaymentTerms(currentPaymentTerms || "");
      setAdvanceAmount(currentAdvanceAmount);
      setDiscountType(currentDiscountType);
      setDiscountValue(currentDiscountValue);
    }
  }, [
    open,
    currentPaymentTerms,
    currentAdvanceAmount,
    currentDiscountType,
    currentDiscountValue,
  ]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("sales_orders")
        .update({
          payment_terms: paymentTerms || null,
          advance_amount: advanceAmount,
          discount_type: discountType,
          discount_value: discountType === "none" ? 0 : discountValue,
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Payment terms updated");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating payment terms:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update payment terms",
      );
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-6 p-4 md:px-0">
      {/* Payment Terms */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="payment-terms">Payment terms</Label>
        <Input
          id="payment-terms"
          type="text"
          placeholder="e.g., Net 30, Due on delivery"
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
        />
      </div>

      {/* Advance Amount */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="advance-amount">Advance amount</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            ₹
          </span>
          <Input
            id="advance-amount"
            type="number"
            placeholder="0"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
            className="pl-7"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      {/* Discount Type */}
      <div className="flex flex-col gap-2">
        <Label>Discount type</Label>
        <RadioGroup
          value={discountType}
          onValueChange={(value) => setDiscountType(value as DiscountType)}
          name="discount-type"
        >
          <RadioGroupItem value="none">None</RadioGroupItem>
          <RadioGroupItem value="percentage">Percentage</RadioGroupItem>
          <RadioGroupItem value="flat_amount">Flat amount</RadioGroupItem>
        </RadioGroup>
      </div>

      {/* Discount Value - Conditional */}
      {discountType !== "none" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="discount-value">
            {discountType === "percentage"
              ? "Discount percentage"
              : "Discount amount"}
          </Label>
          <div className="relative">
            {discountType === "percentage" && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                %
              </span>
            )}
            {discountType === "flat_amount" && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                ₹
              </span>
            )}
            <Input
              id="discount-value"
              type="number"
              placeholder="0"
              value={discountValue}
              onChange={(e) =>
                setDiscountValue(parseFloat(e.target.value) || 0)
              }
              className={discountType === "flat_amount" ? "pl-7" : "pr-7"}
              min="0"
              max={discountType === "percentage" ? 100 : undefined}
              step="0.01"
            />
          </div>
        </div>
      )}
    </div>
  );

  const footerButtons = (
    <div className="flex gap-3 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        className="flex-1"
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        className="flex-1"
        disabled={loading}
      >
        {loading ? "Saving..." : "Save"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Payment terms</DrawerTitle>
          </DrawerHeader>
          {formContent}
          <DrawerFooter>{footerButtons}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment terms</DialogTitle>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
