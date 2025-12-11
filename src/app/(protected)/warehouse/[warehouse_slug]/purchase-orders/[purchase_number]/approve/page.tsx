"use client";

import { useState, useMemo, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductQuantitySheet } from "@/components/layouts/product-quantity-sheet";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { SupplierSelectionStep } from "../../SupplierSelectionStep";
import { PurchaseOrderDetailsStep } from "../../PurchaseOrderDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  usePurchaseOrderByNumber,
  usePurchaseOrderMutations,
} from "@/lib/query/hooks/purchase-orders";
import type { ProductWithInventoryListView } from "@/types/products.types";
import { UpdatePurchaseOrderData } from "@/types/purchase-orders.types";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";

interface OrderFormData {
  warehouseId: string;
  supplierId: string;
  agentId: string;
  orderDate: string;
  deliveryDate: string;
  advanceAmount: string;
  discount: string;
  paymentTerms: string;
  supplierInvoiceNumber: string;
  notes: string;
  files: File[];
}

type FormStep = "products" | "supplier" | "details";

export default function ApprovePurchaseOrderPage({
  params,
}: {
  params: Promise<{ purchase_number: string }>;
}) {
  const { purchase_number } = use(params);
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("products");

  // Fetch existing order
  const {
    data: order,
    isLoading,
    isError,
  } = usePurchaseOrderByNumber(purchase_number);

  // Purchase order mutations
  const { approve: approveOrder } = usePurchaseOrderMutations(warehouse.id);

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithInventoryListView | null>(null);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
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
    files: [],
  });

  // Pre-populate form when order loads
  useEffect(() => {
    if (order) {
      // Pre-populate product selections
      const selections: Record<
        string,
        { selected: boolean; quantity: number }
      > = {};
      order.purchase_order_items?.forEach((item) => {
        selections[item.product_id] = {
          selected: true,
          quantity: item.required_quantity,
        };
      });
      setProductSelections(selections);

      // Pre-populate supplier
      setSelectedSupplierId(order.supplier_id);

      // Pre-populate form data
      setFormData({
        warehouseId: order.warehouse_id || warehouse.id,
        supplierId: order.supplier_id,
        agentId: order.agent_id || "",
        orderDate: order.order_date,
        deliveryDate: order.expected_delivery_date || "",
        advanceAmount: order.advance_amount?.toString() || "",
        discount: "",
        paymentTerms: order.payment_terms || "",
        supplierInvoiceNumber: order.supplier_invoice_number || "",
        notes: order.notes || "",
        files: [],
      });
    }
  }, [order, warehouse.id]);

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
    () => formData.supplierId !== "" && formData.orderDate !== "",
    [formData.supplierId, formData.orderDate],
  );

  const handleNext = () => {
    if (currentStep === "products") {
      setCurrentStep("supplier");
    } else if (currentStep === "supplier") {
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
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, supplierId }));
      setCurrentStep("details");
    }, 300);
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/purchase-orders/${purchase_number}`);
  };

  const handleSubmit = () => {
    if (!canSubmit || !order) return;

    const selectedProducts = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        id: productId,
        quantity: selection.quantity,
      }));

    // Prepare order data
    const orderData: UpdatePurchaseOrderData = {
      warehouse_id: formData.warehouseId,
      supplier_id: formData.supplierId,
      agent_id: formData.agentId || null,
      order_date: formData.orderDate,
      expected_delivery_date: formData.deliveryDate || null,
      advance_amount: formData.advanceAmount
        ? parseFloat(formData.advanceAmount)
        : 0,
      discount_type: "none",
      discount_value: 0,
      notes: formData.notes || null,
      attachments: [],
      status: "in_progress",
    };

    // Prepare line items
    const lineItems = selectedProducts.map((product) => ({
      product_id: product.id,
      required_quantity: product.quantity,
      unit_rate: 0,
    }));

    // Approve purchase order using mutation
    approveOrder.mutate(
      { orderId: order.id, orderData, lineItems },
      {
        onSuccess: () => {
          toast.success("Purchase order approved successfully");
          router.push(
            `/warehouse/${warehouse.slug}/purchase-orders/${order.sequence_number}`,
          );
        },
        onError: (error) => {
          console.error("Error approving purchase order:", error);
          toast.error("Failed to approve purchase order");
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading order..." />;
  }

  if (isError || !order) {
    return (
      <ErrorState
        title="Order not found"
        message="This order does not exist or cannot be approved"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  if (order.status !== "approval_pending") {
    return (
      <ErrorState
        title="Order already approved"
        message="This order has already been approved or cancelled"
        onRetry={() =>
          router.push(
            `/warehouse/${warehouse.slug}/purchase-orders/${order.sequence_number}`,
          )
        }
        actionText="View order"
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        <FormHeader
          title="Approve Purchase Order"
          currentStep={
            currentStep === "products" ? 1 : currentStep === "supplier" ? 2 : 3
          }
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={approveOrder.isPending}
        />

        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={warehouse.id}
              productSelections={productSelections}
              onOpenQuantitySheet={handleOpenQuantitySheet}
              onAddNewProduct={() => {}}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : currentStep === "supplier" ? (
            <SupplierSelectionStep
              selectedSupplierId={selectedSupplierId}
              onSelectSupplier={handleSelectSupplier}
              onAddNewSupplier={() => {}}
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

        <FormFooter>
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
          ) : currentStep === "supplier" ? (
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
                disabled={!selectedSupplierId || approveOrder.isPending}
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
                onClick={handleSubmit}
                disabled={!canSubmit || approveOrder.isPending}
                className="flex-1"
              >
                {approveOrder.isPending ? "Approving..." : "Approve Order"}
              </Button>
            </>
          )}
        </FormFooter>

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
      </div>
    </div>
  );
}
