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
import { useInvoiceMutations } from "@/lib/query/hooks/invoices";
import { useLedgers } from "@/lib/query/hooks/ledgers";
import { CreateInvoiceData } from "@/types/invoices.types";
import type {
  DiscountType,
  InvoiceTaxType,
  InvoiceType,
} from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

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

type FormStep = "partner" | "products" | "details" | "review";

export default function CreateInvoicePage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const params = useParams();
  const invoice_type = params.invoice_type as InvoiceType;

  const isSales = invoice_type === "sales";
  const partnerType = isSales ? "customer" : "supplier";
  const ledgerName = isSales ? "Sales" : "Purchase";
  const pageTitle = isSales
    ? "Create Sales Invoice"
    : "Create Purchase Invoice";
  const successMessage = isSales
    ? "Sales invoice created successfully"
    : "Purchase invoice created successfully";

  const [currentStep, setCurrentStep] = useState<FormStep>("partner");

  // Invoice mutations
  const { create: createInvoice } = useInvoiceMutations();

  // Fetch ledgers to get default ledger
  const { data: ledgers } = useLedgers();
  const counterLedger = useMemo(
    () => ledgers?.find((l) => l.name === ledgerName),
    [ledgers, ledgerName],
  );

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  const [formData, setFormData] = useState<InvoiceFormData>({
    warehouseId: warehouse.id,
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
    if (currentStep === "partner") {
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("review");
    }
  };

  const handleBack = () => {
    if (currentStep === "review") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("partner");
    }
  };

  const handleSelectPartner = (partnerId: string, ledgerId: string) => {
    setSelectedPartnerId(partnerId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, partyLedgerId: ledgerId }));
      setCurrentStep("products");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/invoices`);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

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

    // Prepare invoice data
    const invoiceData: CreateInvoiceData = {
      invoice_type: invoice_type,
      party_ledger_id: formData.partyLedgerId,
      counter_ledger_id: counterLedger.id, // Purchase/Sales ledger for double-entry
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

    // Create invoice using mutation
    createInvoice.mutate(invoiceData, {
      onSuccess: (invoiceNumber) => {
        toast.success(successMessage);
        router.push(
          `/warehouse/${warehouse.slug}/invoices/${invoiceNumber}/details`,
        );
      },
      onError: (error) => {
        console.error("Error creating invoice:", error);
        toast.error("Failed to create invoice");
      },
    });
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "partner":
        return 1;
      case "products":
        return 2;
      case "details":
        return 3;
      case "review":
        return 4;
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
          totalSteps={4}
          onCancel={handleCancel}
          disableCancel={createInvoice.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "partner" ? (
            <PartnerSelectionStep
              partnerType={partnerType}
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={handleSelectPartner}
            />
          ) : currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={warehouse.id}
              contextType={invoice_type}
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
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
              warehouseId={warehouse.id}
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
          {currentStep === "partner" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedPartnerId || createInvoice.isPending}
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
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || createInvoice.isPending}
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
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || createInvoice.isPending}
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
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createInvoice.isPending}
                className="flex-1"
              >
                {createInvoice.isPending ? "Saving..." : "Submit"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
