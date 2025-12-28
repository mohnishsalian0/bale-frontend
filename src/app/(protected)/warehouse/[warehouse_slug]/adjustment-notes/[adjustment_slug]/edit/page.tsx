"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { InvoiceSelectionStep } from "../../InvoiceSelectionStep";
import { AdjustmentProductSelectionStep } from "../../AdjustmentProductSelectionStep";
import { AdjustmentDetailsStep } from "../../AdjustmentDetailsStep";
import { AdjustmentReviewStep } from "../../AdjustmentReviewStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  useAdjustmentNoteMutations,
  useAdjustmentNoteBySlug,
} from "@/lib/query/hooks/adjustment-notes";
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
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";

interface ProductSelection {
  selected: boolean;
  quantity: number;
  rate: number;
}

type FormStep = "partner" | "invoice" | "products" | "details" | "review";

export default function EditAdjustmentNotePage() {
  const router = useRouter();
  const params = useParams();
  const { warehouse_slug, adjustment_slug } = params as {
    warehouse_slug: string;
    adjustment_slug: string;
  };
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();

  // Fetch existing adjustment note
  const {
    data: existingAdjustmentNote,
    isLoading: adjustmentNoteLoading,
    isError: adjustmentNoteError,
  } = useAdjustmentNoteBySlug(adjustment_slug);

  // Fetch ledgers
  const { data: ledgers } = useLedgers();

  // Adjustment note mutations
  const { updateWithItems } = useAdjustmentNoteMutations();

  // Extract adjustment type from existing data
  const adjustment_type = existingAdjustmentNote?.adjustment_type as
    | AdjustmentType
    | undefined;

  const isCreditNote = adjustment_type === "credit";
  const partnerType: PartnerType = isCreditNote ? "customer" : "supplier";
  const ledgerName = isCreditNote ? "Sales Return" : "Purchase Return";
  const pageTitle = isCreditNote ? "Edit Credit Note" : "Edit Debit Note";
  const successMessage = isCreditNote
    ? "Credit note updated successfully"
    : "Debit note updated successfully";

  const [currentStep, setCurrentStep] = useState<FormStep>("partner");
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

  const counterLedger = ledgers?.find((l) => l.name === ledgerName);

  // Prefill form data when adjustment note is loaded
  useEffect(() => {
    if (!existingAdjustmentNote) return;

    // Check if adjustment note can be edited
    if (existingAdjustmentNote.is_cancelled) {
      toast.error("Cannot edit a cancelled adjustment note");
      router.push(
        `/warehouse/${warehouse_slug}/adjustment-notes/${adjustment_slug}`,
      );
      return;
    }

    if (existingAdjustmentNote.exported_to_tally_at) {
      toast.error(
        "Cannot edit an adjustment note that has been exported to Tally",
      );
      router.push(
        `/warehouse/${warehouse_slug}/adjustment-notes/${adjustment_slug}`,
      );
      return;
    }

    // Set selected partner from party_ledger
    const partnerId = existingAdjustmentNote.party_ledger?.partner_id || null;
    setSelectedPartnerId(partnerId);

    // Set adjustment date and form data
    setFormData({
      adjustmentDate: existingAdjustmentNote.adjustment_date,
      reason: existingAdjustmentNote.reason || "",
      notes: existingAdjustmentNote.notes || "",
    });

    // Fetch and set the invoice
    const fetchInvoice = async () => {
      if (!existingAdjustmentNote.invoice?.invoice_number) return;

      try {
        const invoice = await getInvoiceForAdjustment(
          existingAdjustmentNote.invoice.invoice_number,
        );
        setSelectedInvoice(invoice);

        // Initialize product selections from adjustment note items
        const selections: Record<string, ProductSelection> = {};
        invoice.invoice_items.forEach((item) => {
          const adjustmentItem =
            existingAdjustmentNote.adjustment_note_items.find(
              (ai) => ai.product_id === item.product_id,
            );

          if (adjustmentItem) {
            selections[item.product_id] = {
              selected: true,
              quantity: adjustmentItem.quantity,
              rate: adjustmentItem.rate,
            };
          } else {
            selections[item.product_id] = {
              selected: false,
              quantity: 0,
              rate: item.rate || 0,
            };
          }
        });
        setProductSelections(selections);
      } catch (error) {
        toast.error("Failed to load invoice details");
        console.error(error);
      }
    };

    void fetchInvoice();
  }, [existingAdjustmentNote, adjustment_slug, router, warehouse_slug]);

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
    router.push(
      `/warehouse/${warehouse_slug}/adjustment-notes/${adjustment_slug}`,
    );
  };

  const handleSubmit = () => {
    if (!selectedInvoice || !warehouse || !canSubmit || !existingAdjustmentNote)
      return;

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

    updateWithItems.mutate(
      {
        adjustmentNoteId: existingAdjustmentNote.id,
        data: {
          invoice_id: selectedInvoice.id,
          warehouse_id: warehouse.id,
          counter_ledger_id: counterLedger.id,
          adjustment_type: adjustment_type!,
          adjustment_date: formData.adjustmentDate,
          reason: formData.reason,
          notes: formData.notes || null,
          attachments: null,
          items,
        },
      },
      {
        onSuccess: () => {
          toast.success(successMessage);
          router.push(
            `/warehouse/${warehouse_slug}/adjustment-notes/${adjustment_slug}`,
          );
        },
        onError: (error) => {
          console.error(`Error updating ${adjustment_type} note:`, error);
          toast.error(`Failed to update ${adjustment_type} note`);
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

  // Loading state
  if (adjustmentNoteLoading) {
    return <LoadingState message="Loading adjustment note..." />;
  }

  // Error state
  if (adjustmentNoteError || !existingAdjustmentNote) {
    return (
      <ErrorState
        title="Failed to load adjustment note"
        message="Could not load the adjustment note for editing"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={pageTitle}
          currentStep={getStepNumber()}
          totalSteps={5}
          onCancel={handleCancel}
          disableCancel={updateWithItems.isPending}
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
              adjustmentType={adjustment_type!}
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
              adjustmentType={adjustment_type!}
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
                disabled={updateWithItems.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromPartner || updateWithItems.isPending}
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
                disabled={updateWithItems.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromInvoice || updateWithItems.isPending}
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
                disabled={updateWithItems.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || updateWithItems.isPending}
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
                disabled={updateWithItems.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromDetails || updateWithItems.isPending}
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
                disabled={updateWithItems.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || updateWithItems.isPending}
                className="flex-1"
              >
                {updateWithItems.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
