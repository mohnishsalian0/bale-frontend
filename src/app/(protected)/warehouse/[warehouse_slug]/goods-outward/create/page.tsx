"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  StockUnitScannerStep,
  ScannedStockUnit,
} from "@/components/layouts/stock-unit-scanner-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import { OutwardLinkToStep, OutwardLinkToData } from "../OutwardLinkToStep";
import { OutwardDetailsStep } from "../OutwardDetailsStep";
import { PartnerFormSheet } from "../../partners/PartnerFormSheet";
import { useStockFlowMutations } from "@/lib/query/hooks/stock-flow";
import { useSalesOrderById } from "@/lib/query/hooks/sales-orders";
import { usePurchaseOrderById } from "@/lib/query/hooks/purchase-orders";
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
  transportType: "road" | "rail" | "air" | "sea" | "courier" | null;
  transportReferenceNumber: string;
  notes: string;
  documentFile: File | null;
}

type FormStep = "partner" | "linkTo" | "scanner" | "details";

export default function CreateGoodsOutwardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();

  // Read URL params for sales order prefill
  const salesOrderId = searchParams.get("sales_order");

  // Skip partner and linkTo steps if coming from sales order
  const [currentStep, setCurrentStep] = useState<FormStep>(
    salesOrderId ? "scanner" : "partner",
  );
  const [scannedUnits, setScannedUnits] = useState<ScannedStockUnit[]>([]);
  const [saving, setSaving] = useState(false);
  const [showCreatePartner, setShowCreatePartner] = useState(false);

  // Partner selection state
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
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

  // Mutations
  const { createOutwardWithItems } = useStockFlowMutations(warehouse.id);

  // Fetch order details if an order is selected
  const { data: salesOrder } = useSalesOrderById(
    linkToData.linkToType === "sales_order" ? linkToData.sales_order_id : null,
  );

  const { data: purchaseOrder } = usePurchaseOrderById(
    linkToData.linkToType === "purchase_return"
      ? linkToData.purchase_order_id
      : null,
  );

  // Extract product IDs and quantities from order line items
  const orderProducts = useMemo(() => {
    const result: Record<string, number> = {};

    if (linkToData.linkToType === "sales_order" && salesOrder) {
      salesOrder.sales_order_items.forEach((item) => {
        if (item.product_id && item.pending_quantity !== null) {
          result[item.product_id] = item.pending_quantity;
        }
      });
    }

    if (linkToData.linkToType === "purchase_return" && purchaseOrder) {
      purchaseOrder.purchase_order_items.forEach((item) => {
        if (item.product_id && item.pending_quantity !== null) {
          result[item.product_id] = item.pending_quantity;
        }
      });
    }

    return result;
  }, [linkToData.linkToType, salesOrder, purchaseOrder]);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Details form state
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
    outwardDate: dateToISOString(new Date()),
    dueDate: "",
    transportType: null,
    transportReferenceNumber: "",
    notes: "",
    documentFile: null,
  });

  // Prefill linkToData and partner when coming from sales order URL
  useEffect(() => {
    if (!salesOrderId || linkToData.sales_order_id) return;

    // Set linkTo data for sales order
    setLinkToData({
      linkToType: "sales_order",
      sales_order_id: salesOrderId,
      purchase_order_id: null,
      other_reason: null,
      job_work_id: null,
    });
  }, [salesOrderId, linkToData.sales_order_id]);

  // Set partner from sales order when data loads
  useEffect(() => {
    if (!salesOrderId || !salesOrder || selectedPartnerId) return;

    setSelectedPartnerId(salesOrder.customer_id);
  }, [salesOrderId, salesOrder, selectedPartnerId]);

  // Partner selection handler with auto-advance
  const handleSelectPartner = (partnerId: string, _ledgerId: string) => {
    setSelectedPartnerId(partnerId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("linkTo");
    }, 300);
  };

  // Validation for each step
  const canProceedFromScanner = useMemo(
    () => scannedUnits.length > 0,
    [scannedUnits],
  );

  const canProceedFromPartner = useMemo(
    () => selectedPartnerId !== null,
    [selectedPartnerId],
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
    if (currentStep === "partner" && canProceedFromPartner) {
      setCurrentStep("linkTo");
    } else if (currentStep === "linkTo" && canProceedFromLinkTo) {
      setCurrentStep("scanner");
    } else if (currentStep === "scanner" && canProceedFromScanner) {
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("scanner");
    } else if (currentStep === "scanner") {
      setCurrentStep("linkTo");
    } else if (currentStep === "linkTo") {
      setCurrentStep("partner");
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/stock-flow`);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedPartnerId) return;
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
        transport_type: detailsFormData.transportType || undefined,
        transport_reference_number:
          detailsFormData.transportReferenceNumber || undefined,
        notes: detailsFormData.notes || undefined,
        partner_id: selectedPartnerId,
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
    currentStep === "partner"
      ? 1
      : currentStep === "linkTo"
        ? 2
        : currentStep === "scanner"
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
          {currentStep === "partner" && (
            <PartnerSelectionStep
              partnerType="customer"
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={handleSelectPartner}
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

          {currentStep === "scanner" && (
            <StockUnitScannerStep
              scannedUnits={scannedUnits}
              onScannedUnitsChange={setScannedUnits}
              warehouseId={warehouse.id}
              orderProducts={orderProducts}
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
          {currentStep !== "partner" && (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={saving}
              className="flex-1"
            >
              Back
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
