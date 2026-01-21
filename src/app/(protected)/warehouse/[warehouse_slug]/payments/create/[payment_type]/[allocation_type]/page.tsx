"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { InvoiceAllocationStep } from "../../InvoiceAllocationStep";
import { PaymentReviewStep } from "../../PaymentReviewStep";
import { PaymentDetailsStep } from "../../PaymentDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { usePaymentMutations } from "@/lib/query/hooks/payments";
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
  notes: string;
  // Instrument fields (cheque, demand_draft)
  instrumentNumber: string;
  instrumentDate: string;
  instrumentBank: string;
  instrumentBranch: string;
  instrumentIfsc: string;
  // Digital payment fields
  transactionId: string;
  vpa: string;
  cardLastFour: string;
}

type FormStep = "partner" | "allocation" | "details" | "review";

export default function CreatePaymentPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const params = useParams();
  const searchParams = useSearchParams();
  const payment_type = params.payment_type as VoucherType;
  const allocation_type = params.allocation_type as AllocationType;

  // Check if coming from invoice details page
  const fromInvoice = searchParams.get("from_invoice") === "true";
  const urlPartyLedgerId = searchParams.get("party_ledger_id");
  const urlInvoiceId = searchParams.get("invoice_id");
  const urlInvoiceSlug = searchParams.get("invoice_slug");
  const urlAllocationAmount = searchParams.get("allocation_amount");

  // Configuration based on payment_type and allocation_type
  const isReceipt = payment_type === "receipt";
  const isAdvanceFlow = allocation_type === "advance";
  const partnerType = isReceipt ? "customer" : "supplier";
  const invoiceTypeForAllocations = isReceipt ? "sales" : "purchase";
  const pageTitle = isReceipt ? "Receive Payment" : "Make Payment";
  const successMessage = isReceipt
    ? "Receipt created successfully"
    : "Payment created successfully";

  // Start at details step if coming from invoice, otherwise start at partner step
  const [currentStep, setCurrentStep] = useState<FormStep>(
    fromInvoice ? "details" : "partner",
  );

  // Payment mutations
  const { create: createPayment } = usePaymentMutations();

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
    notes: "",
    // Instrument fields
    instrumentNumber: "",
    instrumentDate: "",
    instrumentBank: "",
    instrumentBranch: "",
    instrumentIfsc: "",
    // Digital payment fields
    transactionId: "",
    vpa: "",
    cardLastFour: "",
  });

  // Fetch invoices for the allocations to show in review
  const { data: outstandingInvoices = [] } = useOutstandingInvoices({
    partyLedgerId: formData.partyLedgerId,
    invoiceType: invoiceTypeForAllocations,
    enabled: allocation_type === "against_ref" && !!formData.partyLedgerId,
  });

  // Fetch TDS ledgers for auto-selection
  const { data: tdsLedgers = [] } = useLedgers({ ledger_type: "tax" });

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Prefill form data when coming from invoice
  useEffect(() => {
    if (
      fromInvoice &&
      urlPartyLedgerId &&
      urlInvoiceId &&
      urlAllocationAmount
    ) {
      setFormData((prev) => ({
        ...prev,
        partyLedgerId: urlPartyLedgerId,
        invoiceAllocations: [
          {
            invoiceId: urlInvoiceId,
            amount: parseFloat(urlAllocationAmount),
          },
        ],
      }));
      setSelectedPartnerId(urlPartyLedgerId); // Mark partner as selected
    }
  }, [fromInvoice, urlPartyLedgerId, urlInvoiceId, urlAllocationAmount]);

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
    // If coming from invoice, go back to invoice details
    if (fromInvoice && urlInvoiceSlug) {
      router.push(
        `/warehouse/${warehouse.slug}/invoices/${urlInvoiceSlug}/details`,
      );
    } else {
      router.push(`/warehouse/${warehouse.slug}/payments`);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

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
      voucher_type: payment_type,
      party_ledger_id: formData.partyLedgerId,
      counter_ledger_id: formData.counterLedgerId,
      payment_date: formData.paymentDate,
      payment_mode: formData.paymentMode as PaymentMode,
      total_amount: totalAmount,
      tds_applicable: formData.tdsApplicable,
      tds_rate: formData.tdsApplicable
        ? parseFloat(formData.tdsRate)
        : undefined,
      tds_ledger_id: tdsLedgerId,
      notes: formData.notes || undefined,
      attachments: undefined,
      allocations,
      // Instrument fields
      instrument_number: formData.instrumentNumber || undefined,
      instrument_date: formData.instrumentDate || undefined,
      instrument_bank: formData.instrumentBank || undefined,
      instrument_branch: formData.instrumentBranch || undefined,
      instrument_ifsc: formData.instrumentIfsc || undefined,
      // Digital payment fields
      transaction_id: formData.transactionId || undefined,
      vpa: formData.vpa || undefined,
      card_last_four: formData.cardLastFour || undefined,
    };

    // Create payment using mutation
    createPayment.mutate(paymentData, {
      onSuccess: () => {
        toast.success(successMessage);
        // If coming from invoice, go back to invoice details
        if (fromInvoice && urlInvoiceSlug) {
          router.push(
            `/warehouse/${warehouse.slug}/invoices/${urlInvoiceSlug}/details`,
          );
        } else {
          router.push(`/warehouse/${warehouse.slug}/payments`);
        }
      },
      onError: (error) => {
        console.error(`Error creating ${payment_type}:`, error);
        toast.error(`Failed to create ${payment_type}`);
      },
    });
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

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={pageTitle}
          currentStep={currentStepNumber}
          totalSteps={totalSteps}
          onCancel={handleCancel}
          disableCancel={createPayment.isPending}
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
                notes: formData.notes,
                tdsApplicable: formData.tdsApplicable,
                tdsRate: formData.tdsRate,
                // Instrument fields
                instrumentNumber: formData.instrumentNumber,
                instrumentDate: formData.instrumentDate,
                instrumentBank: formData.instrumentBank,
                instrumentBranch: formData.instrumentBranch,
                instrumentIfsc: formData.instrumentIfsc,
                // Digital payment fields
                transactionId: formData.transactionId,
                vpa: formData.vpa,
                cardLastFour: formData.cardLastFour,
              }}
              setFormData={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          ) : (
            <PaymentReviewStep
              allocationType={allocation_type}
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
                disabled={createPayment.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromPartner || createPayment.isPending}
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
                disabled={createPayment.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromAllocation || createPayment.isPending}
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
                disabled={createPayment.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={isAdvanceFlow ? handleSubmit : handleNext}
                disabled={
                  isAdvanceFlow
                    ? !canSubmit || createPayment.isPending
                    : !canProceedFromAllocation || createPayment.isPending
                }
                className="flex-1"
              >
                {isAdvanceFlow
                  ? createPayment.isPending
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
                disabled={createPayment.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createPayment.isPending}
                className="flex-1"
              >
                {createPayment.isPending ? "Saving..." : "Submit"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
