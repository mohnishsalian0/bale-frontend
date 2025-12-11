"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductQuantitySheet } from "@/components/layouts/product-quantity-sheet";
import { ProductSelectionStep } from "@/components/layouts/product-selection-step";
import { SupplierSelectionStep } from "../SupplierSelectionStep";
import { PurchaseOrderDetailsStep } from "../PurchaseOrderDetailsStep";
import { ProductFormSheet } from "../../inventory/ProductFormSheet";
import { PartnerFormSheet } from "../../partners/PartnerFormSheet";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { usePurchaseOrderMutations } from "@/lib/query/hooks/purchase-orders";
import type { ProductWithInventoryListView } from "@/types/products.types";
import { CreatePurchaseOrderData } from "@/types/purchase-orders.types";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

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

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithInventoryListView | null>(null);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
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
      discount_type: "none",
      discount_value: 0,
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
              onOpenQuantitySheet={handleOpenQuantitySheet}
              onAddNewProduct={() => setShowCreateProduct(true)}
              onRemoveProduct={handleRemoveProduct}
            />
          ) : currentStep === "supplier" ? (
            <SupplierSelectionStep
              selectedSupplierId={selectedSupplierId}
              onSelectSupplier={handleSelectSupplier}
              onAddNewSupplier={() => setShowAddSupplier(true)}
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

        {/* Add Supplier Sheet */}
        {showAddSupplier && (
          <PartnerFormSheet
            open={showAddSupplier}
            onOpenChange={setShowAddSupplier}
            partnerType="supplier"
          />
        )}
      </div>
    </div>
  );
}
