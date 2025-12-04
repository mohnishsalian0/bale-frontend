"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconArrowLeft } from "@tabler/icons-react";
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

type FormStep = "product" | "stock-units" | "template";

export default function CreateQRBatchPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("product");
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
    setCurrentStep("stock-units");
  };

  const handleNext = () => {
    if (currentStep === "stock-units" && selectedStockUnitIds.length > 0) {
      setCurrentStep("template");
    }
  };

  const handleBack = () => {
    if (currentStep === "template") {
      setCurrentStep("stock-units");
    } else if (currentStep === "stock-units") {
      setCurrentStep("product");
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
                Create QR codes
              </h1>
              <p className="text-sm text-gray-500">
                Step{" "}
                {currentStep === "product"
                  ? "1"
                  : currentStep === "stock-units"
                    ? "2"
                    : "3"}{" "}
                of 3
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-primary-500 transition-all duration-300"
              style={{
                width:
                  currentStep === "product"
                    ? "33%"
                    : currentStep === "stock-units"
                      ? "66%"
                      : "100%",
              }}
            />
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {currentStep === "product" && (
            <QRProductSelectionStep
              products={products}
              materials={materials}
              colors={colors}
              tags={tags}
              loading={productsLoading || productAttributesLoading}
              onProductSelect={handleProductSelect}
            />
          )}

          {currentStep === "stock-units" && selectedProduct && (
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
        <div className="shrink-0 border-t border-gray-200 bg-background p-4 flex">
          <div className="w-full flex gap-3">
            {currentStep === "product" ? (
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
            ) : currentStep === "stock-units" ? (
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
          </div>
        </div>
      </div>
    </div>
  );
}
