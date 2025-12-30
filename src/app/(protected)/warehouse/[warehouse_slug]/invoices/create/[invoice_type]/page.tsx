"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { InvoiceReviewStep } from "../../InvoiceReviewStep";
import { InvoiceDetailsStep } from "../../InvoiceDetailsStep";
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
import type {
  DiscountType,
  InvoiceTaxType,
  InvoiceType,
} from "@/types/database/enums";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { dateToISOString } from "@/lib/utils/date";

interface InvoiceFormData {
  warehouseId: string;
  partyLedgerId: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  taxType: InvoiceTaxType;
  discountType: DiscountType;
  discount: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  notes: string;
  files: File[];
}

type FormStep = "partner" | "products" | "details" | "review";

export default function CreateInvoicePage() {
  const router = useRouter();
  const { warehouse } = useSession(); // This will still get warehouse from session
  const { hideChrome, showChromeUI } = useAppChrome();
  const params = useParams();
  const searchParams = useSearchParams();
  const invoice_type = params.invoice_type as InvoiceType;

  const isSales = invoice_type === "sales";
  const partnerType = isSales ? "customer" : "supplier";
  const ledgerName = isSales ? "Sales" : "Purchase";
  const pageTitle = isSales
    ? "Create Sales Invoice"
    : "Create Purchase Invoice";
  const successMessage = isSales
    ? "Sales invoice created successfully"
    : "Purchase invoice created successfully";

  // Read URL params for order prefill
  const orderNumber = searchParams.get("order");
  const fullOrder = searchParams.get("full_order") === "true";
  const movementIds = searchParams.get("movements")?.split(",").filter(Boolean);

  // Fetch order data if orderNumber is provided
  const { data: salesOrder } = useSalesOrderByNumber(
    isSales && orderNumber ? orderNumber : null,
  );
  const { data: purchaseOrder } = usePurchaseOrderByNumber(
    !isSales && orderNumber ? orderNumber : null,
  );
  const order = isSales ? salesOrder : purchaseOrder;

  // Fetch movements if movement IDs are provided
  const { data: outwardsData } = useGoodsOutwardsBySalesOrder(
    isSales && orderNumber ? orderNumber : null,
  );
  const { data: inwardsData } = useGoodsInwardsByPurchaseOrder(
    !isSales && orderNumber ? orderNumber : null,
  );

  // Skip partner selection if coming from order (orderNumber exists)
  const [currentStep, setCurrentStep] = useState<FormStep>(
    orderNumber ? "products" : "partner",
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

  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI();
  }, [hideChrome, showChromeUI]);

  const [formData, setFormData] = useState<InvoiceFormData>({
    warehouseId: warehouse.id,
    partyLedgerId: "",
    invoiceDate: "",
    dueDate: "",
    paymentTerms: "",
    taxType: "gst",
    discountType: "none",
    discount: "",
    supplierInvoiceNumber: "",
    supplierInvoiceDate: "",
    notes: "",
    files: [],
  });

  // Prefill form data from order when order data is loaded
  useEffect(() => {
    // Only prefill if we have order data and haven't already set a party ledger
    if (!order || formData.partyLedgerId) return;

    // Get partner and ledger from order
    const partner = isSales
      ? "customer" in order
        ? order.customer
        : null
      : "supplier" in order
        ? order.supplier
        : null;

    if (!partner) {
      console.warn("Partner not found in order data");
      return;
    }

    // Get ledger ID from the partner's ledger array (should have exactly one)
    const ledgerArray = partner.ledger;
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
      paymentTerms: order.payment_terms || "",
      discountType: order.discount_type || "none",
      discount: order.discount_value?.toString() || "",
      supplierInvoiceNumber: isSales
        ? ""
        : "supplier_invoice_number" in order
          ? order.supplier_invoice_number || ""
          : "",
      supplierInvoiceDate: isSales
        ? ""
        : "supplier_invoice_date" in order
          ? order.supplier_invoice_date || ""
          : "",
    }));

    setSelectedPartnerId(partner.id);

    // Prefill product selections based on full_order or movements
    if (fullOrder) {
      // Use order items directly
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
    } else if (movementIds && movementIds.length > 0) {
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
    }
  }, [
    order,
    formData.partyLedgerId,
    isSales,
    fullOrder,
    movementIds,
    outwardsData,
    inwardsData,
  ]);

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

  const subtotal = useMemo(() => {
    return Object.values(productSelections).reduce(
      (acc, { quantity, rate }) => {
        return acc + quantity * rate;
      },
      0,
    );
  }, [productSelections]);

  const canSubmit = useMemo(
    () =>
      formData.partyLedgerId !== "" &&
      formData.invoiceDate !== "" &&
      canProceedFromProducts,
    [formData.partyLedgerId, formData.invoiceDate, canProceedFromProducts],
  );

  const handleNext = () => {
    if (currentStep === "partner") {
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("review");
    }
  };

  const handleBack = () => {
    if (currentStep === "review") {
      setCurrentStep("details");
    } else if (currentStep === "details") {
      setCurrentStep("products");
    } else if (currentStep === "products") {
      setCurrentStep("partner");
    }
  };

  const handleSelectPartner = (partnerId: string, ledgerId: string) => {
    setSelectedPartnerId(partnerId);
    // Auto-advance to next step
    setTimeout(() => {
      setFormData((prev) => ({ ...prev, partyLedgerId: ledgerId }));
      setCurrentStep("products");
    }, 300); // Small delay for visual feedback
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/invoices`);
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

    // Prepare invoice data
    const invoiceData: CreateInvoiceData = {
      invoice_type: invoice_type,
      party_ledger_id: formData.partyLedgerId,
      counter_ledger_id: counterLedger.id, // Purchase/Sales ledger for double-entry
      warehouse_id: formData.warehouseId,
      invoice_date: formData.invoiceDate,
      payment_terms: formData.paymentTerms || null,
      due_date: formData.dueDate || null,
      tax_type: formData.taxType,
      discount_type: formData.discountType,
      discount_value:
        formData.discountType !== "none" && formData.discount
          ? parseFloat(formData.discount)
          : null,
      supplier_invoice_number: formData.supplierInvoiceNumber || null,
      supplier_invoice_date: formData.supplierInvoiceDate || null,
      notes: formData.notes || null,
      items: selectedProducts,
    };

    // Create invoice using mutation
    createInvoice.mutate(invoiceData, {
      onSuccess: (invoiceNumber) => {
        toast.success(successMessage);
        router.push(`/warehouse/${warehouse.slug}/invoices/${invoiceNumber}`);
      },
      onError: (error) => {
        console.error("Error creating invoice:", error);
        toast.error("Failed to create invoice");
      },
    });
  };

  const getStepNumber = () => {
    switch (currentStep) {
      case "partner":
        return 1;
      case "products":
        return 2;
      case "details":
        return 3;
      case "review":
        return 4;
      default:
        return 1;
    }
  };

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={pageTitle}
          currentStep={getStepNumber()}
          totalSteps={4}
          onCancel={handleCancel}
          disableCancel={createInvoice.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "partner" ? (
            <PartnerSelectionStep
              partnerType={partnerType}
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={handleSelectPartner}
            />
          ) : currentStep === "products" ? (
            <ProductSelectionStep
              warehouseId={warehouse.id}
              contextType={invoice_type}
              productSelections={productSelections}
              onQuantityChange={handleQuantityChange}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : currentStep === "details" ? (
            <InvoiceDetailsStep
              formData={formData}
              setFormData={(updates) =>
                setFormData((prev) => ({ ...prev, ...updates }))
              }
              invoiceType={invoice_type}
              subtotal={subtotal}
            />
          ) : (
            <InvoiceReviewStep
              warehouseId={warehouse.id}
              productSelections={productSelections}
              taxType={formData.taxType}
              discountType={formData.discountType}
              discountValue={
                formData.discount ? parseFloat(formData.discount) : 0
              }
            />
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <FormFooter>
          {currentStep === "partner" ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedPartnerId || createInvoice.isPending}
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
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || createInvoice.isPending}
                className="flex-1"
              >
                Next
              </Button>
            </>
          ) : currentStep === "details" ? (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceedFromProducts || createInvoice.isPending}
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
                disabled={createInvoice.isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || createInvoice.isPending}
                className="flex-1"
              >
                {createInvoice.isPending ? "Saving..." : "Submit"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
