"use client";

import { useState, useMemo, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InvoiceReviewStep } from "../../InvoiceReviewStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { useInvoiceMutations } from "@/lib/query/hooks/invoices";
import { useLedgers } from "@/lib/query/hooks/ledgers";
import { useSalesOrderByNumber } from "@/lib/query/hooks/sales-orders";
import { usePurchaseOrderByNumber } from "@/lib/query/hooks/purchase-orders";
import {
  useGoodsOutwardsBySalesOrder,
  useGoodsInwardsByPurchaseOrder,
} from "@/lib/query/hooks/stock-flow";
import { CreateInvoiceData } from "@/types/invoices.types";
import type { InvoiceType } from "@/types/database/enums";
import type { Partner } from "@/types/partners.types";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { dateToISOString } from "@/lib/utils/date";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    invoice_type: string;
  }>;
}

export default function QuickCreateInvoicePage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const searchParams = useSearchParams();
  const { invoice_type } = use(params);

  const isSales = invoice_type === "sales";
  const ledgerName = isSales ? "Sales" : "Purchase";
  const pageTitle = isSales
    ? "Create Sales Invoice"
    : "Create Purchase Invoice";
  const successMessage = isSales
    ? "Sales invoice created successfully"
    : "Purchase invoice created successfully";

  // Read URL params for order prefill
  const orderNumber = searchParams.get("order");
  const movementIds = searchParams.get("movements")?.split(",").filter(Boolean);

  // Fetch order data if orderNumber is provided
  const {
    data: salesOrder,
    isLoading: salesOrderLoading,
    isError: salesOrderError,
  } = useSalesOrderByNumber(isSales && orderNumber ? orderNumber : null);
  const {
    data: purchaseOrder,
    isLoading: purchaseOrderLoading,
    isError: purchaseOrderError,
  } = usePurchaseOrderByNumber(!isSales && orderNumber ? orderNumber : null);
  const order = isSales ? salesOrder : purchaseOrder;
  const orderLoading = isSales ? salesOrderLoading : purchaseOrderLoading;
  const orderError = isSales ? salesOrderError : purchaseOrderError;

  // Fetch movements if movement IDs are provided
  const { data: outwardsData } = useGoodsOutwardsBySalesOrder(
    isSales && orderNumber ? orderNumber : null,
  );
  const { data: inwardsData } = useGoodsInwardsByPurchaseOrder(
    !isSales && orderNumber ? orderNumber : null,
  );

  // Invoice mutations
  const { create: createInvoice } = useInvoiceMutations();

  // Fetch ledgers to get default ledger
  const { data: ledgers } = useLedgers();
  const counterLedger = useMemo(
    () => ledgers?.find((l) => l.name === ledgerName),
    [ledgers, ledgerName],
  );

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number; rate: number }>
  >({});

  const [partner, setPartner] = useState<Pick<
    Partner,
    | "display_name"
    | "gst_number"
    | "billing_address_line1"
    | "billing_address_line2"
    | "billing_city"
    | "billing_state"
    | "billing_country"
    | "billing_pin_code"
    | "shipping_same_as_billing"
    | "shipping_address_line1"
    | "shipping_address_line2"
    | "shipping_city"
    | "shipping_state"
    | "shipping_country"
    | "shipping_pin_code"
  > | null>(null);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  const [formData, setFormData] = useState({
    warehouseId: warehouse.id,
    partyLedgerId: "",
    invoiceDate: "",
    taxType: "gst" as "no_tax" | "gst" | "igst",
    discountType: "none" as "none" | "percentage" | "flat_amount",
    discount: "",
  });

  // Prefill form data from order when order data is loaded
  useEffect(() => {
    // Only prefill if we have order data and haven't already set a party ledger
    if (!order || formData.partyLedgerId) return;

    // Get partner and ledger from order
    const partnerData = isSales
      ? "customer" in order
        ? order.customer
        : null
      : "supplier" in order
        ? order.supplier
        : null;

    if (!partnerData) {
      console.warn("Partner not found in order data");
      return;
    }

    // Get ledger ID from the partner's ledger array (should have exactly one)
    const ledgerArray = partnerData.ledger;
    if (!ledgerArray || ledgerArray.length === 0) {
      console.warn("Partner ledger not found in order data");
      return;
    }

    const partnerLedgerId = ledgerArray[0].id;

    // Prefill form data
    setFormData((prev) => ({
      ...prev,
      partyLedgerId: partnerLedgerId,
      invoiceDate: dateToISOString(new Date()),
      taxType: order.tax_type || "gst",
      discountType: order.discount_type || "none",
      discount: order.discount_value?.toString() || "",
    }));

    // Set partner details for InvoiceReviewStep
    setPartner({
      display_name: partnerData.display_name,
      gst_number: partnerData.gst_number,
      billing_address_line1: partnerData.billing_address_line1,
      billing_address_line2: partnerData.billing_address_line2,
      billing_city: partnerData.billing_city,
      billing_state: partnerData.billing_state,
      billing_country: partnerData.billing_country,
      billing_pin_code: partnerData.billing_pin_code,
      shipping_same_as_billing: partnerData.shipping_same_as_billing,
      shipping_address_line1: partnerData.shipping_address_line1,
      shipping_address_line2: partnerData.shipping_address_line2,
      shipping_city: partnerData.shipping_city,
      shipping_state: partnerData.shipping_state,
      shipping_country: partnerData.shipping_country,
      shipping_pin_code: partnerData.shipping_pin_code,
    });

    // Prefill product selections based on movements or full order
    if (movementIds && movementIds.length > 0) {
      // Aggregate from selected movements
      const movements = isSales ? outwardsData?.data : inwardsData?.data;
      const selectedMovements = movements?.filter((m) =>
        movementIds.includes(m.id),
      );

      if (!selectedMovements || selectedMovements.length === 0) return;

      // Aggregate quantities by product
      const aggregatedProducts: Record<
        string,
        { quantity: number; rate: number; productId: string }
      > = {};

      selectedMovements.forEach((movement) => {
        if (isSales) {
          // For sales (outwards): aggregate from goods_outward_items
          const outwardItems =
            "goods_outward_items" in movement
              ? movement.goods_outward_items
              : [];

          outwardItems.forEach((item) => {
            const stockUnit = item.stock_unit;
            if (!stockUnit?.product) return;

            const productId = stockUnit.product.id;
            const quantity = item.quantity_dispatched;

            if (!aggregatedProducts[productId]) {
              aggregatedProducts[productId] = {
                productId,
                quantity: 0,
                rate: 0, // Will be set from order items if available
              };
            }
            aggregatedProducts[productId].quantity += quantity;
          });
        } else {
          // For purchase (inwards): aggregate from stock_units
          const stockUnits =
            "stock_units" in movement ? movement.stock_units : [];

          stockUnits.forEach((stockUnit) => {
            if (!stockUnit.product) return;

            const productId = stockUnit.product.id;
            const quantity = stockUnit.initial_quantity;

            if (!aggregatedProducts[productId]) {
              aggregatedProducts[productId] = {
                productId,
                quantity: 0,
                rate: 0, // Will be set from order items if available
              };
            }
            aggregatedProducts[productId].quantity += quantity;
          });
        }
      });

      // Get rates from order items
      const orderItems = isSales
        ? "sales_order_items" in order
          ? order.sales_order_items
          : []
        : "purchase_order_items" in order
          ? order.purchase_order_items
          : [];

      const rateMap = new Map<string, number>();
      orderItems?.forEach((item) => {
        rateMap.set(item.product_id, item.unit_rate);
      });

      // Build final selections with rates
      const selections: Record<
        string,
        { selected: boolean; quantity: number; rate: number }
      > = {};

      Object.values(aggregatedProducts).forEach(({ productId, quantity }) => {
        const rate = rateMap.get(productId) || 0;
        selections[productId] = {
          selected: true,
          quantity,
          rate,
        };
      });

      setProductSelections(selections);
    } else {
      // Use order items directly (full order)
      const orderItems = isSales
        ? "sales_order_items" in order
          ? order.sales_order_items
          : []
        : "purchase_order_items" in order
          ? order.purchase_order_items
          : [];

      const selections: Record<
        string,
        { selected: boolean; quantity: number; rate: number }
      > = {};

      orderItems?.forEach((item) => {
        selections[item.product_id] = {
          selected: true,
          quantity: item.required_quantity,
          rate: item.unit_rate,
        };
      });

      setProductSelections(selections);
    }
  }, [
    order,
    formData.partyLedgerId,
    isSales,
    movementIds,
    outwardsData,
    inwardsData,
  ]);

  const canSubmit = useMemo(
    () =>
      formData.partyLedgerId !== "" &&
      formData.invoiceDate !== "" &&
      Object.values(productSelections).some(
        (p) => p.selected && p.quantity > 0 && p.rate > 0,
      ),
    [formData.partyLedgerId, formData.invoiceDate, productSelections],
  );

  const handleCancel = () => {
    if (orderNumber) {
      // Return to order details page
      const basePath = isSales ? "sales-orders" : "purchase-orders";
      router.push(
        `/warehouse/${warehouse.slug}/${basePath}/${orderNumber}/details`,
      );
    } else {
      router.push(`/warehouse/${warehouse.slug}/invoices`);
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    // Validate counter ledger exists
    if (!counterLedger) {
      toast.error(
        `${ledgerName} ledger not found. Please ensure default ledgers are seeded.`,
      );
      return;
    }

    const selectedProducts = Object.entries(productSelections)
      .filter(([, selection]) => selection.selected && selection.quantity > 0)
      .map(([productId, selection]) => ({
        product_id: productId,
        quantity: selection.quantity,
        rate: selection.rate,
      }));

    // Validate and filter movement IDs (intersection with order's movements)
    let validatedMovementIds: string[] | undefined;
    if (movementIds && movementIds.length > 0) {
      const movements = isSales ? outwardsData?.data : inwardsData?.data;
      const orderMovementIds = new Set(movements?.map((m) => m.id) || []);

      // Take intersection: only include IDs that exist in the order
      validatedMovementIds = movementIds.filter((id) =>
        orderMovementIds.has(id),
      );

      // If no valid IDs remain after filtering, pass undefined
      if (validatedMovementIds.length === 0) {
        validatedMovementIds = undefined;
      }
    }

    // Prepare invoice data
    const invoiceData: CreateInvoiceData = {
      invoice_type: invoice_type as InvoiceType,
      party_ledger_id: formData.partyLedgerId,
      counter_ledger_id: counterLedger.id,
      warehouse_id: formData.warehouseId,
      invoice_date: formData.invoiceDate,
      tax_type: formData.taxType,
      discount_type: formData.discountType,
      discount_value:
        formData.discountType !== "none" && formData.discount
          ? parseFloat(formData.discount)
          : undefined,
      items: selectedProducts,
      source_sales_order_id: salesOrder?.id,
      source_purchase_order_id: purchaseOrder?.id,
      goods_movement_ids: validatedMovementIds,
    };

    // Create invoice using mutation
    createInvoice.mutate(invoiceData, {
      onSuccess: (invoiceNumber) => {
        toast.success(successMessage);
        router.push(
          `/warehouse/${warehouse.slug}/invoices/${invoiceNumber}/details`,
        );
      },
      onError: (error) => {
        console.error("Error creating invoice:", error);
        toast.error("Failed to create invoice");
      },
    });
  };

  // Loading state
  if (orderLoading) {
    return <LoadingState message="Loading order..." />;
  }

  // Error state
  if (orderError || (orderNumber && !order)) {
    return (
      <ErrorState
        title="Failed to load order"
        message="Could not load the order for invoice creation"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  // Validation: require order number
  if (!orderNumber) {
    return (
      <ErrorState
        title="Invalid Request"
        message="Order number is required for quick invoice creation"
        onRetry={handleCancel}
        actionText="Go to invoices"
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={pageTitle}
          currentStep={1}
          totalSteps={1}
          onCancel={handleCancel}
          disableCancel={createInvoice.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          <InvoiceReviewStep
            warehouseId={warehouse.id}
            productSelections={productSelections}
            taxType={formData.taxType}
            discountType={formData.discountType}
            additionalCharges={[]}
            discountValue={
              formData.discount ? parseFloat(formData.discount) : 0
            }
            partner={partner}
          />
        </div>

        {/* Footer - Fixed at bottom */}
        <FormFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={createInvoice.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createInvoice.isPending}
            className="flex-1"
          >
            {createInvoice.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </FormFooter>
      </div>
    </div>
  );
}
