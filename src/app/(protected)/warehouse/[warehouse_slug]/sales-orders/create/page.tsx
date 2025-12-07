"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductQuantitySheet } from "../ProductQuantitySheet";
import { ProductSelectionStep } from "../ProductSelectionStep";
import { CustomerSelectionStep } from "../CustomerSelectionStep";
import { OrderDetailsStep } from "../OrderDetailsStep";
import { ProductFormSheet } from "../../inventory/ProductFormSheet";
import { PartnerFormSheet } from "../../partners/PartnerFormSheet";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  useProductsWithInventory,
  useProductAttributes,
} from "@/lib/query/hooks/products";
import { useSalesOrderMutations } from "@/lib/query/hooks/sales-orders";
import type { ProductWithInventoryListView } from "@/types/products.types";
import { CreateSalesOrderData } from "@/types/sales-orders.types";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

interface ProductWithSelection extends ProductWithInventoryListView {
  selected: boolean;
  quantity: number;
}

interface OrderFormData {
  warehouseId: string;
  customerId: string;
  agentId: string;
  orderDate: string;
  deliveryDate: string;
  advanceAmount: string;
  discount: string;
  notes: string;
  files: File[];
}

type FormStep = "products" | "customer" | "details";

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("products");

  // Fetch products and attributes using TanStack Query
  const { data: productsResponse, isLoading: productsLoading } =
    useProductsWithInventory(warehouse.id, { is_active: true });
  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();

  const productsData = productsResponse?.data || [];

  // Sales order mutations
  const { create: createOrder } = useSalesOrderMutations(warehouse.id);

  // Track product selection state locally
  const [productSelections, setProductSelections] = useState<
    Record<string, { selected: boolean; quantity: number }>
  >({});

  // Combine products data with selection state
  const products: ProductWithSelection[] = useMemo(
    () =>
      productsData.map((product) => ({
        ...product,
        selected: productSelections[product.id]?.selected || false,
        quantity: productSelections[product.id]?.quantity || 0,
      })),
    [productsData, productSelections],
  );

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading;

  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithInventoryListView | null>(null);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
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
    deliveryDate: "",
    advanceAmount: "",
    discount: "",
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
    () => products.some((p) => p.selected && p.quantity > 0),
    [products],
  );

  const canSubmit = useMemo(
    () => formData.customerId !== "" && formData.orderDate !== "",
    [formData.customerId, formData.orderDate],
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
    router.push(`/warehouse/${warehouse.slug}/sales-orders`);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const selectedProducts = products.filter(
      (p) => p.selected && p.quantity > 0,
    );

    // Prepare order data
    const orderData: CreateSalesOrderData = {
      warehouse_id: formData.warehouseId,
      customer_id: formData.customerId,
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

    // Create sales order using mutation
    createOrder.mutate(
      { orderData, lineItems },
      {
        onSuccess: () => {
          toast.success("Sales order created successfully");
          router.push(`/warehouse/${warehouse.slug}/sales-orders`);
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
            currentStep === "products" ? 1 : currentStep === "customer" ? 2 : 3
          }
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={createOrder.isPending}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "products" ? (
            <ProductSelectionStep
              products={products}
              materials={materials}
              colors={colors}
              tags={tags}
              loading={loading}
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
          ) : currentStep === "customer" ? (
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
                disabled={!selectedCustomerId || createOrder.isPending}
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
              products.find((p) => p.id === selectedProduct.id)?.quantity || 0
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
