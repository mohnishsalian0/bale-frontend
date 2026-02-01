"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  StockUnitScannerStep,
  ScannedStockUnit,
} from "@/components/layouts/stock-unit-scanner-step";
import { WarehouseSelectionStep } from "./WarehouseSelectionStep";
import { TransferDetailsStep } from "./TransferDetailsStep";
import { useGoodsTransferMutations } from "@/lib/query/hooks/goods-transfers";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import type { TransportType } from "@/types/database/enums";

interface DetailsFormData {
  transferDate: string;
  expectedDeliveryDate: string;
  transportType: TransportType | null;
  transportReferenceNumber: string;
  notes: string;
}

type FormStep = "warehouse" | "scanner" | "details";

export default function CreateGoodsTransferPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();

  const [currentStep, setCurrentStep] = useState<FormStep>("warehouse");
  const [scannedUnits, setScannedUnits] = useState<ScannedStockUnit[]>([]);
  const [saving, setSaving] = useState(false);

  // Warehouse selection state (source is auto-selected from session)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(
    null,
  );

  // Details form state
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
    transferDate: dateToISOString(new Date()),
    expectedDeliveryDate: "",
    transportType: null,
    transportReferenceNumber: "",
    notes: "",
  });

  // Mutations
  const { createTransferWithItems } = useGoodsTransferMutations(warehouse.id);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Warehouse selection handler with auto-advance
  const handleSelectWarehouse = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("scanner");
    }, 300);
  };

  // Validation for each step
  const canProceedFromWarehouse = useMemo(
    () => selectedWarehouseId !== null,
    [selectedWarehouseId],
  );

  const canProceedFromScanner = useMemo(
    () => scannedUnits.length > 0,
    [scannedUnits],
  );

  const canSubmit = useMemo(
    () =>
      canProceedFromWarehouse &&
      canProceedFromScanner &&
      detailsFormData.transferDate !== "",
    [
      canProceedFromWarehouse,
      canProceedFromScanner,
      detailsFormData.transferDate,
    ],
  );

  const handleNext = () => {
    if (currentStep === "warehouse" && canProceedFromWarehouse) {
      setCurrentStep("scanner");
    } else if (currentStep === "scanner" && canProceedFromScanner) {
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("scanner");
    } else if (currentStep === "scanner") {
      setCurrentStep("warehouse");
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/goods-transfer`);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedWarehouseId) return;
    setSaving(true);

    try {
      // Prepare transfer data
      const transferData = {
        from_warehouse_id: warehouse.id,
        to_warehouse_id: selectedWarehouseId,
        transfer_date: detailsFormData.transferDate || undefined,
        expected_delivery_date:
          detailsFormData.expectedDeliveryDate || undefined,
        transport_type: detailsFormData.transportType || undefined,
        transport_reference_number:
          detailsFormData.transportReferenceNumber || undefined,
        notes: detailsFormData.notes || undefined,
      };

      // Prepare stock unit IDs (full quantity transfers)
      const stockUnitIds = scannedUnits.map((item) => item.stockUnit.id);

      // Use mutation to create transfer with items atomically
      await createTransferWithItems.mutateAsync({
        transferData,
        stockUnitIds,
      });

      // Success! Show toast and redirect to stock flow
      toast.success("Goods transfer created successfully");
      router.push(`/warehouse/${warehouse.slug}/stock-flow`);
    } catch (error) {
      console.error("Error creating goods transfer:", error);
      toast.error("Failed to create goods transfer");
    } finally {
      setSaving(false);
    }
  };

  // Calculate step number
  const stepNumber =
    currentStep === "warehouse" ? 1 : currentStep === "scanner" ? 2 : 3;

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="New Goods Transfer"
          currentStep={stepNumber}
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Step Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "warehouse" && (
            <WarehouseSelectionStep
              sourceWarehouseId={warehouse.id}
              selectedWarehouseId={selectedWarehouseId}
              onSelectWarehouse={handleSelectWarehouse}
            />
          )}

          {currentStep === "scanner" && (
            <StockUnitScannerStep
              scannedUnits={scannedUnits}
              onScannedUnitsChange={setScannedUnits}
              warehouseId={warehouse.id}
              orderProducts={{}} // No order products for transfers
              fullQuantity={true} // Always transfer full quantity
            />
          )}

          {currentStep === "details" && (
            <TransferDetailsStep
              formData={detailsFormData}
              onChange={(updates) =>
                setDetailsFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
        </div>

        {/* Bottom Action Bar - Fixed at bottom */}
        <FormFooter>
          {currentStep !== "warehouse" && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {currentStep === "warehouse" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromWarehouse || saving}
              className="flex-1"
            >
              Continue
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
          {currentStep === "details" && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || saving}
              className="flex-1"
            >
              {saving ? "Creating..." : "Create Transfer"}
            </Button>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
