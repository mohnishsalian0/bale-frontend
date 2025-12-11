"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ProductQuantitySheet } from "@/components/layouts/product-quantity-sheet";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { CustomerSelectionStep } from "../../CustomerSelectionStep";
import { OrderDetailsStep } from "../../OrderDetailsStep";
import { ProductFormSheet } from "../../../inventory/ProductFormSheet";
import { PartnerFormSheet } from "../../../partners/PartnerFormSheet";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  useSalesOrderMutations,
  useSalesOrderByNumber,
} from "@/lib/query/hooks/sales-orders";
import type { ProductWithInventoryListView } from "@/types/products.types";
import { UpdateSalesOrderData } from "@/types/sales-orders.types";

interface OrderFormData {
  warehouseId: string;
  customerId: string;
  agentId: string;
  orderDate: string;
  deliveryDate: string;
  advanceAmount: string;
  discount: string;
  paymentTerms: string;
  notes: string;
  files: File[];
}

type FormStep = "products" | "customer" | "details";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    sale_number: string;
  }>;
}

export default function ApproveSalesOrderPage({ params }: PageParams) {
  const router = useRouter();
  const { sale_number } = use(params);
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("products");

  // Fetch existing order data
  const {
    data: existingOrder,
    isLoading: orderLoading,
    isError: orderError,
  } = useSalesOrderByNumber(sale_number);

  // Sales order mutations
  const { approve: approveOrder } = useSalesOrderMutations(warehouse.id);

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  // Initialize product selections when order data loads
  useEffect(() => {
    if (existingOrder && Object.keys(productSelections).length === 0) {
      const selections: Record<
        string,
        { selected: boolean; quantity: number }
      > = {};
      existingOrder.sales_order_items.forEach((item) => {
        selections[item.product_id] = {
          selected: true,
          quantity: item.required_quantity,
        };
      });
      setProductSelections(selections);
    }
  }, [existingOrder]);

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithInventoryListView | null>(null);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Customer selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  // Form data state
  const [formData, setFormData] = useState<OrderFormData>({
    warehouseId: "",
    customerId: "",
    agentId: "",
    orderDate: "",
    deliveryDate: "",
    advanceAmount: "",
    discount: "",
    paymentTerms: "",
    notes: "",
    files: [],
  });

  // Initialize customer selection when order data loads
  useEffect(() => {
    if (existingOrder && !selectedCustomerId) {
      setSelectedCustomerId(existingOrder.customer_id);
    }
  }, [existingOrder, selectedCustomerId]);

  // Initialize form data when order data loads
  useEffect(() => {
    if (existingOrder && !formData.customerId) {
      setFormData({
        warehouseId: existingOrder.warehouse_id || "",
        customerId: existingOrder.customer_id,
        agentId: existingOrder.agent_id || "",
        orderDate: existingOrder.order_date,
        deliveryDate: existingOrder.expected_delivery_date || "",
        advanceAmount: existingOrder.advance_amount?.toString() || "",
        discount: existingOrder.discount_value?.toString() || "",
        paymentTerms: existingOrder.payment_terms || "",
        notes: existingOrder.notes || "",
        files: [],
      });
    }
  }, [existingOrder, formData.customerId]);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  const handleOpenQuantitySheet = (product: ProductWithInventoryListView) => {
    setSelectedProduct(product);
    setShowQuantitySheet(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (selectedProduct) {
      setProductSelections((prev) => ({
        ...prev,
        [selectedProduct.id]: { selected: true, quantity },
      }));
    }
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
    () =>
      formData.customerId !== "" &&
      formData.orderDate !== "" &&
      formData.warehouseId !== "",
    [formData.customerId, formData.orderDate, formData.warehouseId],
  );

  const handleNext = () => {
    if (currentStep === "products") {
      setCurrentStep("customer");
    } else if (currentStep === "customer") {
      // Transfer selected customer to formData
      if (selectedCustomerId) {
        setFormData((prev) => ({ ...prev, customerId: selectedCustomerId }));
      }
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("customer");
    } else if (currentStep === "customer") {
      setCurrentStep("products");
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, customerId }));
      setCurrentStep("details");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/sales-orders/${sale_number}`);
  };

  const handleApprove = () => {
    if (!canSubmit || !existingOrder) return;

    const selectedProducts = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        id: productId,
        quantity: selection.quantity,
      }));

    // Prepare order data
    const orderData: UpdateSalesOrderData = {
      warehouse_id: formData.warehouseId,
      customer_id: formData.customerId,
      agent_id: formData.agentId || null,
      order_date: formData.orderDate,
      expected_delivery_date: formData.deliveryDate || null,
      advance_amount: formData.advanceAmount
        ? parseFloat(formData.advanceAmount)
        : 0,
      discount_type: formData.discount ? "percentage" : "none",
      discount_value: formData.discount ? parseFloat(formData.discount) : 0,
      notes: formData.notes || null,
      attachments: [], // TODO: Implement file upload
      status: "in_progress",
    };

    // Prepare line items
    const lineItems = selectedProducts.map((product) => ({
      product_id: product.id,
      required_quantity: product.quantity,
      unit_rate: 0,
    }));

    // Approve sales order using mutation
    approveOrder.mutate(
      { orderId: existingOrder.id, orderData, lineItems },
      {
        onSuccess: () => {
          toast.success("Sales order approved successfully");
          router.push(
            `/warehouse/${warehouse.slug}/sales-orders/${sale_number}`,
          );
        },
        onError: (error) => {
          console.error("Error approving sales order:", error);
          toast.error("Failed to approve sales order");
        },
      },
    );
  };

  // Loading state
  if (orderLoading) {
    return <LoadingState message="Loading order..." />;
  }

  // Error state
  if (orderError || !existingOrder) {
    return (
      <ErrorState
        title="Order not found"
        message="This order does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  // Check if order can be approved
  if (existingOrder.status !== "approval_pending") {
    return (
      <ErrorState
        title="Cannot approve order"
        message={`This order is already ${existingOrder.status} and cannot be approved`}
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <div className="shrink-0 border-b border-gray-200 bg-background">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={approveOrder.isPending}
            >
              <IconArrowLeft className="size-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                Approve sales order
              </h1>
              <p className="text-sm text-gray-500">
                SO-{existingOrder.sequence_number} · Step{" "}
                {currentStep === "products"
                  ? "1"
                  : currentStep === "customer"
                    ? "2"
                    : "3"}{" "}
                of 3
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{
                width:
                  currentStep === "products"
                    ? "33%"
                    : currentStep === "customer"
                      ? "66%"
                      : "100%",
              }}
            />
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={warehouse.id}
              productSelections={productSelections}
              onOpenQuantitySheet={handleOpenQuantitySheet}
              onAddNewProduct={() => setShowCreateProduct(true)}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : currentStep === "customer" ? (
            <CustomerSelectionStep
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={handleSelectCustomer}
              onAddNewCustomer={() => setShowAddCustomer(true)}
            />
          ) : (
            <OrderDetailsStep
              formData={formData}
              setFormData={(updates: Partial<OrderFormData>) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="shrink-0 border-t border-gray-200 bg-background p-4 flex">
          <div className="w-full flex gap-3">
            {currentStep === "products" ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={approveOrder.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || approveOrder.isPending}
                  className="flex-1"
                >
                  Next
                </Button>
              </>
            ) : currentStep === "customer" ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={approveOrder.isPending}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!selectedCustomerId || approveOrder.isPending}
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
                  disabled={approveOrder.isPending}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={!canSubmit || approveOrder.isPending}
                  className="flex-1"
                >
                  {approveOrder.isPending ? "Approving..." : "Approve order"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Product Quantity Sheet */}
        {showQuantitySheet && selectedProduct && (
          <ProductQuantitySheet
            open={showQuantitySheet}
            onOpenChange={setShowQuantitySheet}
            product={selectedProduct}
            initialQuantity={
              productSelections[selectedProduct.id]?.quantity || 0
            }
            onConfirm={handleQuantityConfirm}
          />
        )}

        {/* Add Product Sheet */}
        {showCreateProduct && (
          <ProductFormSheet
            key="new"
            open={showCreateProduct}
            onOpenChange={setShowCreateProduct}
          />
        )}

        {/* Add Customer Sheet */}
        {showAddCustomer && (
          <PartnerFormSheet
            open={showAddCustomer}
            onOpenChange={setShowAddCustomer}
            partnerType="customer"
          />
        )}
      </div>
    </div>
  );
}
