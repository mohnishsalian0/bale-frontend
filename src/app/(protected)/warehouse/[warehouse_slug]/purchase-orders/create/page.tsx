"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { PurchaseOrderDetailsStep } from "../PurchaseOrderDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { usePurchaseOrderMutations } from "@/lib/query/hooks/purchase-orders";
import { CreatePurchaseOrderData } from "@/types/purchase-orders.types";
import type { DiscountType } from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

interface OrderFormData {
  warehouseId: string;
  supplierId: string;
  agentId: string;
  orderDate: string;
  deliveryDate: string;
  advanceAmount: string;
  discountType: DiscountType;
  discount: string;
  paymentTerms: string;
  supplierInvoiceNumber: string;
  notes: string;
  files: File[];
}

type FormStep = "products" | "supplier" | "details";

export default function CreatePurchaseOrderPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("products");

  // Purchase order mutations
  const { create: createOrder } = usePurchaseOrderMutations(warehouse.id);

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  const [formData, setFormData] = useState<OrderFormData>({
    warehouseId: warehouse.id,
    supplierId: "",
    agentId: "",
    orderDate: "",
    deliveryDate: "",
    advanceAmount: "",
    discount: "",
    paymentTerms: "",
    supplierInvoiceNumber: "",
    notes: "",
    discountType: "none",
    files: [],
  });

  const handleQuantityChange = (productId: string, quantity: number) => {
    setProductSelections((prev) => ({
      ...prev,
      [productId]: { selected: true, quantity },
    }));
  };

  const handleRemoveProduct = (productId: string) => {
    setProductSelections((prev) => ({
      ...prev,
      [productId]: { selected: false, quantity: 0 },
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
    () => formData.supplierId !== "" && formData.orderDate !== "",
    [formData.supplierId, formData.orderDate],
  );

  const handleNext = () => {
    if (currentStep === "products") {
      setCurrentStep("supplier");
    } else if (currentStep === "supplier") {
      // Transfer selected supplier to formData
      if (selectedSupplierId) {
        setFormData((prev) => ({ ...prev, supplierId: selectedSupplierId }));
      }
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("supplier");
    } else if (currentStep === "supplier") {
      setCurrentStep("products");
    }
  };

  const handleSelectSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, supplierId }));
      setCurrentStep("details");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/purchase-orders`);
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
    const orderData: CreatePurchaseOrderData = {
      warehouse_id: formData.warehouseId,
      supplier_id: formData.supplierId,
      agent_id: formData.agentId || null,
      order_date: formData.orderDate,
      expected_delivery_date: formData.deliveryDate || null,
      advance_amount: formData.advanceAmount
        ? parseFloat(formData.advanceAmount)
        : 0,
      discount_type: formData.discountType,
      discount_value:
        formData.discountType !== "none" && formData.discount
          ? parseFloat(formData.discount)
          : 0,
      notes: formData.notes || null,
      attachments: [], // TODO: Implement file upload
      status: "approval_pending",
    };

    // Prepare line items
    const lineItems = selectedProducts.map((product) => ({
      product_id: product.id,
      required_quantity: product.quantity,
      unit_rate: 0,
    }));

    // Create purchase order using mutation
    createOrder.mutate(
      { orderData, lineItems },
      {
        onSuccess: (sequenceNumber) => {
          toast.success("Purchase order created successfully");
          router.push(
            `/warehouse/${warehouse.slug}/purchase-orders/${sequenceNumber}`,
          );
        },
        onError: (error) => {
          console.error("Error creating purchase order:", error);
          toast.error("Failed to create purchase order");
        },
      },
    );
  };

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="Create Purchase Order"
          currentStep={
            currentStep === "products" ? 1 : currentStep === "supplier" ? 2 : 3
          }
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={createOrder.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={warehouse.id}
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : currentStep === "supplier" ? (
            <PartnerSelectionStep
              partnerType="supplier"
              selectedPartnerId={selectedSupplierId}
              onSelectPartner={handleSelectSupplier}
            />
          ) : (
            <PurchaseOrderDetailsStep
              formData={formData}
              setFormData={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
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
                disabled={createOrder.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed || createOrder.isPending}
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : currentStep === "supplier" ? (
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
                disabled={!selectedSupplierId || createOrder.isPending}
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
