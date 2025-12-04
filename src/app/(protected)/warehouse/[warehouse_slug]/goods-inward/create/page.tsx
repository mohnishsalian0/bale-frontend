"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  ProductSelectionStep,
  ProductWithUnits,
  StockUnitSpec,
} from "../ProductSelectionStep";
import { StockUnitFormSheet } from "../StockUnitFormSheet";
import { AllSpecificationsSheet } from "../AllSpecificationsSheet";
import { PieceQuantitySheet } from "../PieceQuantitySheet";
import { PartnerSelectionStep } from "@/components/stock-flow/PartnerSelectionStep";
import { InwardLinkToStep, InwardLinkToData } from "../InwardLinkToStep";
import { InwardDetailsStep } from "../InwardDetailsStep";
import { ProductFormSheet } from "../../inventory/ProductFormSheet";
import { PartnerFormSheet } from "../../partners/PartnerFormSheet";
import { useProducts, useProductAttributes } from "@/lib/query/hooks/products";
import { useStockFlowMutations } from "@/lib/query/hooks/stock-flow";
import type { TablesInsert } from "@/types/database/supabase";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { ProductListView } from "@/types/products.types";
import { StockUnitStatus } from "@/types/database/enums";

interface DetailsFormData {
  inwardDate: string;
  invoiceNumber: string;
  notes: string;
  documentFile: File | null;
}

type FormStep = "products" | "partner" | "linkTo" | "details";

