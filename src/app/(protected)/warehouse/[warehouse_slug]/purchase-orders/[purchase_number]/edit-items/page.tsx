"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import {
  usePurchaseOrderByNumber,
  usePurchaseOrderMutations,
} from "@/lib/query/hooks/purchase-orders";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { toast } from "sonner";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { Button } from "@/components/ui/button";
import { useAppChrome } from "@/contexts/app-chrome-context";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    purchase_number: string;
  }>;
}

export default function EditPurchaseOrderItemsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, purchase_number } = use(params);
  const { hideChrome, showChromeUI } = useAppChrome();

  // Hide chrome for immersive editing experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Fetch purchase order
  const {
    data: order,
    isLoading,
    isError,
  } = usePurchaseOrderByNumber(purchase_number);

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  // Purchase order mutations
  const { updateLineItems } = usePurchaseOrderMutations(
    order?.warehouse_id || null,
  );

  // Pre-populate productSelections from existing order items
  useEffect(() => {
    if (order?.purchase_order_items) {
      const initialSelections: Record<
        string,
        { selected: boolean; quantity: number; rate: number }
      > = {};
      order.purchase_order_items.forEach((item) => {
        initialSelections[item.product_id] = {
          selected: true,
          quantity: item.required_quantity,
          rate: item.unit_rate || 0,
        };
      });
      setProductSelections(initialSelections);
    }
  }, [order?.purchase_order_items]);

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

  const canSave = useMemo(
    () =>
      Object.values(productSelections).some(
        (p) => p.selected && p.quantity > 0,
      ),
    [productSelections],
  );

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse_slug}/purchase-orders/${purchase_number}/details`,
    );
  };

  const handleSave = async () => {
    if (!order || !canSave) return;

    // Check if order is still in approval_pending status
    if (order.status !== "approval_pending") {
      toast.error("Order can only be edited in approval pending status");
      return;
    }

    // Prepare line items from selections
    const lineItems = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        product_id: productId,
        required_quantity: selection.quantity,
        unit_rate: selection.rate,
      }));

    if (lineItems.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    updateLineItems.mutate(
      {
        orderId: order.id,
        lineItems,
      },
      {
        onSuccess: () => {
          toast.success("Line items updated successfully");
          router.push(
            `/warehouse/${warehouse_slug}/purchase-orders/${purchase_number}/details`,
          );
        },
        onError: (error) => {
          console.error("Error updating line items:", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to update line items",
          );
        },
      },
    );
  };

  if (isLoading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (isError || !order) {
    return (
      <ErrorState
        title="Could not load order"
        message="An error occurred while fetching the order details."
        onRetry={() => router.refresh()}
      />
    );
  }

  // Check if order is editable
  if (order.status !== "approval_pending") {
    return (
      <ErrorState
        title="Order not editable"
        message="Line items can only be edited when the order is in approval pending status."
        onRetry={() =>
          router.push(
            `/warehouse/${warehouse_slug}/purchase-orders/${purchase_number}/details`,
          )
        }
      />
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <FormHeader
          title="Edit line items"
          currentStep={1}
          totalSteps={1}
          onCancel={handleCancel}
          disableCancel={updateLineItems.isPending}
        />

        {/* Product Selection - Full Page */}
        <ProductSelectionStep
          warehouseId={order.warehouse_id || ""}
          contextType="purchase"
          productSelections={productSelections}
          onQuantityChange={handleQuantityChange}
          onRemoveProduct={handleRemoveProduct}
        />

        {/* Footer */}
        <FormFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={updateLineItems.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!canSave || updateLineItems.isPending}
            className="flex-1"
          >
            {updateLineItems.isPending ? "Saving..." : "Save changes"}
          </Button>
        </FormFooter>
      </div>
    </>
  );
}
