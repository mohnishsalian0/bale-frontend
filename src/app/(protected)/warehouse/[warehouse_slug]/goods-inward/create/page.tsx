"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProductSelectionStep, StockUnitSpec } from "../ProductSelectionStep";
import { StockUnitFormSheet } from "../StockUnitFormSheet";
import { AllSpecificationsSheet } from "../AllSpecificationsSheet";
import { PieceQuantitySheet } from "../PieceQuantitySheet";
import { PartnerSelectionStep } from "@/app/(protected)/warehouse/[warehouse_slug]/stock-flow/PartnerSelectionStep";
import { InwardLinkToStep, InwardLinkToData } from "../InwardLinkToStep";
import { InwardDetailsStep } from "../InwardDetailsStep";
import { ProductFormSheet } from "../../products/ProductFormSheet";
import { PartnerFormSheet } from "../../partners/PartnerFormSheet";
import { useStockFlowMutations } from "@/lib/query/hooks/stock-flow";
import type { TablesInsert } from "@/types/database/supabase";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { ProductListView } from "@/types/products.types";
import { StockUnitStatus } from "@/types/database/enums";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

interface DetailsFormData {
  inwardDate: string;
  expectedDeliveryDate: string;
  transportType: "road" | "rail" | "air" | "sea" | "courier" | null;
  transportReferenceNumber: string;
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

  // Track product units state locally
  const [productUnits, setProductUnits] = useState<
    Record<string, StockUnitSpec[]>
  >({});

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
    purchase_order_id: null,
    other_reason: null,
    job_work_id: null,
  });

  // Details form state
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
    inwardDate: dateToISOString(new Date()),
    expectedDeliveryDate: "",
    transportType: null,
    transportReferenceNumber: "",
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
    () => Object.values(productUnits).some((units) => units.length > 0),
    [productUnits],
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
        return !!linkToData.purchase_order_id?.trim();
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
      expected_delivery_date: detailsFormData.expectedDeliveryDate || undefined,
      transport_type: detailsFormData.transportType || undefined,
      transport_reference_number:
        detailsFormData.transportReferenceNumber || undefined,
      partner_id:
        receivedFromType === "partner"
          ? selectedPartnerId || undefined
          : undefined,
      from_warehouse_id:
        receivedFromType === "warehouse"
          ? selectedWarehouseId || undefined
          : undefined,
      sales_order_id: linkToData.sales_order_id || undefined,
      purchase_order_id: linkToData.purchase_order_id || undefined,
      other_reason: linkToData.other_reason || undefined,
      notes: detailsFormData.notes || undefined,
    };

    // Prepare stock units for all products (RPC handles piece vs non-piece)
    const stockUnits: Omit<
      TablesInsert<"stock_units">,
      "created_by" | "modified_by" | "sequence_number"
    >[] = [];

    for (const [productId, units] of Object.entries(productUnits)) {
      if (units.length === 0) continue;

      for (const unit of units) {
        // We don't have stock_type here, but the backend RPC will handle it
        // For now, just use unit.count as-is
        const unitCount = unit.count;
        const stockStatus: StockUnitStatus = "full";

        for (let i = 0; i < unitCount; i++) {
          stockUnits.push({
            warehouse_id: warehouse.id,
            product_id: productId,
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
    return productUnits[selectedProduct.id] || [];
  }, [selectedProduct, productUnits]);

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="New Goods Inward"
          currentStep={
            currentStep === "products"
              ? 1
              : currentStep === "partner"
                ? 2
                : currentStep === "linkTo"
                  ? 3
                  : 4
          }
          totalSteps={4}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Step Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "products" && (
            <ProductSelectionStep
              productUnits={productUnits}
              onOpenUnitSheet={handleOpenUnitSheet}
              onAddNewProduct={() => setShowCreateProduct(true)}
            />
          )}

          {currentStep === "partner" && (
            <PartnerSelectionStep
              partnerTypes={["supplier", "vendor", "customer"]} // Customer for sales return
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
              partnerId={selectedPartnerId}
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
        <FormFooter>
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
        </FormFooter>
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
