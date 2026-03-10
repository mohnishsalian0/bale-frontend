"use client";

import { useState, useMemo, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import {
  JobWorkDetailsStep,
  type JobWorkFormData,
} from "../../JobWorkDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  useJobWorkMutations,
  useJobWorkByNumber,
} from "@/lib/query/hooks/job-works";
import { UpdateJobWorkData } from "@/types/job-works.types";
import type { DiscountType, TaxType } from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";

type FormStep = "vendor" | "products" | "details";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    job_work_number: string;
  }>;
}

export default function EditJobWorkPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const { job_work_number } = use(params);

  // Fetch existing job work
  const {
    data: existingOrder,
    isLoading: orderLoading,
    isError: orderError,
  } = useJobWorkByNumber(job_work_number);

  // Job work mutations
  const { updateWithItems: updateOrder } = useJobWorkMutations();

  const [currentStep, setCurrentStep] = useState<FormStep>("vendor");

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  const [formData, setFormData] = useState<JobWorkFormData>({
    warehouseId: "",
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

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Initialize form data when order loads
  useEffect(() => {
    if (!existingOrder) return;

    // Initialize product selections from order items
    const initialProductSelections = existingOrder.job_work_items.reduce(
      (acc, item) => ({
        ...acc,
        [item.product_id]: {
          selected: true,
          quantity: item.expected_quantity,
          rate: item.unit_rate,
        },
      }),
      {},
    );
    setProductSelections(initialProductSelections);

    // Initialize selected vendor
    setSelectedVendorId(existingOrder.vendor_id);

    // Initialize form data
    setFormData({
      warehouseId: existingOrder.warehouse_id || "",
      vendorId: existingOrder.vendor_id,
      agentId: existingOrder.agent_id || "",
      serviceTypeAttributeId: existingOrder.service_type_attribute_id || "",
      startDate: existingOrder.start_date,
      dueDate: existingOrder.due_date || "",
      taxType: existingOrder.tax_type as TaxType,
      advanceAmount: existingOrder.advance_amount?.toString() || "",
      discountType: existingOrder.discount_type as DiscountType,
      discount: existingOrder.discount_value?.toString() || "",
      notes: existingOrder.notes || "",
    });
  }, [existingOrder]);

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
        (p) => p.selected && p.quantity > 0,
      ),
    [productSelections],
  );

  const canSubmit = useMemo(
    () =>
      formData.vendorId !== "" &&
      formData.startDate !== "" &&
      formData.serviceTypeAttributeId !== "" &&
      canProceedFromProducts,
    [
      formData.vendorId,
      formData.startDate,
      formData.serviceTypeAttributeId,
      canProceedFromProducts,
    ],
  );

  const handleNext = () => {
    if (currentStep === "vendor") {
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
    }, 300);
  };

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse.slug}/job-works/${job_work_number}/details`,
    );
  };

  const handleSubmit = () => {
    if (!canSubmit || !existingOrder) return;

    const selectedProducts = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        product_id: productId,
        expected_quantity: selection.quantity,
        unit_rate: selection.rate,
      }));

    const orderData: UpdateJobWorkData = {
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
      status: existingOrder.status,
    };

    updateOrder.mutate(
      {
        orderId: existingOrder.id,
        orderData,
        lineItems: selectedProducts,
      },
      {
        onSuccess: () => {
          toast.success("Job work updated successfully");
          router.push(
            `/warehouse/${warehouse.slug}/job-works/${job_work_number}/details`,
          );
        },
        onError: (error) => {
          console.error("Error updating job work:", error);
          toast.error("Failed to update job work");
        },
      },
    );
  };

  // Loading state
  if (orderLoading) {
    return <LoadingState message="Loading job work..." />;
  }

  // Error state
  if (orderError || !existingOrder) {
    return (
      <ErrorState
        title="Failed to load job work"
        message="Could not load the job work for editing"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        <FormHeader
          title="Edit Job Work"
          currentStep={
            currentStep === "vendor" ? 1 : currentStep === "products" ? 2 : 3
          }
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={updateOrder.isPending}
        />

        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "vendor" ? (
            <PartnerSelectionStep
              partnerType="vendor"
              selectedPartnerId={selectedVendorId}
              onSelectPartner={handleSelectVendor}
              disablePartnerChange={existingOrder.status !== "approval_pending"}
            />
          ) : currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={formData.warehouseId}
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

        <FormFooter>
          {currentStep === "vendor" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateOrder.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedVendorId || updateOrder.isPending}
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
                disabled={updateOrder.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || updateOrder.isPending}
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
                disabled={updateOrder.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || updateOrder.isPending}
                className="flex-1"
              >
                {updateOrder.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
