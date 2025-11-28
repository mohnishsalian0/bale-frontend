"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { ProductQuantitySheet } from "../ProductQuantitySheet";
import { ProductSelectionStep } from "../ProductSelectionStep";
import { OrderDetailsStep } from "../OrderDetailsStep";
import { ProductFormSheet } from "../../inventory/ProductFormSheet";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import {
  getProductsWithInventory,
  getProductAttributeLists,
  type ProductWithInventory,
  type ProductMaterial,
  type ProductColor,
  type ProductTag,
} from "@/lib/queries/products";

interface ProductWithSelection extends ProductWithInventory {
  selected: boolean;
  quantity: number;
}

interface OrderFormData {
  warehouseId: string;
  customerId: string;
  agentId: string;
  orderDate: string;
  expectedDate: string;
  advanceAmount: string;
  discount: string;
  notes: string;
  files: File[];
}

type FormStep = "products" | "details";

export default function CreateSalesOrderPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("products");
  const [products, setProducts] = useState<ProductWithSelection[]>([]);
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithInventory | null>(null);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const [formData, setFormData] = useState<OrderFormData>({
    warehouseId: warehouse.id,
    customerId: "",
    agentId: "",
    orderDate: "",
    expectedDate: "",
    advanceAmount: "",
    discount: "",
    notes: "",
    files: [],
  });

  // Load products on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch products with inventory and attributes in parallel
      const [productsData, attributeLists] = await Promise.all([
        getProductsWithInventory(warehouse.id),
        getProductAttributeLists(),
      ]);

      // Add selection state to products
      const productsWithSelection: ProductWithSelection[] = productsData.map(
        (product) => ({
          ...product,
          selected: false,
          quantity: 0,
        }),
      );

      setProducts(productsWithSelection);
      setMaterials(attributeLists.materials);
      setColors(attributeLists.colors);
      setTags(attributeLists.tags);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuantitySheet = (product: ProductWithInventory) => {
    setSelectedProduct(product);
    setShowQuantitySheet(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (selectedProduct) {
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product.id === selectedProduct.id
            ? {
                ...product,
                selected: true,
                quantity: quantity,
              }
            : product,
        ),
      );
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, selected: false, quantity: 0 }
          : product,
      ),
    );
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
    setCurrentStep("details");
  };

  const handleBack = () => {
    setCurrentStep("products");
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/sales-orders`);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    try {
      const selectedProducts = products.filter(
        (p) => p.selected && p.quantity > 0,
      );

      // Prepare order data
      const orderData = {
        warehouse_id: formData.warehouseId,
        customer_id: formData.customerId,
        agent_id: formData.agentId || null,
        order_date: formData.orderDate,
        expected_delivery_date: formData.expectedDate || null,
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

      // Create sales order with items atomically using RPC function
      const { data: _orderId, error: orderError } = await supabase.rpc(
        "create_sales_order_with_items",
        {
          p_order_data: orderData,
          p_line_items: lineItems,
        },
      );

      if (orderError) throw orderError;

      // Success! Show toast and redirect
      toast.success("Sales order created successfully");
      router.push(`/warehouse/${warehouse.slug}/sales-orders`);
    } catch (error) {
      console.error("Error creating sales order:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create sales order",
      );
    } finally {
      setSaving(false);
    }
  };

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
              disabled={saving}
            >
              <IconArrowLeft className="size-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-gray-900">
                Create sales order
              </h1>
              <p className="text-sm text-gray-500">
                Step {currentStep === "products" ? "1" : "2"} of 2
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{ width: currentStep === "products" ? "50%" : "100%" }}
            />
          </div>
        </div>

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
        <div className="shrink-0 border-t border-gray-200 bg-background p-4 flex">
          <div className="w-full flex gap-3">
            {currentStep === "products" ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!canProceed || saving}
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
                  disabled={saving}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || saving}
                  className="flex-1"
                >
                  {saving ? "Saving..." : "Submit"}
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
              products.find((p) => p.id === selectedProduct.id)?.quantity || 0
            }
            onConfirm={handleQuantityConfirm}
          />
        )}

        {/* Add Product Sheet */}
        {showCreateProduct && (
          <ProductFormSheet
            open={showCreateProduct}
            onOpenChange={setShowCreateProduct}
            onProductAdded={loadData}
          />
        )}
      </div>
    </div>
  );
}
