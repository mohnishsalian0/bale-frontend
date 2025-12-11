"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { QRScannerStep, ScannedStockUnit } from "../QRScannerStep";
import { PartnerSelectionStep } from "@/app/(protected)/warehouse/[warehouse_slug]/stock-flow/PartnerSelectionStep";
import { OutwardLinkToStep, OutwardLinkToData } from "../OutwardLinkToStep";
import { OutwardDetailsStep } from "../OutwardDetailsStep";
import { PartnerFormSheet } from "../../partners/PartnerFormSheet";
import { useStockFlowMutations } from "@/lib/query/hooks/stock-flow";
import type { TablesInsert } from "@/types/database/supabase";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

interface DetailsFormData {
  outwardDate: string;
  dueDate: string;
  invoiceNumber: string;
  transportDetails: string;
  notes: string;
  documentFile: File | null;
}

type FormStep = "scanner" | "partner" | "linkTo" | "details";

export default function CreateGoodsOutwardPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("scanner");
  const [scannedUnits, setScannedUnits] = useState<ScannedStockUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreatePartner, setShowCreatePartner] = useState(false);

  // Mutations
  const { createOutwardWithItems } = useStockFlowMutations(warehouse.id);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Partner/Warehouse selection state
  const [dispatchToType, setDispatchToType] = useState<"partner" | "warehouse">(
    "partner",
  );
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    null,
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(
    null,
  );

  // Link to state
  const [linkToData, setLinkToData] = useState<OutwardLinkToData>({
    linkToType: "sales_order",
    sales_order_id: null,
    purchase_order_id: null,
    other_reason: null,
    job_work_id: null,
  });

  // Details form state
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
    outwardDate: dateToISOString(new Date()),
    dueDate: "",
    invoiceNumber: "",
    transportDetails: "",
    notes: "",
    documentFile: null,
  });

  // Partner selection handlers with auto-advance
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
    setDispatchToType(type);
    setSelectedPartnerId(null);
    setSelectedWarehouseId(null);
  };

  // Validation for each step
  const canProceedFromScanner = useMemo(
    () => scannedUnits.length > 0,
    [scannedUnits],
  );

  const canProceedFromPartner = useMemo(
    () =>
      (dispatchToType === "partner" && selectedPartnerId !== null) ||
      (dispatchToType === "warehouse" && selectedWarehouseId !== null),
    [dispatchToType, selectedPartnerId, selectedWarehouseId],
  );

  const canProceedFromLinkTo = useMemo(() => {
    switch (linkToData.linkToType) {
      case "sales_order":
        return !!linkToData.sales_order_id;
      case "purchase_return":
        return !!linkToData.purchase_order_id?.trim();
      case "other":
        return !!linkToData.other_reason?.trim();
      default:
        return false;
    }
  }, [linkToData]);

  const canSubmit = useMemo(
    () =>
      canProceedFromScanner && canProceedFromPartner && canProceedFromLinkTo,
    [canProceedFromScanner, canProceedFromPartner, canProceedFromLinkTo],
  );

  const handleNext = () => {
    if (currentStep === "scanner" && canProceedFromScanner) {
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
      setCurrentStep("scanner");
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/stock-flow`);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);

    try {
      // Prepare outward data - direct field mapping with aligned enums
      const outwardData: Omit<
        TablesInsert<"goods_outwards">,
        "created_by" | "sequence_number"
      > = {
        warehouse_id: warehouse.id,
        outward_type: linkToData.linkToType as
          | "sales_order"
          | "purchase_return"
          | "other",
        outward_date: detailsFormData.outwardDate || undefined,
        expected_delivery_date: detailsFormData.dueDate || undefined,
        transport_reference_number: detailsFormData.invoiceNumber || undefined,
        transport_details: detailsFormData.transportDetails || undefined,
        notes: detailsFormData.notes || undefined,
        partner_id:
          dispatchToType === "partner"
            ? selectedPartnerId || undefined
            : undefined,
        to_warehouse_id:
          dispatchToType === "warehouse"
            ? selectedWarehouseId || undefined
            : undefined,
        sales_order_id: linkToData.sales_order_id || undefined,
        purchase_order_id: linkToData.purchase_order_id || undefined,
        other_reason: linkToData.other_reason || undefined,
      };

      // Prepare stock unit items from scannedUnits
      const stockUnitItems = scannedUnits.map((item) => ({
        stock_unit_id: item.stockUnit.id,
        quantity: item.quantity,
      }));

      // Use mutation to create outward with items atomically
      await createOutwardWithItems.mutateAsync({
        outwardData,
        stockUnitItems,
      });

      // Success! Show toast and redirect to stock flow
      toast.success("Goods outward created successfully");
      router.push(`/warehouse/${warehouse.slug}/stock-flow`);
    } catch (error) {
      console.error("Error creating goods outward:", error);
      toast.error("Failed to create goods outward");
    } finally {
      setSaving(false);
    }
  };

  // Calculate step number
  const stepNumber =
    currentStep === "scanner"
      ? 1
      : currentStep === "partner"
        ? 2
        : currentStep === "linkTo"
          ? 3
          : 4;

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="New Goods Outward"
          currentStep={stepNumber}
          totalSteps={4}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Step Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "scanner" && (
            <QRScannerStep
              scannedUnits={scannedUnits}
              onScannedUnitsChange={setScannedUnits}
            />
          )}

          {currentStep === "partner" && (
            <PartnerSelectionStep
              partnerTypes={["supplier", "vendor", "customer"]} // Supplier and vendor for purchase return
              selectedType={dispatchToType}
              selectedPartnerId={selectedPartnerId}
              selectedWarehouseId={selectedWarehouseId}
              currentWarehouseId={warehouse.id}
              onTypeChange={handlePartnerTypeChange}
              onSelectPartner={handleSelectPartner}
              onSelectWarehouse={handleSelectWarehouse}
              onAddNewPartner={() => setShowCreatePartner(true)}
              title="Dispatch to"
              buttonLabel="New customer"
            />
          )}

          {currentStep === "linkTo" && (
            <OutwardLinkToStep
              warehouseId={warehouse.id}
              selectedPartnerId={selectedPartnerId}
              linkToData={linkToData}
              onLinkToChange={setLinkToData}
            />
          )}

          {currentStep === "details" && (
            <OutwardDetailsStep
              formData={detailsFormData}
              onChange={(updates) =>
                setDetailsFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
        </div>

        {/* Bottom Action Bar - Fixed at bottom */}
        <FormFooter>
          {currentStep !== "scanner" && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {currentStep === "scanner" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromScanner || saving}
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
              {saving ? "Creating..." : "Create Outward"}
            </Button>
          )}
        </FormFooter>
      </div>

      {/* Partner Form Sheet */}
      {showCreatePartner && (
        <PartnerFormSheet
          open={showCreatePartner}
          onOpenChange={setShowCreatePartner}
          partnerType="customer"
        />
      )}
    </div>
  );
}
