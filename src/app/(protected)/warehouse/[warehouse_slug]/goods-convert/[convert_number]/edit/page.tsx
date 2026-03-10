"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StockUnitScannerStep } from "@/components/layouts/stock-unit-scanner-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { OutputProductSelectionStep } from "@/components/layouts/output-product-selection-step";
import { JobWorkLinkToStep } from "../../JobWorkLinkToStep";
import { ConvertDetailsStep } from "../../ConvertDetailsStep";
import {
  useGoodsConvertBySequenceNumber,
  useGoodsConvertMutations,
} from "@/lib/query/hooks/goods-converts";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import type { ScannedStockUnit } from "@/types/stock-units.types";
import type {
  UpdateConvertData,
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

export default function EditGoodsConvertPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; convert_number: string }>;
}) {
  const { convert_number } = use(params);
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

  // Details form state
  const [detailsFormData, setDetailsFormData] =
    useState<ConvertDetailsFormData>({
      serviceType: "",
      startDate: dateToISOString(new Date()),
      referenceNumber: "",
      notes: "",
    });

  // Fetch existing convert
  const {
    data: convert,
    isLoading,
    error,
  } = useGoodsConvertBySequenceNumber(convert_number);

  // Mutations
  const { updateConvertWithItems } = useGoodsConvertMutations(warehouse.id);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Initialize form from fetched data and check edit restrictions
  useEffect(() => {
    if (!convert) return;

    // Check if convert can be edited - redirect if not
    if (convert.status !== "in_progress") {
      toast.error("Cannot edit convert - must be in progress status");
      router.push(
        `/warehouse/${warehouse.slug}/goods-convert/${convert_number}/details`,
      );
      return;
    }

    // Initialize selections
    setSelectedVendorId(convert.vendor_id);
    setSelectedJobWorkId(convert.job_work_id || null);
    setSelectedOutputProductId(convert.output_product_id);

    // Initialize scanned units from existing convert input items
    const initialScannedUnits: ScannedStockUnit[] =
      convert.input_items?.map((item) => ({
        stockUnit: {
          id: item.stock_unit.id,
          product_id: item.stock_unit.product_id,
          stock_number: item.stock_unit.stock_number,
          remaining_quantity: item.stock_unit.remaining_quantity,
          product: item.stock_unit.product,
        },
        quantity: item.quantity_consumed,
      })) || [];
    setScannedInputUnits(initialScannedUnits);

    // Initialize form data
    setDetailsFormData({
      serviceType: convert.service_type?.name || "",
      startDate: convert.start_date || dateToISOString(new Date()),
      referenceNumber: convert.reference_number || "",
      notes: convert.notes || "",
    });
  }, [convert, convert_number, router, warehouse.slug]);

  // Partner selection handler with auto-advance (disabled for edit)
  const handleSelectVendor = (vendorId: string, _ledgerId: string) => {
    // Vendor is locked in edit mode, but we still handle the callback
    setSelectedVendorId(vendorId);
  };

  // Job work selection handler with auto-advance
  const handleSelectJobWork = (jobWorkId: string, _outputProductId: string) => {
    setSelectedJobWorkId(jobWorkId);
    // Don't update output product - it's locked in edit mode
    setTimeout(() => {
      setCurrentStep("outputProduct");
    }, 300);
  };

  // Output product selection handler (disabled for edit)
  const handleSelectOutputProduct = (productId: string) => {
    // Output product is locked in edit mode
    setSelectedOutputProductId(productId);
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
      detailsFormData.serviceType,
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
    router.push(
      `/warehouse/${warehouse.slug}/goods-convert/${convert_number}/details`,
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedVendorId || !selectedOutputProductId || !convert)
      return;
    setSaving(true);

    try {
      // Prepare convert data
      const convertData: UpdateConvertData = {
        service_type: detailsFormData.serviceType,
        vendor_id: selectedVendorId,
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

      // Use mutation to update convert with items atomically
      await updateConvertWithItems.mutateAsync({
        convertId: convert.id,
        convertData,
        inputItems,
      });

      // Success! Show toast and redirect
      toast.success("Goods convert updated successfully");
      router.push(
        `/warehouse/${warehouse.slug}/goods-convert/${convert_number}/details`,
      );
    } catch (error) {
      console.error("Error updating goods convert:", error);
      toast.error("Failed to update goods convert");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading goods convert..." />;
  }

  // Error state
  if (error || !convert) {
    return (
      <ErrorState
        message="Failed to load goods convert"
        onRetry={() => window.location.reload()}
      />
    );
  }

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
          title={`Edit GC-${convert.sequence_number}`}
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
              disablePartnerChange={true} // Vendor is locked in edit mode
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
              disableProductChange={true} // Output product is locked in edit mode
            />
          )}

          {currentStep === "inputUnits" && (
            <StockUnitScannerStep
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
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
