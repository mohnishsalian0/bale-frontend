"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { InvoiceReviewStep } from "../../InvoiceReviewStep";
import { InvoiceDetailsStep } from "../../InvoiceDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  useInvoiceMutations,
  useInvoiceBySlug,
} from "@/lib/query/hooks/invoices";
import { useLedgers } from "@/lib/query/hooks/ledgers";
import { CreateInvoiceData } from "@/types/invoices.types";
import type {
  DiscountType,
  InvoiceTaxType,
  InvoiceType,
} from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";

interface InvoiceFormData {
  warehouseId: string;
  partyLedgerId: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  taxType: InvoiceTaxType;
  discountType: DiscountType;
  discount: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  notes: string;
  files: File[];
}

type FormStep = "products" | "partner" | "details" | "review";

export default function EditInvoicePage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const params = useParams();
  const invoice_slug = params.invoice_slug as string;

  // Fetch existing invoice
  const {
    data: existingInvoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
  } = useInvoiceBySlug(invoice_slug);

  // Invoice mutations
  const { updateWithItems: updateInvoice } = useInvoiceMutations();

  // Fetch ledgers to get default ledger
  const { data: ledgers } = useLedgers();

  const [currentStep, setCurrentStep] = useState<FormStep>("products");

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );

  const [formData, setFormData] = useState<InvoiceFormData>({
    warehouseId: "",
    partyLedgerId: "",
    invoiceDate: "",
    dueDate: "",
    paymentTerms: "",
    taxType: "gst",
    discountType: "none",
    discount: "",
    supplierInvoiceNumber: "",
    supplierInvoiceDate: "",
    notes: "",
    files: [],
  });

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Initialize form data when invoice loads
  useEffect(() => {
    if (!existingInvoice) return;

    // Check if invoice can be edited
    if (existingInvoice.is_cancelled) {
      toast.error("Cannot edit a cancelled invoice");
      router.push(
        `/warehouse/${warehouse.slug}/invoices/${invoice_slug}/details`,
      );
      return;
    }

    if (existingInvoice.exported_to_tally_at) {
      toast.error("Cannot edit an invoice that has been exported to Tally");
      router.push(
        `/warehouse/${warehouse.slug}/invoices/${invoice_slug}/details`,
      );
      return;
    }

    if (existingInvoice.has_payment) {
      toast.error("Cannot edit an invoice that has payments linked");
      router.push(
        `/warehouse/${warehouse.slug}/invoices/${invoice_slug}/details`,
      );
      return;
    }

    if (existingInvoice.has_adjustment) {
      toast.error("Cannot edit an invoice that has adjustments linked");
      router.push(
        `/warehouse/${warehouse.slug}/invoices/${invoice_slug}/details`,
      );
      return;
    }

    // Initialize product selections from invoice items
    const initialProductSelections = existingInvoice.invoice_items.reduce(
      (acc, item) => ({
        ...acc,
        [item.product_id]: {
          selected: true,
          quantity: item.quantity,
          rate: item.rate,
        },
      }),
      {},
    );
    setProductSelections(initialProductSelections);

    // Initialize selected partner
    setSelectedPartnerId(existingInvoice.party_ledger?.partner_id || null);

    // Initialize form data
    setFormData({
      warehouseId: existingInvoice.warehouse_id,
      partyLedgerId: existingInvoice.party_ledger_id,
      invoiceDate: existingInvoice.invoice_date,
      dueDate: existingInvoice.due_date || "",
      paymentTerms: existingInvoice.payment_terms || "",
      taxType: existingInvoice.tax_type as InvoiceTaxType,
      discountType: existingInvoice.discount_type as DiscountType,
      discount: existingInvoice.discount_value?.toString() || "",
      supplierInvoiceNumber: existingInvoice.supplier_invoice_number || "",
      supplierInvoiceDate: existingInvoice.supplier_invoice_date || "",
      notes: existingInvoice.notes || "",
      files: [],
    });
  }, [existingInvoice, invoice_slug, router, warehouse.slug]);

  const invoice_type = existingInvoice?.invoice_type as InvoiceType;
  const isSales = invoice_type === "sales";
  const partnerType = isSales ? "customer" : "supplier";
  const ledgerName = isSales ? "Sales" : "Purchase";
  const pageTitle = isSales ? "Edit Sales Invoice" : "Edit Purchase Invoice";
  const successMessage = isSales
    ? "Sales invoice updated successfully"
    : "Purchase invoice updated successfully";

  const counterLedger = useMemo(
    () => ledgers?.find((l) => l.name === ledgerName),
    [ledgers, ledgerName],
  );

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

  const canProceedFromProducts = useMemo(
    () =>
      Object.values(productSelections).some(
        (p) => p.selected && p.quantity > 0 && p.rate > 0,
      ),
    [productSelections],
  );

  const subtotal = useMemo(() => {
    return Object.values(productSelections).reduce(
      (acc, { quantity, rate }) => {
        return acc + quantity * rate;
      },
      0,
    );
  }, [productSelections]);

  const canSubmit = useMemo(
    () =>
      formData.partyLedgerId !== "" &&
      formData.invoiceDate !== "" &&
      canProceedFromProducts,
    [formData.partyLedgerId, formData.invoiceDate, canProceedFromProducts],
  );

  const handleNext = () => {
    if (currentStep === "products") {
      setCurrentStep("partner");
    } else if (currentStep === "partner") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("review");
    }
  };

  const handleBack = () => {
    if (currentStep === "review") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("partner");
    } else if (currentStep === "partner") {
      setCurrentStep("products");
    }
  };

  const handleSelectPartner = (partnerId: string, ledgerId: string) => {
    setSelectedPartnerId(partnerId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, partyLedgerId: ledgerId }));
      setCurrentStep("details");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse.slug}/invoices/${invoice_slug}/details`,
    );
  };

  const handleSubmit = () => {
    if (!canSubmit || !existingInvoice) return;

    // Validate counter ledger exists
    if (!counterLedger) {
      toast.error(
        `${ledgerName} ledger not found. Please ensure default ledgers are seeded.`,
      );
      return;
    }

    const selectedProducts = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        product_id: productId,
        quantity: selection.quantity,
        rate: selection.rate,
      }));

    // Prepare invoice data (same structure as create)
    const invoiceData: CreateInvoiceData = {
      invoice_type: invoice_type,
      party_ledger_id: formData.partyLedgerId,
      counter_ledger_id: counterLedger.id,
      warehouse_id: formData.warehouseId,
      invoice_date: formData.invoiceDate,
      payment_terms: formData.paymentTerms || undefined,
      due_date: formData.dueDate || undefined,
      tax_type: formData.taxType,
      discount_type: formData.discountType,
      discount_value:
        formData.discountType !== "none" && formData.discount
          ? parseFloat(formData.discount)
          : undefined,
      supplier_invoice_number: formData.supplierInvoiceNumber || undefined,
      supplier_invoice_date: formData.supplierInvoiceDate || undefined,
      notes: formData.notes || undefined,
      items: selectedProducts,
    };

    // Update invoice using mutation
    updateInvoice.mutate(
      {
        invoiceId: existingInvoice.id,
        data: invoiceData,
      },
      {
        onSuccess: () => {
          toast.success(successMessage);
          router.push(
            `/warehouse/${warehouse.slug}/invoices/${invoice_slug}/details`,
          );
        },
        onError: (error) => {
          console.error("Error updating invoice:", error);
          toast.error("Failed to update invoice");
        },
      },
    );
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "products":
        return 1;
      case "partner":
        return 2;
      case "details":
        return 3;
      case "review":
        return 4;
      default:
        return 1;
    }
  };

  // Loading state
  if (invoiceLoading) {
    return <LoadingState message="Loading invoice..." />;
  }

  // Error state
  if (invoiceError || !existingInvoice) {
    return (
      <ErrorState
        title="Failed to load invoice"
        message="Could not load the invoice for editing"
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
          totalSteps={4}
          onCancel={handleCancel}
          disableCancel={updateInvoice.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={formData.warehouseId}
              contextType={invoice_type}
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : currentStep === "partner" ? (
            <PartnerSelectionStep
              partnerType={partnerType}
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={handleSelectPartner}
            />
          ) : currentStep === "details" ? (
            <InvoiceDetailsStep
              formData={formData}
              setFormData={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
              invoiceType={invoice_type}
              subtotal={subtotal}
            />
          ) : (
            <InvoiceReviewStep
              warehouseId={formData.warehouseId}
              productSelections={productSelections}
              taxType={formData.taxType}
              discountType={formData.discountType}
              discountValue={
                formData.discount ? parseFloat(formData.discount) : 0
              }
            />
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <FormFooter>
          {currentStep === "products" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateInvoice.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || updateInvoice.isPending}
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : currentStep === "partner" ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={updateInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedPartnerId || updateInvoice.isPending}
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
                disabled={updateInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || updateInvoice.isPending}
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
                disabled={updateInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || updateInvoice.isPending}
                className="flex-1"
              >
                {updateInvoice.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
