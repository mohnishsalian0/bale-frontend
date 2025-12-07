"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { QRProductSelectionStep } from "../QRProductSelectionStep";
import { QRStockUnitSelectionStep } from "../QRStockUnitSelectionStep";
import {
  QRTemplateSelectionStep,
  getDefaultTemplateFields,
} from "../QRTemplateCustomisationStep";
import type { QRTemplateField } from "../QRTemplateCustomisationStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { generatePDFBlob, downloadPDF } from "@/lib/pdf/batch-pdf-generator";
import type { LabelData } from "@/lib/pdf/qr-label-generator";
import type { ProductListView } from "@/types/products.types";
import { useProducts, useProductAttributes } from "@/lib/query/hooks/products";
import { useQRBatchMutations } from "@/lib/query/hooks/qr-batches";
import { getQRBatchById } from "@/lib/queries/qr-batches";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

type FormStep = "products" | "stockUnits" | "template";

export default function CreateQRBatchPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("products");
  const [selectedProduct, setSelectedProduct] =
    useState<ProductListView | null>(null);
  const [selectedStockUnitIds, setSelectedStockUnitIds] = useState<string[]>(
    [],
  );
  const [selectedFields, setSelectedFields] = useState<QRTemplateField[]>(
    getDefaultTemplateFields(),
  );
  const [saving, setSaving] = useState(false);

  // Fetch data using TanStack Query
  const { data: products = [], isLoading: productsLoading } = useProducts({
    is_active: true,
  });
  const { data: attributeLists, isLoading: productAttributesLoading } =
    useProductAttributes();
  const { create: createBatch } = useQRBatchMutations(warehouse.id);

  const materials = attributeLists?.materials || [];
  const colors = attributeLists?.colors || [];
  const tags = attributeLists?.tags || [];

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  const handleProductSelect = (product: ProductListView) => {
    setSelectedProduct(product);
    setCurrentStep("stockUnits");
  };

  const handleNext = () => {
    if (currentStep === "stockUnits" && selectedStockUnitIds.length > 0) {
      setCurrentStep("template");
    }
  };

  const handleBack = () => {
    if (currentStep === "template") {
      setCurrentStep("stockUnits");
    } else if (currentStep === "stockUnits") {
      setCurrentStep("products");
      setSelectedProduct(null);
      setSelectedStockUnitIds([]);
    } else {
      router.push(`/warehouse/${warehouse.slug}/qr-codes`);
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/qr-codes`);
  };

  const handleSubmit = async () => {
    if (!selectedProduct || selectedStockUnitIds.length === 0) {
      toast.error("Please select at least one stock unit");
      return;
    }

    setSaving(true);
    try {
      // Generate batch name
      const batchName = `${selectedProduct.name} QRs - ${new Date().toLocaleDateString()}`;

      // Prepare batch data
      const batchData = {
        warehouse_id: warehouse.id,
        batch_name: batchName,
        image_url: null,
        fields_selected: selectedFields,
        pdf_url: null,
      };

      console.log(JSON.stringify(batchData));
      console.log(selectedStockUnitIds);

      // Create batch using mutation hook
      const batchId = await createBatch.mutateAsync({
        batchData,
        stockUnitIds: selectedStockUnitIds,
      });

      // Fetch full batch details with transformed product data
      const batch = await getQRBatchById(batchId);
      if (!batch) {
        throw new Error("Failed to fetch batch details");
      }

      const supabase = createClient();

      // Fetch company logo
      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("logo_url")
        .single<{ logo_url: string }>();

      if (companyError) throw companyError;

      // Map batch items to LabelData format
      const stockUnits: LabelData[] = batch.qr_batch_items.map((item) => {
        const unit = item.stock_unit!;
        const product = unit.product!;

        return {
          id: unit.id,
          sequence_number: unit.sequence_number,
          manufacturing_date: unit.manufacturing_date,
          initial_quantity: unit.initial_quantity,
          quality_grade: unit.quality_grade,
          warehouse_location: unit.warehouse_location,
          product: {
            name: product.name,
            sequence_number: product.sequence_number,
            hsn_code: product.hsn_code,
            stock_type: product.stock_type,
            gsm: product.gsm,
            selling_price_per_unit: product.selling_price_per_unit,
            // Product data already transformed with materials/colors arrays
            measuring_unit: product.measuring_unit,
            materials: product.materials || [],
            colors: product.colors || [],
          },
        };
      });

      // Generate and download PDF
      const blob = await generatePDFBlob(
        stockUnits,
        selectedFields,
        companyData?.logo_url || null,
      );
      downloadPDF(blob, `${batchName}.pdf`);

      toast.success(
        `QR batch created with ${selectedStockUnitIds.length} units`,
      );
      router.push(`/warehouse/${warehouse.slug}/qr-codes`);
    } catch (error) {
      console.error("Error creating QR batch:", error);
      toast.error("Failed to create QR batch");
    } finally {
      setSaving(false);
    }
  };

  const canProceedToTemplate = selectedStockUnitIds.length > 0;

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="Create QR Codes"
          currentStep={
            currentStep === "products"
              ? 1
              : currentStep === "stockUnits"
                ? 2
                : 3
          }
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {currentStep === "products" && (
            <QRProductSelectionStep
              products={products}
              materials={materials}
              colors={colors}
              tags={tags}
              loading={productsLoading || productAttributesLoading}
              onProductSelect={handleProductSelect}
            />
          )}

          {currentStep === "stockUnits" && selectedProduct && (
            <QRStockUnitSelectionStep
              productId={selectedProduct.id}
              selectedStockUnitIds={selectedStockUnitIds}
              onSelectionChange={setSelectedStockUnitIds}
            />
          )}

          {currentStep === "template" && (
            <QRTemplateSelectionStep
              selectedFields={selectedFields}
              onSelectionChange={setSelectedFields}
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
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
            </>
          ) : currentStep === "stockUnits" ? (
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
                onClick={handleNext}
                disabled={!canProceedToTemplate || saving}
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
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Creating..." : "Confirm"}
              </Button>
            </>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
