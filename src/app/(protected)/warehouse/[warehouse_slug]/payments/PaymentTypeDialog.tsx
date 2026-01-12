"use client";

import { useRouter } from "next/navigation";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useSession } from "@/contexts/session-context";
import type { VoucherType } from "@/types/database/enums";

interface PaymentTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voucherType: VoucherType;
}

export function PaymentTypeDialog({
  open,
  onOpenChange,
  voucherType,
}: PaymentTypeDialogProps) {
  const router = useRouter();
  const { warehouse } = useSession();

  const isReceipt = voucherType === "receipt";
  const title = isReceipt ? "Receive Payment" : "Make Payment";

  const handleSelect = (allocationType: "advance" | "against_ref") => {
    router.push(
      `/warehouse/${warehouse.slug}/payments/create/${voucherType}/${allocationType}`,
    );
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description="Choose how you want to record this payment"
    >
      <div className="flex flex-col gap-3 mb-2">
        <button
          onClick={() => handleSelect("advance")}
          className="flex flex-col p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
        >
          <p className="text-base font-medium text-gray-700">
            {isReceipt ? "Advance Receipt" : "Advance Payment"}
          </p>
          <p className="text-sm text-gray-500">
            Record {isReceipt ? "receipt" : "payment"} without linking to
            specific invoices
          </p>
        </button>

        <button
          onClick={() => handleSelect("against_ref")}
          className="flex flex-col p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors text-left"
        >
          <p className="text-base font-medium text-gray-700">
            Against Invoices
          </p>
          <p className="text-sm text-gray-500">
            Allocate {isReceipt ? "receipt" : "payment"} to outstanding invoices
          </p>
        </button>
      </div>
    </ResponsiveDialog>
  );
}
