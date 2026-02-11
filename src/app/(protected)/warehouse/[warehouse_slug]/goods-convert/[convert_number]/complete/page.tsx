"use client";

import { use, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StockUnitFormSheet } from "@/components/layouts/stock-unit-form-sheet";
import type { StockUnitSpec } from "../../../goods-inward/ProductSelectionStep";
import { OutputStockUnitCreationStep } from "../../OutputStockUnitCreationStep";
import { CompletionDetailsStep } from "../../CompletionDetailsStep";
import { useGoodsConvertMutations } from "@/lib/query/hooks/goods-converts";
import { useGoodsConvertBySequenceNumber } from "@/lib/query/hooks/goods-converts";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import type { CreateConvertOutputUnit } from "@/types/goods-converts.types";

interface CompletionDetailsFormData {
  completionDate: string;
}

type CompleteStep = "outputUnits" | "details";

export default function CompleteGoodsConvertPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; convert_number: string }>;
}) {
  const { convert_number } = use(params);
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();

  // Fetch convert data
  const { data: convert, isLoading } =
    useGoodsConvertBySequenceNumber(convert_number);

  // State
  const [currentStep, setCurrentStep] = useState<CompleteStep>("outputUnits");
  const [outputUnits, setOutputUnits] = useState<StockUnitSpec[]>([]);
  const [showUnitFormSheet, setShowUnitFormSheet] = useState(false);
  const [editingUnit, setEditingUnit] = useState<StockUnitSpec | null>(null);
  const [saving, setSaving] = useState(false);

  // Details form state
  const [completionFormData, setCompletionFormData] =
    useState<CompletionDetailsFormData>({
      completionDate: dateToISOString(new Date()),
    });

  // Mutations
  const { completeConvert } = useGoodsConvertMutations(warehouse.id);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Auto-open unit form sheet on first land
  useEffect(() => {
    if (!isLoading && convert && outputUnits.length === 0) {
      setShowUnitFormSheet(true);
    }
  }, [isLoading, convert, outputUnits.length]);

  // Stock unit management handlers
  const handleAddUnit = () => {
    setEditingUnit(null);
    setShowUnitFormSheet(true);
  };

  const handleConfirmUnit = (unitData: Omit<StockUnitSpec, "id">) => {
    if (editingUnit) {
      // Update existing unit
      setOutputUnits((prev) =>
        prev.map((u) =>
          u.id === editingUnit.id ? { ...unitData, id: editingUnit.id } : u,
        ),
      );
    } else {
      // Add new unit
      const newUnit: StockUnitSpec = {
        ...unitData,
        id: `temp-${Date.now()}-${Math.random()}`,
      };
      setOutputUnits((prev) => [...prev, newUnit]);
    }
  };

  const handleIncrementUnit = (unitId: string) => {
    setOutputUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, count: u.count + 1 } : u)),
    );
  };

  const handleDecrementUnit = (unitId: string) => {
    setOutputUnits((prev) =>
      prev.map((u) =>
        u.id === unitId && u.count > 1 ? { ...u, count: u.count - 1 } : u,
      ),
    );
  };

  const handleUpdateUnitCount = (unitId: string, count: number) => {
    setOutputUnits((prev) =>
      prev.map((u) => (u.id === unitId ? { ...u, count } : u)),
    );
  };

  const handleDeleteUnit = (unitId: string) => {
    setOutputUnits((prev) => prev.filter((u) => u.id !== unitId));
  };

  const handleEditUnit = (unitId: string) => {
    const unit = outputUnits.find((u) => u.id === unitId);
    if (unit) {
      setEditingUnit(unit);
      setShowUnitFormSheet(true);
    }
  };

  // Validation
  const canProceedFromOutputUnits = useMemo(
    () => outputUnits.length > 0,
    [outputUnits],
  );

  const canSubmit = useMemo(
    () => canProceedFromOutputUnits && completionFormData.completionDate,
    [canProceedFromOutputUnits, completionFormData.completionDate],
  );

  const handleNext = () => {
    if (currentStep === "outputUnits" && canProceedFromOutputUnits) {
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("outputUnits");
    }
  };

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse.slug}/goods-convert/${convert_number}/details`,
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || !convert) return;
    setSaving(true);

    try {
      // Flatten units by expanding count
      const outputStockUnits: CreateConvertOutputUnit[] = [];

      for (const unit of outputUnits) {
        for (let i = 0; i < unit.count; i++) {
          outputStockUnits.push({
            initial_quantity: unit.quantity,
            quality_grade: unit.grade || undefined,
            stock_number: unit.stock_number || undefined,
            lot_number: unit.lot_number || undefined,
            warehouse_location: unit.location || undefined,
            manufacturing_date: unit.manufactured_on
              ? dateToISOString(unit.manufactured_on)
              : undefined,
            notes: unit.notes || undefined,
            wastage_quantity: unit.wastage_quantity || undefined,
            wastage_reason: unit.wastage_reason || undefined,
          });
        }
      }

      // Use mutation to complete convert
      await completeConvert.mutateAsync({
        convertId: convert.id,
        completionDate: completionFormData.completionDate,
        outputUnits: outputStockUnits,
      });

      // Success! Show toast and redirect
      toast.success("Goods convert completed successfully");
      router.push(
        `/warehouse/${warehouse.slug}/goods-convert/${convert_number}/details`,
      );
    } catch (error) {
      console.error("Error completing goods convert:", error);
      toast.error("Failed to complete goods convert");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading convert details...</p>
      </div>
    );
  }

  if (!convert) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Convert not found</p>
      </div>
    );
  }

  // Calculate step number
  const stepNumber = currentStep === "outputUnits" ? 1 : 2;

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={`Complete GC-${convert.sequence_number}`}
          currentStep={stepNumber}
          totalSteps={2}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Step Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "outputUnits" && (
            <OutputStockUnitCreationStep
              outputProduct={convert.output_product}
              outputUnits={outputUnits}
              onIncrementUnit={handleIncrementUnit}
              onDecrementUnit={handleDecrementUnit}
              onUpdateUnitCount={handleUpdateUnitCount}
              onDeleteUnit={handleDeleteUnit}
              onAddNewUnit={handleAddUnit}
              onEditUnit={handleEditUnit}
            />
          )}

          {currentStep === "details" && (
            <CompletionDetailsStep
              formData={completionFormData}
              onChange={(updates) =>
                setCompletionFormData((prev) => ({ ...prev, ...updates }))
              }
            />
          )}
        </div>

        {/* Bottom Action Bar - Fixed at bottom */}
        <FormFooter>
          {currentStep === "outputUnits" && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          {currentStep !== "outputUnits" && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {currentStep === "outputUnits" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromOutputUnits || saving}
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
              {saving ? "Completing..." : "Complete Convert"}
            </Button>
          )}
        </FormFooter>
      </div>

      {/* Stock Unit Form Sheet */}
      {convert.output_product && (
        <StockUnitFormSheet
          open={showUnitFormSheet}
          onOpenChange={setShowUnitFormSheet}
          product={convert.output_product}
          initialUnit={editingUnit || undefined}
          onConfirm={handleConfirmUnit}
          enableWastage={true}
        />
      )}
    </div>
  );
}