export default function CreateGoodsInwardPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("products");

  // Mutations
  const { createInwardWithUnits } = useStockFlowMutations(warehouse.id);

  // Fetch products and attributes using TanStack Query
  const { data: productsData = [], isLoading: productsLoading } = useProducts({
    is_active: true,
  });
  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();

  // Track product units state locally
  const [productUnits, setProductUnits] = useState<
    Record<string, StockUnitSpec[]>
  >({});

  // Combine products data with units state
  const products: ProductWithUnits[] = useMemo(
    () =>
      productsData.map((product) => ({
        ...product,
        units: productUnits[product.id] || [],
      })),
    [productsData, productUnits],
  );

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading;

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  const [saving, setSaving] = useState(false);

  // Unit entry sheet state
  const [showUnitEntrySheet, setShowUnitEntrySheet] = useState(false);
  const [showAllSpecsSheet, setShowAllSpecsSheet] = useState(false);
  const [showPieceQuantitySheet, setShowPieceQuantitySheet] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreatePartner, setShowCreatePartner] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductListView | null>(null);

  // Partner/Warehouse selection state
  const [receivedFromType, setReceivedFromType] = useState<
    "partner" | "warehouse"
  >("partner");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(
    null,
  );

  // Link to state
  const [linkToData, setLinkToData] = useState<InwardLinkToData>({
    linkToType: "purchase_order",
    sales_order_id: null,
    purchase_order_number: null,
    other_reason: null,
    job_work_id: null,
  });

  // Details form state
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
    inwardDate: "",
    invoiceNumber: "",
    notes: "",
    documentFile: null,
  });

  // Handle opening unit sheet
  const handleOpenUnitSheet = (
    product: ProductListView,
    hasExistingUnits: boolean,
  ) => {
    setSelectedProduct(product);

    // For piece type, always open the quantity sheet (simpler flow, no specifications)
    if (product.stock_type === "piece") {
      setShowPieceQuantitySheet(true);
    } else if (hasExistingUnits) {
      setShowAllSpecsSheet(true);
    } else {
      setShowUnitEntrySheet(true);
    }
  };

  // Handle adding a new unit
  const handleAddUnit = (unit: Omit<StockUnitSpec, "id">) => {
    if (!selectedProduct) return;

    const newUnit: StockUnitSpec = {
      ...unit,
      id: `temp-${Date.now()}-${Math.random()}`,
    };

    setProductUnits((prev) => ({
      ...prev,
      [selectedProduct.id]: [...(prev[selectedProduct.id] || []), newUnit],
    }));
  };

  // Handle incrementing unit count
  const handleIncrementUnit = (unitId: string) => {
    if (!selectedProduct) return;

    setProductUnits((prev) => ({
      ...prev,
      [selectedProduct.id]: (prev[selectedProduct.id] || []).map((u) =>
        u.id === unitId ? { ...u, count: u.count + 1 } : u,
      ),
    }));
  };

  // Handle decrementing unit count
  const handleDecrementUnit = (unitId: string) => {
    if (!selectedProduct) return;

    setProductUnits((prev) => ({
      ...prev,
      [selectedProduct.id]: (prev[selectedProduct.id] || []).map((u) =>
        u.id === unitId && u.count > 1 ? { ...u, count: u.count - 1 } : u,
      ),
    }));
  };

  // Handle updating unit count
  const handleUpdateUnitCount = (unitId: string, count: number) => {
    if (!selectedProduct) return;

    setProductUnits((prev) => ({
      ...prev,
      [selectedProduct.id]: (prev[selectedProduct.id] || []).map((u) =>
        u.id === unitId ? { ...u, count: Math.max(1, count) } : u,
      ),
    }));
  };

  // Handle deleting a unit
  const handleDeleteUnit = (unitId: string) => {
    if (!selectedProduct) return;

    setProductUnits((prev) => ({
      ...prev,
      [selectedProduct.id]: (prev[selectedProduct.id] || []).filter(
        (u) => u.id !== unitId,
      ),
    }));
  };

  // Handle adding new unit from AllSpecsSheet
  const handleAddNewUnitFromAllSpecs = () => {
    setShowAllSpecsSheet(false);
    setShowUnitEntrySheet(true);
  };

  // Handle piece quantity confirmation
  const handlePieceQuantityConfirm = (quantity: number) => {
    if (!selectedProduct) return;

    // For piece type, we store a single unit with the total quantity
    // Count will be 1 because we're tracking total pieces in quantity field
    const newUnit: StockUnitSpec = {
      id: `temp-${Date.now()}-${Math.random()}`,
      quantity,
      grade: "A", // Default grade for pieces
      count: 1, // Always 1 for pieces, quantity represents total pieces
    };

    setProductUnits((prev) => ({
      ...prev,
      [selectedProduct.id]: [newUnit], // Replace any existing unit (singleton)
    }));
  };

  // Partner selection handlers
  const handleSelectPartner = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("linkTo");
    }, 300);
  };

  const handleSelectWarehouse = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("linkTo");
    }, 300);
  };

  const handlePartnerTypeChange = (type: "partner" | "warehouse") => {
    setReceivedFromType(type);
    setSelectedPartnerId(null);
    setSelectedWarehouseId(null);
  };

  // Validation for each step
  const canProceedFromProducts = useMemo(
    () => products.some((p) => p.units.length > 0),
    [products],
  );

  const canProceedFromPartner = useMemo(
    () =>
      (receivedFromType === "partner" && selectedPartnerId !== null) ||
      (receivedFromType === "warehouse" && selectedWarehouseId !== null),
    [receivedFromType, selectedPartnerId, selectedWarehouseId],
  );

  const canProceedFromLinkTo = useMemo(() => {
    switch (linkToData.linkToType) {
      case "purchase_order":
        return !!linkToData.purchase_order_number?.trim();
      case "sales_return":
        return !!linkToData.sales_order_id;
      case "other":
        return !!linkToData.other_reason?.trim();
      default:
        return false;
    }
  }, [linkToData]);

  const canSubmit = useMemo(
    () =>
      canProceedFromProducts && canProceedFromPartner && canProceedFromLinkTo,
    [canProceedFromProducts, canProceedFromPartner, canProceedFromLinkTo],
  );

  const handleNext = () => {
    if (currentStep === "products" && canProceedFromProducts) {
      setCurrentStep("partner");
    } else if (currentStep === "partner" && canProceedFromPartner) {
      setCurrentStep("linkTo");
    } else if (currentStep === "linkTo" && canProceedFromLinkTo) {
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("linkTo");
    } else if (currentStep === "linkTo") {
      setCurrentStep("partner");
    } else if (currentStep === "partner") {
      setCurrentStep("products");
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/stock-flow`);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    // Prepare inward data - direct field mapping with aligned enums
    const inwardData: Omit<
      TablesInsert<"goods_inwards">,
      "created_by" | "sequence_number"
    > = {
      warehouse_id: warehouse.id,
      inward_type: linkToData.linkToType as
        | "purchase_order"
        | "sales_return"
        | "other",
      inward_date: detailsFormData.inwardDate || undefined,
      transport_reference_number: detailsFormData.invoiceNumber || undefined,
      partner_id:
        receivedFromType === "partner"
          ? selectedPartnerId || undefined
          : undefined,
      from_warehouse_id:
        receivedFromType === "warehouse"
          ? selectedWarehouseId || undefined
          : undefined,
      sales_order_id: linkToData.sales_order_id || undefined,
      purchase_order_number: linkToData.purchase_order_number || undefined,
      other_reason: linkToData.other_reason || undefined,
      notes: detailsFormData.notes || undefined,
    };

    // Prepare stock units for all products (RPC handles piece vs non-piece)
    const stockUnits: Omit<
      TablesInsert<"stock_units">,
      "created_by" | "modified_by" | "sequence_number"
    >[] = [];

    for (const product of products) {
      if (product.units.length === 0) continue;

      for (const unit of product.units) {
        // For piece type: only one unit with total quantity
        // For non-piece type: multiple stock units based on count
        const unitCount = product.stock_type === "piece" ? 1 : unit.count;
        const stockStatus: StockUnitStatus = "full";

        for (let i = 0; i < unitCount; i++) {
          stockUnits.push({
            warehouse_id: warehouse.id,
            product_id: product.id,
            initial_quantity: unit.quantity,
            remaining_quantity: unit.quantity,
            status: stockStatus,
            quality_grade: unit.grade || null,
            supplier_number: unit.supplier_number || null,
            warehouse_location: unit.location || null,
            notes: unit.notes || null,
          });
        }
      }
    }

    // Use mutation to create inward with stock units atomically
    await createInwardWithUnits.mutateAsync(
      { inwardData, stockUnits },
      {
        onSuccess: () => {
          toast.success("Goods inward created successfully");
          router.push(`/warehouse/${warehouse.slug}/stock-flow`);
        },
        onError: (error) => {
          console.error("Error creating goods inward:", error);
          toast.error("Failed to create goods inward");
        },
      },
    );
  };

  // Get current product's units for AllSpecsSheet
  const currentProductUnits = useMemo(() => {
    if (!selectedProduct) return [];
    const product = products.find((p) => p.id === selectedProduct.id);
    return product?.units || [];
  }, [selectedProduct, products]);

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <div className="border-b border-gray-200 bg-background">
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
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                New Goods Inward
              </h1>
              <p className="text-sm text-gray-500">
                Step{" "}
                {currentStep === "products"
                  ? "1"
                  : currentStep === "partner"
                    ? "2"
                    : currentStep === "linkTo"
                      ? "3"
                      : "4"}{" "}
                of 4
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
                    ? "25%"
                    : currentStep === "partner"
                      ? "50%"
                      : currentStep === "linkTo"
                        ? "75%"
                        : "100%",
              }}
            />
          </div>
        </div>

        {/* Step Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "products" && (
            <ProductSelectionStep
              products={products}
              materials={materials}
              colors={colors}
              tags={tags}
              loading={loading}
              onOpenUnitSheet={handleOpenUnitSheet}
              onAddNewProduct={() => setShowCreateProduct(true)}
            />
          )}

          {currentStep === "partner" && (
            <PartnerSelectionStep
              partnerTypes={["supplier", "vendor"]}
              selectedType={receivedFromType}
              selectedPartnerId={selectedPartnerId}
              selectedWarehouseId={selectedWarehouseId}
              currentWarehouseId={warehouse.id}
              onTypeChange={handlePartnerTypeChange}
              onSelectPartner={handleSelectPartner}
              onSelectWarehouse={handleSelectWarehouse}
              onAddNewPartner={() => setShowCreatePartner(true)}
              title="Received from"
              buttonLabel="New supplier"
            />
          )}

          {currentStep === "linkTo" && (
            <InwardLinkToStep
              warehouseId={warehouse.id}
              linkToData={linkToData}
              onLinkToChange={setLinkToData}
            />
          )}

          {currentStep === "details" && (
            <InwardDetailsStep
              formData={detailsFormData}
              onChange={(data) =>
                setDetailsFormData((prev) => ({ ...prev, ...data }))
              }
            />
          )}
        </div>

        {/* Bottom Action Bar - Fixed at bottom */}
        <div className="border-t border-gray-200 p-4 flex gap-3 bg-background">
          {currentStep !== "products" && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {currentStep === "products" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromProducts || saving}
              className="flex-1"
            >
              Continue
            </Button>
          )}
          {currentStep === "partner" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromPartner || saving}
              className="flex-1"
            >
              Continue
            </Button>
          )}
          {currentStep === "linkTo" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromLinkTo || saving}
              className="flex-1"
            >
              Continue
            </Button>
          )}
          {currentStep === "details" && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="flex-1"
            >
              {saving ? "Creating..." : "Create Inward"}
            </Button>
          )}
        </div>
      </div>

      {/* Sheets */}
      {showUnitEntrySheet && selectedProduct && (
        <StockUnitFormSheet
          open={showUnitEntrySheet}
          onOpenChange={setShowUnitEntrySheet}
          product={selectedProduct}
          onConfirm={handleAddUnit}
        />
      )}

      {showAllSpecsSheet && selectedProduct && (
        <AllSpecificationsSheet
          open={showAllSpecsSheet}
          onOpenChange={setShowAllSpecsSheet}
          product={selectedProduct}
          units={currentProductUnits}
          onIncrementUnit={handleIncrementUnit}
          onDecrementUnit={handleDecrementUnit}
          onUpdateUnitCount={handleUpdateUnitCount}
          onDeleteUnit={handleDeleteUnit}
          onAddNewUnit={handleAddNewUnitFromAllSpecs}
        />
      )}

      {showPieceQuantitySheet && selectedProduct && (
        <PieceQuantitySheet
          open={showPieceQuantitySheet}
          onOpenChange={setShowPieceQuantitySheet}
          product={selectedProduct}
          initialQuantity={
            currentProductUnits.length > 0
              ? currentProductUnits[0].quantity
              : undefined
          }
          onConfirm={handlePieceQuantityConfirm}
        />
      )}

      {showCreateProduct && (
        <ProductFormSheet
          open={showCreateProduct}
          onOpenChange={setShowCreateProduct}
        />
      )}

      {showCreatePartner && (
        <PartnerFormSheet
          open={showCreatePartner}
          onOpenChange={setShowCreatePartner}
          partnerType="supplier"
        />
      )}
    </div>
  );
}
