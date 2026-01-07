"use client";

import { useState, useMemo, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { PurchaseOrderDetailsStep } from "../../PurchaseOrderDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  usePurchaseOrderMutations,
  usePurchaseOrderByNumber,
} from "@/lib/query/hooks/purchase-orders";
import { UpdatePurchaseOrderData } from "@/types/purchase-orders.types";
import type { DiscountType, TaxType } from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";

interface OrderFormData {
  warehouseId: string;
  supplierId: string;
  agentId: string;
  orderDate: string;
  deliveryDueDate: string;
  taxType: TaxType;
  advanceAmount: string;
  discountType: DiscountType;
  discount: string;
  paymentTerms: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  notes: string;
  files: File[];
}

type FormStep = "supplier" | "products" | "details";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    purchase_number: string;
  }>;
}

export default function EditPurchaseOrderPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const { purchase_number } = use(params);

  // Fetch existing purchase order
  const {
    data: existingOrder,
    isLoading: orderLoading,
    isError: orderError,
  } = usePurchaseOrderByNumber(purchase_number);

  // Purchase order mutations
  const { updateWithItems: updateOrder } = usePurchaseOrderMutations(
    warehouse.id,
  );

  const [currentStep, setCurrentStep] = useState<FormStep>("supplier");

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );

  const [formData, setFormData] = useState<OrderFormData>({
    warehouseId: "",
    supplierId: "",
    agentId: "",
    orderDate: "",
    deliveryDueDate: "",
    taxType: "gst",
    advanceAmount: "",
    discount: "",
    paymentTerms: "",
    supplierInvoiceNumber: "",
    supplierInvoiceDate: "",
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
        `/warehouse/${warehouse.slug}/purchase-orders/${purchase_number}`,
      );
      return;
    }

    // Initialize product selections from order items
    const initialProductSelections = existingOrder.purchase_order_items.reduce(
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

    // Initialize selected supplier
    setSelectedSupplierId(existingOrder.supplier_id);

    // Initialize form data
    setFormData({
      warehouseId: existingOrder.warehouse_id || "",
      supplierId: existingOrder.supplier_id,
      agentId: existingOrder.agent_id || "",
      orderDate: existingOrder.order_date,
      deliveryDueDate: existingOrder.delivery_due_date || "",
      taxType: existingOrder.tax_type as TaxType,
      advanceAmount: existingOrder.advance_amount?.toString() || "",
      discountType: existingOrder.discount_type as DiscountType,
      discount: existingOrder.discount_value?.toString() || "",
      paymentTerms: existingOrder.payment_terms || "",
      supplierInvoiceNumber: existingOrder.supplier_invoice_number || "",
      supplierInvoiceDate: existingOrder.supplier_invoice_date || "",
      notes: existingOrder.notes || "",
      files: [],
    });
  }, [existingOrder, purchase_number, router, warehouse.slug]);

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
      formData.supplierId !== "" &&
      formData.orderDate !== "" &&
      canProceedFromProducts,
    [formData.supplierId, formData.orderDate, canProceedFromProducts],
  );

  const handleNext = () => {
    if (currentStep === "supplier") {
      // Transfer selected supplier to formData
      if (selectedSupplierId) {
        setFormData((prev) => ({ ...prev, supplierId: selectedSupplierId }));
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
      setCurrentStep("supplier");
    }
  };

  const handleSelectSupplier = (supplierId: string, _ledger_id: string) => {
    setSelectedSupplierId(supplierId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, supplierId }));
      setCurrentStep("products");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse.slug}/purchase-orders/${purchase_number}`,
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
    const orderData: UpdatePurchaseOrderData = {
      warehouse_id: formData.warehouseId,
      supplier_id: formData.supplierId,
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
      supplier_invoice_number: formData.supplierInvoiceNumber || null,
      supplier_invoice_date: formData.supplierInvoiceDate || null,
      notes: formData.notes || null,
      attachments: [], // TODO: Implement file upload
      status: existingOrder.status, // Keep existing status
    };

    // Update purchase order using mutation
    updateOrder.mutate(
      {
        orderId: existingOrder.id,
        orderData,
        lineItems: selectedProducts,
      },
      {
        onSuccess: () => {
          toast.success("Purchase order updated successfully");
          router.push(
            `/warehouse/${warehouse.slug}/purchase-orders/${purchase_number}`,
          );
        },
        onError: (error) => {
          console.error("Error updating purchase order:", error);
          toast.error("Failed to update purchase order");
        },
      },
    );
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "supplier":
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
        message="Could not load the purchase order for editing"
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
          title="Edit Purchase Order"
          currentStep={getStepNumber()}
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={updateOrder.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "supplier" ? (
            <PartnerSelectionStep
              partnerType="supplier"
              selectedPartnerId={selectedSupplierId}
              onSelectPartner={handleSelectSupplier}
            />
          ) : currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={formData.warehouseId}
              contextType="purchase"
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
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
          {currentStep === "supplier" ? (
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
                disabled={!selectedSupplierId || updateOrder.isPending}
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
