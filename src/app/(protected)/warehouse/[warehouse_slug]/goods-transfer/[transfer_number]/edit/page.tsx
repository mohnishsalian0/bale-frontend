"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  StockUnitScannerStep,
  ScannedStockUnit,
} from "@/components/layouts/stock-unit-scanner-step";
import { WarehouseSelectionStep } from "../../create/WarehouseSelectionStep";
import { TransferDetailsStep } from "../../create/TransferDetailsStep";
import {
  useGoodsTransferBySequenceNumber,
  useGoodsTransferMutations,
} from "@/lib/query/hooks/goods-transfers";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import type { TransportType } from "@/types/database/enums";

interface DetailsFormData {
  transferDate: string;
  expectedDeliveryDate: string;
  transportType: TransportType | null;
  transportReferenceNumber: string;
  notes: string;
}

type FormStep = "warehouse" | "scanner" | "details";

export default function EditGoodsTransferPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; transfer_number: string }>;
}) {
  const { transfer_number } = use(params);
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

  // Fetch existing transfer
  const {
    data: transfer,
    isLoading,
    error,
  } = useGoodsTransferBySequenceNumber(transfer_number);

  // Mutations
  const { updateTransferWithItems } = useGoodsTransferMutations(warehouse.id);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Initialize form from fetched data and check edit restrictions
  useEffect(() => {
    if (!transfer) return;

    // Check if transfer can be edited - redirect if not
    if (transfer.status !== "in_transit") {
      toast.error("Cannot edit transfer - must be in transit status");
      router.push(
        `/warehouse/${warehouse.slug}/goods-transfer/${transfer_number}`,
      );
      return;
    }

    // Initialize warehouse selection
    setSelectedWarehouseId(transfer.to_warehouse_id);

    // Initialize scanned units from existing transfer items
    const initialScannedUnits: ScannedStockUnit[] =
      transfer.goods_transfer_items.map((item) => ({
        stockUnit: {
          id: item.stock_unit.id,
          product_id: item.stock_unit.product_id,
          remaining_quantity: item.stock_unit.remaining_quantity,
          initial_quantity: item.stock_unit.initial_quantity,
          lot_number: item.stock_unit.lot_number,
          stock_number: item.stock_unit.stock_number,
          product: item.stock_unit.product,
        },
        quantity: item.quantity_transferred,
      }));
    setScannedUnits(initialScannedUnits);

    // Initialize form data
    setDetailsFormData({
      transferDate: transfer.transfer_date || dateToISOString(new Date()),
      expectedDeliveryDate: transfer.expected_delivery_date || "",
      transportType: (transfer.transport_type as TransportType) || null,
      transportReferenceNumber: transfer.transport_reference_number || "",
      notes: transfer.notes || "",
    });
  }, [transfer, transfer_number, router, warehouse.slug]);

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
    router.push(
      `/warehouse/${warehouse.slug}/goods-transfer/${transfer_number}`,
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedWarehouseId || !transfer) return;
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

      // Use mutation to update transfer with items atomically
      await updateTransferWithItems.mutateAsync({
        transferId: transfer.id,
        transferData,
        stockUnitIds,
      });

      // Success! Show toast and redirect
      toast.success("Goods transfer updated successfully");
      router.push(
        `/warehouse/${warehouse.slug}/goods-transfer/${transfer_number}`,
      );
    } catch (error) {
      console.error("Error updating goods transfer:", error);
      toast.error("Failed to update goods transfer");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading goods transfer..." />;
  }

  // Error state
  if (error || !transfer) {
    return (
      <ErrorState
        message="Failed to load goods transfer"
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Calculate step number
  const stepNumber =
    currentStep === "warehouse" ? 1 : currentStep === "scanner" ? 2 : 3;

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={`Edit Transfer GT-${transfer.sequence_number}`}
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
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
