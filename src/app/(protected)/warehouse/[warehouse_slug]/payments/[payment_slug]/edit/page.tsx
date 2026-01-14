"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { InvoiceAllocationStep } from "../../create/InvoiceAllocationStep";
import { PaymentReviewStep } from "../../create/PaymentReviewStep";
import { PaymentDetailsStep } from "../../create/PaymentDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  usePaymentMutations,
  usePaymentBySlug,
} from "@/lib/query/hooks/payments";
import { useOutstandingInvoices } from "@/lib/query/hooks/payments";
import { useLedgers } from "@/lib/query/hooks/ledgers";
import type { CreatePaymentData } from "@/types/payments.types";
import type {
  AllocationType,
  PaymentMode,
  VoucherType,
} from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

interface PaymentFormData {
  partyLedgerId: string;
  advanceAmount: string;
  invoiceAllocations: Array<{ invoiceId: string; amount: number }>;
  tdsApplicable: boolean;
  tdsRate: string;
  counterLedgerId: string;
  paymentDate: string;
  paymentMode: PaymentMode | "";
  referenceNumber: string;
  referenceDate: string;
  notes: string;
}

type FormStep = "partner" | "allocation" | "details" | "review";

export default function EditPaymentPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const params = useParams();
  const payment_slug = params.payment_slug as string;

  // Fetch existing payment
  const { data: payment, isLoading, error } = usePaymentBySlug(payment_slug);

  // Fetch TDS ledgers for auto-selection (must be before any conditional hooks)
  const { data: tdsLedgers = [] } = useLedgers({ ledger_type: "tax" });

  // Payment mutations
  const { updateWithAllocations } = usePaymentMutations();

  // Extract payment type and allocation type from payment data
  const payment_type = payment?.voucher_type as VoucherType | undefined;
  const allocation_type = useMemo((): AllocationType | undefined => {
    if (!payment?.payment_allocations) return undefined;
    // Check if any allocation is 'advance' type
    const hasAdvance = payment.payment_allocations.some(
      (a) => a.allocation_type === "advance",
    );
    const hasAgainstRef = payment.payment_allocations.some(
      (a) => a.allocation_type === "against_ref",
    );
    // If has advance allocations (or only advance), treat as advance flow
    // If has only against_ref allocations, treat as against_ref flow
    return hasAdvance && !hasAgainstRef ? "advance" : "against_ref";
  }, [payment]);

  // Configuration based on payment_type and allocation_type
  const isReceipt = payment_type === "receipt";
  const isAdvanceFlow = allocation_type === "advance";
  const partnerType = isReceipt ? "customer" : "supplier";
  const invoiceTypeForAllocations = isReceipt ? "sales" : "purchase";
  const pageTitle = isReceipt ? "Edit Receipt" : "Edit Payment";
  const successMessage = isReceipt
    ? "Receipt updated successfully"
    : "Payment updated successfully";

  const [currentStep, setCurrentStep] = useState<FormStep>("partner");

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );

  const [formData, setFormData] = useState<PaymentFormData>({
    partyLedgerId: "",
    advanceAmount: "",
    invoiceAllocations: [],
    tdsApplicable: false,
    tdsRate: "",
    counterLedgerId: "",
    paymentDate: "",
    paymentMode: "",
    referenceNumber: "",
    referenceDate: "",
    notes: "",
  });

  // Fetch invoices for the allocations to show in review
  const { data: outstandingInvoices = [] } = useOutstandingInvoices({
    partyLedgerId: formData.partyLedgerId,
    invoiceType: invoiceTypeForAllocations,
    enabled: allocation_type === "against_ref" && !!formData.partyLedgerId,
  });

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Prefill form data when payment is loaded
  useEffect(() => {
    if (!payment) return;

    // Check if payment can be edited
    if (payment.is_cancelled) {
      toast.error("Cannot edit a cancelled payment");
      router.push(`/warehouse/${warehouse.slug}/payments/${payment_slug}`);
      return;
    }

    if (payment.exported_to_tally_at) {
      toast.error("Cannot edit a payment that has been exported to Tally");
      router.push(`/warehouse/${warehouse.slug}/payments/${payment_slug}`);
      return;
    }

    // Extract partner_id from party_ledger if available
    const partnerId = payment.party_ledger?.partner_id || null;
    setSelectedPartnerId(partnerId);

    // Calculate advance amount (sum of all advance allocations)
    const advanceAllocations = payment.payment_allocations.filter(
      (a) => a.allocation_type === "advance",
    );
    const totalAdvance = advanceAllocations.reduce(
      (sum, a) => sum + a.amount_applied,
      0,
    );

    // Extract invoice allocations (against_ref only)
    const invoiceAllocations = payment.payment_allocations
      .filter((a) => a.allocation_type === "against_ref" && a.invoice_id)
      .map((a) => ({
        invoiceId: a.invoice_id!,
        amount: a.amount_applied,
      }));

    setFormData({
      partyLedgerId: payment.party_ledger_id,
      advanceAmount: totalAdvance > 0 ? totalAdvance.toString() : "",
      invoiceAllocations,
      tdsApplicable: payment.tds_applicable ?? false,
      tdsRate: payment.tds_rate?.toString() || "",
      counterLedgerId: payment.counter_ledger_id,
      paymentDate: payment.payment_date,
      paymentMode: payment.payment_mode,
      referenceNumber: payment.reference_number || "",
      referenceDate: payment.reference_date || "",
      notes: payment.notes || "",
    });
  }, [payment, payment_slug, router, warehouse.slug]);

  // Validation logic
  const canProceedFromPartner = useMemo(
    () => selectedPartnerId !== null,
    [selectedPartnerId],
  );

  const canProceedFromAllocation = useMemo(() => {
    if (allocation_type === "advance") {
      const amount = parseFloat(formData.advanceAmount);
      return !isNaN(amount) && amount > 0;
    }
    return (
      formData.invoiceAllocations.length > 0 &&
      formData.invoiceAllocations.every((a) => a.amount > 0)
    );
  }, [allocation_type, formData.advanceAmount, formData.invoiceAllocations]);

  const canSubmit = useMemo(() => {
    const basicFieldsValid =
      formData.counterLedgerId !== "" &&
      formData.paymentDate !== "" &&
      formData.paymentMode !== "";

    const tdsValid = !formData.tdsApplicable || formData.tdsRate !== "";

    if (isAdvanceFlow) {
      return basicFieldsValid && canProceedFromAllocation && tdsValid;
    } else {
      return basicFieldsValid && canProceedFromAllocation && tdsValid;
    }
  }, [
    formData.counterLedgerId,
    formData.paymentDate,
    formData.paymentMode,
    formData.tdsApplicable,
    formData.tdsRate,
    canProceedFromAllocation,
    isAdvanceFlow,
  ]);

  // Navigation
  const handleNext = () => {
    if (isAdvanceFlow) {
      // Advance flow: Partner → Details
      if (currentStep === "partner") {
        setCurrentStep("details");
      }
    } else {
      // Against ref flow: Partner → Allocation → Details → Review
      if (currentStep === "partner") {
        setCurrentStep("allocation");
      } else if (currentStep === "allocation") {
        setCurrentStep("details");
      } else if (currentStep === "details") {
        setCurrentStep("review");
      }
    }
  };

  const handleBack = () => {
    if (isAdvanceFlow) {
      // Advance flow: Partner ← Details
      if (currentStep === "details") {
        setCurrentStep("partner");
      }
    } else {
      // Against ref flow: Partner ← Allocation ← Details ← Review
      if (currentStep === "review") {
        setCurrentStep("details");
      } else if (currentStep === "details") {
        setCurrentStep("allocation");
      } else if (currentStep === "allocation") {
        setCurrentStep("partner");
      }
    }
  };

  const handleSelectPartner = (partnerId: string, ledgerId: string) => {
    setSelectedPartnerId(partnerId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, partyLedgerId: ledgerId }));
      // For advance flow, go to details; for against_ref, go to allocation
      setCurrentStep(isAdvanceFlow ? "details" : "allocation");
    }, 300);
  };

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse.slug}/payments/${payment_slug}/details`,
    );
  };

  const handleSubmit = () => {
    if (!canSubmit || !payment) return;

    // Auto-select TDS ledger based on voucher type
    const tdsLedgerId = formData.tdsApplicable
      ? payment_type === "receipt"
        ? tdsLedgers.find((l) => l.name === "TCS Receivable")?.id
        : tdsLedgers.find((l) => l.name === "TDS Payable")?.id
      : undefined;

    // Calculate total amount
    const totalAmount =
      allocation_type === "advance"
        ? parseFloat(formData.advanceAmount)
        : formData.invoiceAllocations.reduce((sum, a) => sum + a.amount, 0);

    // Build allocations array
    const allocations =
      allocation_type === "advance"
        ? [
            {
              allocation_type: "advance" as const,
              invoice_id: null,
              amount_applied: parseFloat(formData.advanceAmount),
            },
          ]
        : formData.invoiceAllocations.map((a) => ({
            allocation_type: "against_ref" as const,
            invoice_id: a.invoiceId,
            amount_applied: a.amount,
          }));

    // Prepare payment data
    const paymentData: CreatePaymentData = {
      voucher_type: payment_type!,
      party_ledger_id: formData.partyLedgerId,
      counter_ledger_id: formData.counterLedgerId,
      payment_date: formData.paymentDate,
      payment_mode: formData.paymentMode as PaymentMode,
      reference_number: formData.referenceNumber || undefined,
      reference_date: formData.referenceDate || undefined,
      total_amount: totalAmount,
      tds_applicable: formData.tdsApplicable,
      tds_rate: formData.tdsApplicable
        ? parseFloat(formData.tdsRate)
        : undefined,
      tds_ledger_id: tdsLedgerId,
      notes: formData.notes || undefined,
      attachments: undefined,
      allocations,
    };

    // Update payment using mutation
    updateWithAllocations.mutate(
      { paymentId: payment.id, paymentData },
      {
        onSuccess: () => {
          toast.success(successMessage);
          router.push(`/warehouse/${warehouse.slug}/payments/${payment_slug}`);
        },
        onError: (error) => {
          console.error(`Error updating ${payment_type}:`, error);
          toast.error(`Failed to update ${payment_type}`);
        },
      },
    );
  };

  // Get invoice details for review step
  const invoiceAllocationsWithDetails = formData.invoiceAllocations.map(
    (a) => ({
      ...a,
      invoice: outstandingInvoices.find((inv) => inv.id === a.invoiceId),
    }),
  );

  // Calculate total amount for TDS preview
  const totalAmount = useMemo(() => {
    if (allocation_type === "advance") {
      return parseFloat(formData.advanceAmount) || 0;
    }
    return formData.invoiceAllocations.reduce((sum, a) => sum + a.amount, 0);
  }, [allocation_type, formData.advanceAmount, formData.invoiceAllocations]);

  // Calculate step numbers dynamically based on flow
  const { currentStepNumber, totalSteps } = useMemo(() => {
    if (isAdvanceFlow) {
      // Advance: Partner (1) → Details (2)
      return {
        currentStepNumber: currentStep === "partner" ? 1 : 2,
        totalSteps: 2,
      };
    } else {
      // Against ref: Partner (1) → Allocation (2) → Details (3) → Review (4)
      return {
        currentStepNumber:
          currentStep === "partner"
            ? 1
            : currentStep === "allocation"
              ? 2
              : currentStep === "details"
                ? 3
                : 4,
        totalSteps: 4,
      };
    }
  }, [isAdvanceFlow, currentStep]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">Loading payment...</p>
      </div>
    );
  }

  // Show error state
  if (error || !payment) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">Failed to load payment</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={pageTitle}
          currentStep={currentStepNumber}
          totalSteps={totalSteps}
          onCancel={handleCancel}
          disableCancel={updateWithAllocations.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "partner" ? (
            <PartnerSelectionStep
              partnerType={partnerType}
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={handleSelectPartner}
            />
          ) : currentStep === "allocation" ? (
            <InvoiceAllocationStep
              invoiceAllocations={formData.invoiceAllocations}
              onAddInvoiceAllocation={(invoiceId, amount) =>
                setFormData((prev) => ({
                  ...prev,
                  invoiceAllocations: [
                    ...prev.invoiceAllocations.filter(
                      (a) => a.invoiceId !== invoiceId,
                    ),
                    { invoiceId, amount },
                  ],
                }))
              }
              onRemoveInvoiceAllocation={(invoiceId) =>
                setFormData((prev) => ({
                  ...prev,
                  invoiceAllocations: prev.invoiceAllocations.filter(
                    (a) => a.invoiceId !== invoiceId,
                  ),
                }))
              }
              partyLedgerId={formData.partyLedgerId}
              invoiceType={invoiceTypeForAllocations}
            />
          ) : currentStep === "details" ? (
            <PaymentDetailsStep
              isAdvanceFlow={isAdvanceFlow}
              totalAmount={totalAmount}
              formData={{
                advanceAmount: formData.advanceAmount,
                counterLedgerId: formData.counterLedgerId,
                paymentDate: formData.paymentDate,
                paymentMode: formData.paymentMode,
                referenceNumber: formData.referenceNumber,
                referenceDate: formData.referenceDate,
                notes: formData.notes,
                tdsApplicable: formData.tdsApplicable,
                tdsRate: formData.tdsRate,
              }}
              setFormData={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          ) : (
            <PaymentReviewStep
              allocationType={allocation_type!}
              advanceAmount={formData.advanceAmount}
              invoiceAllocations={invoiceAllocationsWithDetails}
              tdsApplicable={formData.tdsApplicable}
              tdsRate={formData.tdsRate}
            />
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <FormFooter>
          {currentStep === "partner" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateWithAllocations.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  !canProceedFromPartner || updateWithAllocations.isPending
                }
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : currentStep === "allocation" ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={updateWithAllocations.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  !canProceedFromAllocation || updateWithAllocations.isPending
                }
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : currentStep === "details" ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={updateWithAllocations.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={isAdvanceFlow ? handleSubmit : handleNext}
                disabled={
                  isAdvanceFlow
                    ? !canSubmit || updateWithAllocations.isPending
                    : !canProceedFromAllocation ||
                      updateWithAllocations.isPending
                }
                className="flex-1"
              >
                {isAdvanceFlow
                  ? updateWithAllocations.isPending
                    ? "Saving..."
                    : "Submit"
                  : "Next"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={updateWithAllocations.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || updateWithAllocations.isPending}
                className="flex-1"
              >
                {updateWithAllocations.isPending ? "Saving..." : "Submit"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
