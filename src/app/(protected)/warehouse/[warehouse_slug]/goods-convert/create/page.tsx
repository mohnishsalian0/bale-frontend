"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StockUnitScannerStep } from "@/components/layouts/stock-unit-scanner-step";
import { ScannedStockUnit } from "@/types/stock-units.types";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { OutputProductSelectionStep } from "@/components/layouts/output-product-selection-step";
import { JobWorkLinkToStep } from "../JobWorkLinkToStep";
import { ConvertDetailsStep } from "../ConvertDetailsStep";
import { PartnerFormSheet } from "../../partners/PartnerFormSheet";
import { useGoodsConvertMutations } from "@/lib/query/hooks/goods-converts";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import type {
  CreateConvertData,
  CreateConvertInputItem,
} from "@/types/goods-converts.types";

interface ConvertDetailsFormData {
  serviceType: string;
  startDate: string;
  referenceNumber: string;
  notes: string;
}

type FormStep =
  | "vendor"
  | "jobWork"
  | "outputProduct"
  | "inputUnits"
  | "details";

export default function CreateGoodsConvertPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();

  // State
  const [currentStep, setCurrentStep] = useState<FormStep>("vendor");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [selectedJobWorkId, setSelectedJobWorkId] = useState<string | null>(
    null,
  );
  const [selectedOutputProductId, setSelectedOutputProductId] = useState<
    string | null
  >(null);
  const [scannedInputUnits, setScannedInputUnits] = useState<
    ScannedStockUnit[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [showCreatePartner, setShowCreatePartner] = useState(false);

  // Details form state
  const [detailsFormData, setDetailsFormData] =
    useState<ConvertDetailsFormData>({
      serviceType: "",
      startDate: dateToISOString(new Date()),
      referenceNumber: "",
      notes: "",
    });

  // Mutations
  const { createConvertWithItems } = useGoodsConvertMutations(warehouse.id);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Partner selection handler with auto-advance
  const handleSelectVendor = (vendorId: string, _ledgerId: string) => {
    setSelectedVendorId(vendorId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("jobWork");
    }, 300);
  };

  // Job work selection handler with auto-advance
  const handleSelectJobWork = (jobWorkId: string, outputProductId: string) => {
    setSelectedJobWorkId(jobWorkId);
    setSelectedOutputProductId(outputProductId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("outputProduct");
    }, 300);
  };

  // Output product selection handler with auto-advance
  const handleSelectOutputProduct = (productId: string) => {
    setSelectedOutputProductId(productId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("inputUnits");
    }, 300);
  };

  // Validation for each step
  const canProceedFromVendor = useMemo(
    () => selectedVendorId !== null,
    [selectedVendorId],
  );

  const canProceedFromJobWork = useMemo(
    () => true, // Job work selection is optional
    [],
  );

  const canProceedFromOutputProduct = useMemo(
    () => selectedOutputProductId !== null,
    [selectedOutputProductId],
  );

  const canProceedFromInputUnits = useMemo(
    () => scannedInputUnits.length > 0,
    [scannedInputUnits],
  );

  const canSubmit = useMemo(
    () =>
      canProceedFromVendor &&
      canProceedFromOutputProduct &&
      canProceedFromInputUnits &&
      detailsFormData.serviceType.trim() !== "",
    [
      canProceedFromVendor,
      canProceedFromOutputProduct,
      canProceedFromInputUnits,
      detailsFormData.serviceType,
    ],
  );

  const handleNext = () => {
    if (currentStep === "vendor" && canProceedFromVendor) {
      setCurrentStep("jobWork");
    } else if (currentStep === "jobWork" && canProceedFromJobWork) {
      setCurrentStep("outputProduct");
    } else if (currentStep === "outputProduct" && canProceedFromOutputProduct) {
      setCurrentStep("inputUnits");
    } else if (currentStep === "inputUnits" && canProceedFromInputUnits) {
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("inputUnits");
    } else if (currentStep === "inputUnits") {
      setCurrentStep("outputProduct");
    } else if (currentStep === "outputProduct") {
      setCurrentStep("jobWork");
    } else if (currentStep === "jobWork") {
      setCurrentStep("vendor");
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/goods-convert`);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedVendorId || !selectedOutputProductId) return;
    setSaving(true);

    try {
      // Prepare convert data
      const convertData: CreateConvertData = {
        warehouse_id: warehouse.id,
        service_type: detailsFormData.serviceType,
        output_product_id: selectedOutputProductId,
        vendor_id: selectedVendorId,
        job_work_id: selectedJobWorkId || undefined,
        reference_number: detailsFormData.referenceNumber || undefined,
        start_date: detailsFormData.startDate,
        notes: detailsFormData.notes || undefined,
      };

      // Prepare input stock unit items
      const inputItems: CreateConvertInputItem[] = scannedInputUnits.map(
        (item) => ({
          stock_unit_id: item.stockUnit.id,
          quantity_consumed: item.quantity,
        }),
      );

      // Use mutation to create convert with items atomically
      await createConvertWithItems.mutateAsync({
        convertData,
        inputItems,
      });

      // Success! Show toast and redirect
      toast.success("Goods convert created successfully");
      router.push(`/warehouse/${warehouse.slug}/goods-convert`);
    } catch (error) {
      console.error("Error creating goods convert:", error);
      toast.error("Failed to create goods convert");
    } finally {
      setSaving(false);
    }
  };

  // Calculate step number
  const stepNumber =
    currentStep === "vendor"
      ? 1
      : currentStep === "jobWork"
        ? 2
        : currentStep === "outputProduct"
          ? 3
          : currentStep === "inputUnits"
            ? 4
            : 5;

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="New Goods Convert"
          currentStep={stepNumber}
          totalSteps={5}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Step Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "vendor" && (
            <PartnerSelectionStep
              partnerType="vendor"
              selectedPartnerId={selectedVendorId}
              onSelectPartner={handleSelectVendor}
            />
          )}

          {currentStep === "jobWork" && (
            <JobWorkLinkToStep
              selectedJobWorkId={selectedJobWorkId}
              onSelectJobWork={handleSelectJobWork}
            />
          )}

          {currentStep === "outputProduct" && (
            <OutputProductSelectionStep
              selectedProductId={selectedOutputProductId}
              onSelectProduct={handleSelectOutputProduct}
            />
          )}

          {currentStep === "inputUnits" && (
            <StockUnitScannerStep
              fullQuantity
              scannedUnits={scannedInputUnits}
              onScannedUnitsChange={setScannedInputUnits}
              warehouseId={warehouse.id}
            />
          )}

          {currentStep === "details" && (
            <ConvertDetailsStep
              formData={detailsFormData}
              onChange={(updates) =>
                setDetailsFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
        </div>

        {/* Bottom Action Bar - Fixed at bottom */}
        <FormFooter>
          {currentStep !== "vendor" && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {currentStep === "vendor" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromVendor || saving}
              className="flex-1"
            >
              Continue
            </Button>
          )}
          {currentStep === "jobWork" && (
            <Button onClick={handleNext} disabled={saving} className="flex-1">
              {selectedJobWorkId ? "Continue" : "Skip"}
            </Button>
          )}
          {currentStep === "outputProduct" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromOutputProduct || saving}
              className="flex-1"
            >
              Continue
            </Button>
          )}
          {currentStep === "inputUnits" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromInputUnits || saving}
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
              {saving ? "Creating..." : "Create Convert"}
            </Button>
          )}
        </FormFooter>
      </div>

      {/* Partner Form Sheet */}
      {showCreatePartner && (
        <PartnerFormSheet
          open={showCreatePartner}
          onOpenChange={setShowCreatePartner}
          partnerType="vendor"
        />
      )}
    </div>
  );
}
