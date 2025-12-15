"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import {
  useSalesOrderByNumber,
  useSalesOrderMutations,
} from "@/lib/query/hooks/sales-orders";
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
    sale_number: string;
  }>;
}

export default function EditSalesOrderItemsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, sale_number } = use(params);
  const { hideChrome, showChromeUI } = useAppChrome();

  // Hide chrome for immersive editing experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  // Fetch sales order
  const {
    data: order,
    isLoading,
    isError,
  } = useSalesOrderByNumber(sale_number);

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  // Sales order mutations
  const { updateLineItems } = useSalesOrderMutations(
    order?.warehouse_id || null,
  );

  // Pre-populate productSelections from existing order items
  useEffect(() => {
    if (order?.sales_order_items) {
      const initialSelections: Record<
        string,
        { selected: boolean; quantity: number }
      > = {};
      order.sales_order_items.forEach((item) => {
        initialSelections[item.product_id] = {
          selected: true,
          quantity: item.required_quantity,
        };
      });
      setProductSelections(initialSelections);
    }
  }, [order?.sales_order_items]);

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

  const canSave = useMemo(
    () =>
      Object.values(productSelections).some(
        (p) => p.selected && p.quantity > 0,
      ),
    [productSelections],
  );

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse_slug}/sales-orders/${sale_number}/details`,
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
        // Find existing item to preserve price if exists
        unit_rate:
          order.sales_order_items.find((item) => item.product_id === productId)
            ?.unit_rate || 0,
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
            `/warehouse/${warehouse_slug}/sales-orders/${sale_number}/details`,
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
            `/warehouse/${warehouse_slug}/sales-orders/${sale_number}/details`,
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
