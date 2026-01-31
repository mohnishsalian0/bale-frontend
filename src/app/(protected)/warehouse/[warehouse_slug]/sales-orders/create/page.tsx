"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { OrderDetailsStep } from "../OrderDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { useSalesOrderMutations } from "@/lib/query/hooks/sales-orders";
import { CreateSalesOrderData } from "@/types/sales-orders.types";
import type { DiscountType, TaxType } from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

interface OrderFormData {
  warehouseId: string;
  customerId: string;
  agentId: string;
  orderDate: string;
  deliveryDueDate: string;
  taxType: TaxType;
  advanceAmount: string;
  discountType: DiscountType;
  discount: string;
  paymentTerms: string;
  notes: string;
  files: File[];
}

type FormStep = "customer" | "products" | "details";

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("customer");

  // Sales order mutations
  const { create: createOrder } = useSalesOrderMutations(warehouse.id);

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  const [formData, setFormData] = useState<OrderFormData>({
    warehouseId: warehouse.id,
    customerId: "",
    agentId: "",
    orderDate: "",
    deliveryDueDate: "",
    taxType: "gst",
    advanceAmount: "",
    discount: "",
    paymentTerms: "",
    notes: "",
    discountType: "none",
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

  const canProceed = useMemo(
    () =>
      Object.values(productSelections).some(
        (p) => p.selected && p.quantity > 0,
      ),
    [productSelections],
  );

  const canSubmit = useMemo(
    () => formData.customerId !== "" && formData.orderDate !== "",
    [formData.customerId, formData.orderDate],
  );

  const handleNext = () => {
    if (currentStep === "customer") {
      // Transfer selected customer to formData
      if (selectedCustomerId) {
        setFormData((prev) => ({ ...prev, customerId: selectedCustomerId }));
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
      setCurrentStep("customer");
    }
  };

  const handleSelectCustomer = (customerId: string, _ledger_id: string) => {
    setSelectedCustomerId(customerId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, customerId }));
      setCurrentStep("products");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/sales-orders`);
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
    const orderData: CreateSalesOrderData = {
      warehouse_id: formData.warehouseId,
      customer_id: formData.customerId,
      agent_id: formData.agentId || null,
      order_date: formData.orderDate,
      delivery_due_date: formData.deliveryDueDate || null,
      tax_type: formData.taxType,
      payment_terms: formData.paymentTerms || null,
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
      unit_rate: productSelections[product.id]?.rate || 0,
    }));

    // Create sales order using mutation
    createOrder.mutate(
      { orderData, lineItems },
      {
        onSuccess: (sequenceNumber) => {
          toast.success("Sales order created successfully");
          router.push(
            `/warehouse/${warehouse.slug}/sales-orders/${sequenceNumber}/details`,
          );
        },
        onError: (error) => {
          console.error("Error creating sales order:", error);
          toast.error("Failed to create sales order");
        },
      },
    );
  };

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="Create Sales Order"
          currentStep={
            currentStep === "customer" ? 1 : currentStep === "products" ? 2 : 3
          }
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={createOrder.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {currentStep === "customer" ? (
            <PartnerSelectionStep
              partnerType="customer"
              selectedPartnerId={selectedCustomerId}
              onSelectPartner={handleSelectCustomer}
            />
          ) : currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={warehouse.id}
              contextType="sales"
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : (
            <OrderDetailsStep
              formData={formData}
              setFormData={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <FormFooter>
          {currentStep === "customer" ? (
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
                disabled={!selectedCustomerId || createOrder.isPending}
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
