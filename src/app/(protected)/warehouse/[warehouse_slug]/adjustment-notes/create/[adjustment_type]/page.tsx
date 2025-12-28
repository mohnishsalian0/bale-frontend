"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { InvoiceSelectionStep } from "../../InvoiceSelectionStep";
import { AdjustmentProductSelectionStep } from "../../AdjustmentProductSelectionStep";
import { AdjustmentDetailsStep } from "../../AdjustmentDetailsStep";
import { AdjustmentReviewStep } from "../../AdjustmentReviewStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { useAdjustmentNoteMutations } from "@/lib/query/hooks/adjustment-notes";
import { useLedgers } from "@/lib/query/hooks/ledgers";
import { getInvoiceForAdjustment } from "@/lib/queries/adjustment-notes";
import type {
  AdjustmentType,
  InvoiceTaxType,
  PartnerType,
} from "@/types/database/enums";
import type { InvoiceForAdjustment } from "@/types/adjustment-notes.types";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

interface ProductSelection {
  selected: boolean;
  quantity: number;
  rate: number;
}

type FormStep = "partner" | "invoice" | "products" | "details" | "review";

export default function CreateAdjustmentNotePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { warehouse_slug, adjustment_type } = params as {
    warehouse_slug: string;
    adjustment_type: AdjustmentType;
  };
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();

  const invoiceNumberFromQuery = searchParams.get("invoice_number");

  const isCreditNote = adjustment_type === "credit";
  const partnerType: PartnerType = isCreditNote ? "customer" : "supplier";
  const ledgerName = isCreditNote ? "Sales Return" : "Purchase Return";
  const pageTitle = isCreditNote ? "Create Credit Note" : "Create Debit Note";
  const successMessage = isCreditNote
    ? "Credit note created successfully"
    : "Debit note created successfully";

  const [currentStep, setCurrentStep] = useState<FormStep>(
    invoiceNumberFromQuery ? "products" : "partner"
  );
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceForAdjustment | null>(null);
  const [productSelections, setProductSelections] = useState<
    Record<string, ProductSelection>
  >({});
  const [formData, setFormData] = useState({
    adjustmentDate: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Fetch ledgers
  const { data: ledgers } = useLedgers();
  const counterLedger = ledgers?.find((l) => l.name === ledgerName);

  // Adjustment note mutations
  const { create: createAdjustmentNote } = useAdjustmentNoteMutations();

  const handleSelectPartner = (partnerId: string, _ledgerId: string) => {
    setSelectedPartnerId(partnerId);
    // Auto-advance to next step
    setTimeout(() => {
      setCurrentStep("invoice");
    }, 300);
  };

  const handleSelectInvoice = async (invoiceNumber: string) => {
    try {
      // Fetch full invoice with items
      const invoice = await getInvoiceForAdjustment(invoiceNumber);
      setSelectedInvoice(invoice);

      // Initialize product selections from invoice items
      const selections: Record<string, ProductSelection> = {};
      invoice.invoice_items.forEach((item) => {
        selections[item.product_id] = {
          selected: false,
          quantity: 0,
          rate: item.rate || 0,
        };
      });
      setProductSelections(selections);

      // Auto-advance to next step
      setTimeout(() => {
        setCurrentStep("products");
      }, 300);
    } catch (error) {
      toast.error("Failed to load invoice details");
      console.error(error);
    }
  };

  // Handle prefilled invoice from query parameter
  useEffect(() => {
    if (invoiceNumberFromQuery && !selectedInvoice) {
      handleSelectInvoice(invoiceNumberFromQuery);
    }
  }, [invoiceNumberFromQuery]);

  const handleQuantityChange = (
    productId: string,
    quantity: number,
    rate: number,
  ) => {
    setProductSelections((prev) => ({
      ...prev,
      [productId]: { selected: true, quantity, rate },
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    setProductSelections((prev) => ({
      ...prev,
      [productId]: { selected: false, quantity: 0, rate: 0 },
    }));
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse_slug}/adjustment-notes`);
  };

  const handleSubmit = () => {
    if (!selectedInvoice || !warehouse || !canSubmit) return;

    // Validate counter ledger exists
    if (!counterLedger) {
      toast.error(
        `${ledgerName} ledger not found. Please ensure default ledgers are seeded.`,
      );
      return;
    }

    // Additional validation for credit notes
    if (
      isCreditNote &&
      totals.total > (selectedInvoice.outstanding_amount || 0)
    ) {
      toast.error(`Credit note total cannot exceed invoice outstanding amount`);
      return;
    }

    const items = selectedProducts.map((p) => ({
      product_id: p.productId,
      quantity: p.quantity,
      rate: p.rate,
      gst_rate: p.gstRate,
    }));

    createAdjustmentNote.mutate(
      {
        invoice_id: selectedInvoice.id,
        warehouse_id: warehouse.id,
        counter_ledger_id: counterLedger.id,
        adjustment_type: adjustment_type,
        adjustment_date: formData.adjustmentDate,
        reason: formData.reason,
        notes: formData.notes || null,
        attachments: null,
        items,
      },
      {
        onSuccess: (adjustmentNumber) => {
          toast.success(successMessage);
          router.push(
            `/warehouse/${warehouse_slug}/adjustment-notes/${adjustmentNumber}`,
          );
        },
        onError: (error) => {
          console.error(`Error creating ${adjustment_type} note:`, error);
          toast.error(`Failed to create ${adjustment_type} note`);
        },
      },
    );
  };

  const handleNext = () => {
    if (currentStep === "partner" && canProceedFromPartner) {
      setCurrentStep("invoice");
    } else if (currentStep === "invoice" && canProceedFromInvoice) {
      setCurrentStep("products");
    } else if (currentStep === "products" && canProceedFromProducts) {
      setCurrentStep("details");
    } else if (currentStep === "details" && canProceedFromDetails) {
      setCurrentStep("review");
    }
  };

  const handleBack = () => {
    if (currentStep === "review") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("invoice");
    } else if (currentStep === "invoice") {
      setCurrentStep("partner");
    }
  };

  // Selected products with invoice item data
  const selectedProducts = (() => {
    if (!selectedInvoice) return [];

    return selectedInvoice.invoice_items
      .filter((item) => {
        const selection = productSelections[item.product_id];
        return selection?.selected && selection.quantity > 0;
      })
      .map((item) => {
        const selection = productSelections[item.product_id];
        return {
          productId: item.product_id,
          quantity: selection.quantity,
          rate: selection.rate,
          gstRate: item.gst_rate || 0,
        };
      });
  })();

  // Calculate totals
  const totals = (() => {
    if (!selectedInvoice || selectedProducts.length === 0) {
      return { subtotal: 0, tax: 0, total: 0 };
    }

    const subtotal = selectedProducts.reduce(
      (sum, p) => sum + p.quantity * p.rate,
      0,
    );

    const tax = selectedProducts.reduce((sum, p) => {
      const taxableAmount = p.quantity * p.rate;
      return sum + (taxableAmount * p.gstRate) / 100;
    }, 0);

    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  })();

  // Validation flags
  const canProceedFromPartner = !!selectedPartnerId;
  const canProceedFromInvoice = !!selectedInvoice;
  const canProceedFromProducts = selectedProducts.length > 0;
  const canProceedFromDetails = formData.reason.trim().length > 0;
  const canSubmit = canProceedFromProducts && canProceedFromDetails;

  const getStepNumber = () => {
    switch (currentStep) {
      case "partner":
        return 1;
      case "invoice":
        return 2;
      case "products":
        return 3;
      case "details":
        return 4;
      case "review":
        return 5;
      default:
        return 1;
    }
  };

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={pageTitle}
          currentStep={getStepNumber()}
          totalSteps={5}
          onCancel={handleCancel}
          disableCancel={createAdjustmentNote.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "partner" ? (
            <PartnerSelectionStep
              partnerType={partnerType}
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={handleSelectPartner}
            />
          ) : currentStep === "invoice" ? (
            <InvoiceSelectionStep
              adjustmentType={adjustment_type}
              selectedPartnerId={selectedPartnerId}
              warehouseId={warehouse.id}
              onSelectInvoice={handleSelectInvoice}
            />
          ) : currentStep === "products" && selectedInvoice ? (
            <AdjustmentProductSelectionStep
              invoiceItems={selectedInvoice.invoice_items}
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : currentStep === "details" && selectedInvoice ? (
            <AdjustmentDetailsStep
              adjustmentDate={formData.adjustmentDate}
              reason={formData.reason}
              notes={formData.notes}
              taxType={selectedInvoice.tax_type as InvoiceTaxType}
              onAdjustmentDateChange={(date) =>
                setFormData((prev) => ({ ...prev, adjustmentDate: date }))
              }
              onReasonChange={(reason) =>
                setFormData((prev) => ({ ...prev, reason }))
              }
              onNotesChange={(notes) =>
                setFormData((prev) => ({ ...prev, notes }))
              }
            />
          ) : currentStep === "review" && selectedInvoice ? (
            <AdjustmentReviewStep
              invoiceItems={selectedInvoice.invoice_items}
              productSelections={productSelections}
              taxType={selectedInvoice.tax_type as InvoiceTaxType}
              adjustmentType={adjustment_type}
              invoiceOutstanding={selectedInvoice.outstanding_amount || 0}
            />
          ) : null}
        </div>

        {/* Footer - Fixed at bottom */}
        <FormFooter>
          {currentStep === "partner" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={createAdjustmentNote.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  !canProceedFromPartner || createAdjustmentNote.isPending
                }
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : currentStep === "invoice" ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createAdjustmentNote.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  !canProceedFromInvoice || createAdjustmentNote.isPending
                }
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : currentStep === "products" ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createAdjustmentNote.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  !canProceedFromProducts || createAdjustmentNote.isPending
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
                disabled={createAdjustmentNote.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={
                  !canProceedFromDetails || createAdjustmentNote.isPending
                }
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createAdjustmentNote.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createAdjustmentNote.isPending}
                className="flex-1"
              >
                {createAdjustmentNote.isPending ? "Saving..." : "Submit"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
