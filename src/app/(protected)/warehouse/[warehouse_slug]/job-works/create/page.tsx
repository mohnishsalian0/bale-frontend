"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import {
  JobWorkDetailsStep,
  type JobWorkFormData,
} from "../JobWorkDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { useJobWorkMutations } from "@/lib/query/hooks/job-works";
import { CreateJobWorkData } from "@/types/job-works.types";

import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

type FormStep = "vendor" | "products" | "details";

export default function CreateJobWorkPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("vendor");

  // Job work mutations
  const { create: createOrder } = useJobWorkMutations();

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  const [formData, setFormData] = useState<JobWorkFormData>({
    warehouseId: warehouse.id,
    vendorId: "",
    agentId: "",
    serviceTypeAttributeId: "",
    startDate: "",
    dueDate: "",
    taxType: "gst",
    advanceAmount: "",
    discount: "",
    discountType: "none",
    notes: "",
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

  const canProceed = useMemo(
    () =>
      Object.values(productSelections).some(
        (p) => p.selected && p.quantity > 0,
      ),
    [productSelections],
  );

  const canSubmit = useMemo(
    () =>
      formData.vendorId !== "" &&
      formData.startDate !== "" &&
      formData.serviceTypeAttributeId !== "",
    [formData.vendorId, formData.startDate, formData.serviceTypeAttributeId],
  );

  const handleNext = () => {
    if (currentStep === "vendor") {
      // Transfer selected vendor to formData
      if (selectedVendorId) {
        setFormData((prev) => ({ ...prev, vendorId: selectedVendorId }));
      }
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("vendor");
    }
  };

  const handleSelectVendor = (vendorId: string, _ledger_id: string) => {
    setSelectedVendorId(vendorId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, vendorId }));
      setCurrentStep("products");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/job-works`);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const selectedProducts = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        id: productId,
        quantity: selection.quantity,
      }));

    // Prepare order data
    const orderData: CreateJobWorkData = {
      warehouse_id: formData.warehouseId,
      vendor_id: formData.vendorId,
      agent_id: formData.agentId || null,
      service_type_attribute_id: formData.serviceTypeAttributeId,
      start_date: formData.startDate,
      due_date: formData.dueDate || null,
      tax_type: formData.taxType,
      advance_amount: formData.advanceAmount
        ? parseFloat(formData.advanceAmount)
        : 0,
      discount_type: formData.discountType,
      discount_value:
        formData.discountType !== "none" && formData.discount
          ? parseFloat(formData.discount)
          : 0,
      notes: formData.notes || null,
      attachments: [],
      status: "approval_pending",
    };

    // Prepare line items
    const lineItems = selectedProducts.map((product) => ({
      product_id: product.id,
      expected_quantity: product.quantity,
      unit_rate: productSelections[product.id]?.rate || 0,
    }));

    // Create job work using mutation
    createOrder.mutate(
      { orderData, lineItems },
      {
        onSuccess: (sequenceNumber) => {
          toast.success("Job work created successfully");
          router.push(
            `/warehouse/${warehouse.slug}/job-works/${sequenceNumber}/details`,
          );
        },
        onError: (error) => {
          console.error("Error creating job work:", error);
          toast.error("Failed to create job work");
        },
      },
    );
  };

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="Create Job Work"
          currentStep={
            currentStep === "vendor" ? 1 : currentStep === "products" ? 2 : 3
          }
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={createOrder.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "vendor" ? (
            <PartnerSelectionStep
              partnerType="vendor"
              selectedPartnerId={selectedVendorId}
              onSelectPartner={handleSelectVendor}
            />
          ) : currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={warehouse.id}
              contextType="purchase"
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
              maxSelections={1}
            />
          ) : (
            <JobWorkDetailsStep
              formData={formData}
              setFormData={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <FormFooter>
          {currentStep === "vendor" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={createOrder.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedVendorId || createOrder.isPending}
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
                disabled={createOrder.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed || createOrder.isPending}
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
                disabled={createOrder.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createOrder.isPending}
                className="flex-1"
              >
                {createOrder.isPending ? "Saving..." : "Submit"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
