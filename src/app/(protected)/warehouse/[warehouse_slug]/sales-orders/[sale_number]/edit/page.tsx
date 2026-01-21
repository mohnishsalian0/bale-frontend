"use client";

import { useState, useMemo, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { OrderDetailsStep } from "../../OrderDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  useSalesOrderMutations,
  useSalesOrderByNumber,
} from "@/lib/query/hooks/sales-orders";
import { UpdateSalesOrderData } from "@/types/sales-orders.types";
import type { DiscountType, TaxType } from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";

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

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    sale_number: string;
  }>;
}

export default function EditSalesOrderPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const { sale_number } = use(params);

  // Fetch existing sales order
  const {
    data: existingOrder,
    isLoading: orderLoading,
    isError: orderError,
  } = useSalesOrderByNumber(sale_number);

  // Sales order mutations
  const { updateWithItems: updateOrder } = useSalesOrderMutations(warehouse.id);

  const [currentStep, setCurrentStep] = useState<FormStep>("customer");

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const [formData, setFormData] = useState<OrderFormData>({
    warehouseId: "",
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

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Initialize form data when order loads
  useEffect(() => {
    if (!existingOrder) return;

    // Check if order can be edited
    if (existingOrder.status !== "approval_pending") {
      toast.error("Only orders in approval pending status can be edited");
      router.push(
        `/warehouse/${warehouse.slug}/sales-orders/${sale_number}/details`,
      );
      return;
    }

    // Initialize product selections from order items
    const initialProductSelections = existingOrder.sales_order_items.reduce(
      (acc, item) => ({
        ...acc,
        [item.product_id]: {
          selected: true,
          quantity: item.required_quantity,
          rate: item.unit_rate,
        },
      }),
      {},
    );
    setProductSelections(initialProductSelections);

    // Initialize selected customer
    setSelectedCustomerId(existingOrder.customer_id);

    // Initialize form data
    setFormData({
      warehouseId: existingOrder.warehouse_id || "",
      customerId: existingOrder.customer_id,
      agentId: existingOrder.agent_id || "",
      orderDate: existingOrder.order_date,
      deliveryDueDate: existingOrder.delivery_due_date || "",
      taxType: existingOrder.tax_type as TaxType,
      advanceAmount: existingOrder.advance_amount?.toString() || "",
      discountType: existingOrder.discount_type as DiscountType,
      discount: existingOrder.discount_value?.toString() || "",
      paymentTerms: existingOrder.payment_terms || "",
      notes: existingOrder.notes || "",
      files: [],
    });
  }, [existingOrder, sale_number, router, warehouse.slug]);

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

  const canSubmit = useMemo(
    () =>
      formData.customerId !== "" &&
      formData.orderDate !== "" &&
      canProceedFromProducts,
    [formData.customerId, formData.orderDate, canProceedFromProducts],
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
    router.push(
      `/warehouse/${warehouse.slug}/sales-orders/${sale_number}/details`,
    );
  };

  const handleSubmit = () => {
    if (!canSubmit || !existingOrder) return;

    const selectedProducts = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        product_id: productId,
        required_quantity: selection.quantity,
        unit_rate: selection.rate,
      }));

    // Prepare order data
    const orderData: UpdateSalesOrderData = {
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
      status: existingOrder.status, // Keep existing status
    };

    // Update sales order using mutation
    updateOrder.mutate(
      {
        orderId: existingOrder.id,
        orderData,
        lineItems: selectedProducts,
      },
      {
        onSuccess: () => {
          toast.success("Sales order updated successfully");
          router.push(
            `/warehouse/${warehouse.slug}/sales-orders/${sale_number}/details`,
          );
        },
        onError: (error) => {
          console.error("Error updating sales order:", error);
          toast.error("Failed to update sales order");
        },
      },
    );
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "customer":
        return 1;
      case "products":
        return 2;
      case "details":
        return 3;
      default:
        return 1;
    }
  };

  // Loading state
  if (orderLoading) {
    return <LoadingState message="Loading order..." />;
  }

  // Error state
  if (orderError || !existingOrder) {
    return (
      <ErrorState
        title="Failed to load order"
        message="Could not load the sales order for editing"
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
          title="Edit Sales Order"
          currentStep={getStepNumber()}
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={updateOrder.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "customer" ? (
            <PartnerSelectionStep
              partnerType="customer"
              selectedPartnerId={selectedCustomerId}
              onSelectPartner={handleSelectCustomer}
            />
          ) : currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={formData.warehouseId}
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
                disabled={updateOrder.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedCustomerId || updateOrder.isPending}
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
