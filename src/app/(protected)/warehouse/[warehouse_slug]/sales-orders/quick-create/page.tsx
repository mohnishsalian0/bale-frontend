"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  StockUnitScannerStep,
  ScannedStockUnit,
} from "@/components/layouts/stock-unit-scanner-step";
import { PartnerSelectionStep } from "@/components/layouts/partner-selection-step";
import {
  QuickOrderDetailsStep,
  QuickOrderFormData,
} from "./QuickOrderDetailsStep";
import { useSalesOrderMutations } from "@/lib/query/hooks/sales-orders";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";

type FormStep = "scanner" | "customer" | "details";

export default function QuickCreateOrderPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [currentStep, setCurrentStep] = useState<FormStep>("scanner");
  const [scannedUnits, setScannedUnits] = useState<ScannedStockUnit[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // Mutations
  const { quickCreate } = useSalesOrderMutations(warehouse.id);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Details form state
  const [detailsFormData, setDetailsFormData] = useState<QuickOrderFormData>({
    orderDate: dateToISOString(new Date()),
    deliveryDate: "",
    agentId: "",
    taxType: "gst",
    advanceAmount: "",
    discountType: "none",
    discount: "",
    paymentTerms: "",
    transportDetails: "",
    notes: "",
    documentFile: null,
  });

  // Customer selection handler with auto-advance
  const handleSelectCustomer = (customerId: string, _ledger_id: string) => {
    setSelectedCustomerId(customerId);
    // Auto-advance to next step after selection
    setTimeout(() => {
      setCurrentStep("details");
    }, 300);
  };

  // Validation for each step
  const canProceedFromScanner = useMemo(
    () => scannedUnits.length > 0,
    [scannedUnits],
  );

  const canProceedFromCustomer = useMemo(
    () => selectedCustomerId !== null,
    [selectedCustomerId],
  );

  const canSubmit = useMemo(() => {
    return (
      canProceedFromScanner &&
      canProceedFromCustomer &&
      !!detailsFormData.orderDate &&
      !!detailsFormData.deliveryDate
    );
  }, [
    canProceedFromScanner,
    canProceedFromCustomer,
    detailsFormData.orderDate,
    detailsFormData.deliveryDate,
  ]);

  const handleNext = () => {
    if (currentStep === "scanner" && canProceedFromScanner) {
      setCurrentStep("customer");
    } else if (currentStep === "customer" && canProceedFromCustomer) {
      setCurrentStep("details");
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("customer");
    } else if (currentStep === "customer") {
      setCurrentStep("scanner");
    }
  };

  const handleCancel = () => {
    router.push(`/warehouse/${warehouse.slug}/sales-orders`);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedCustomerId) return;
    setSaving(true);

    try {
      // Aggregate scanned units by product
      const productAggregates = scannedUnits.reduce(
        (acc, item) => {
          const productId = item.stockUnit.product_id;
          if (!acc[productId]) {
            acc[productId] = {
              product_id: productId,
              quantity: 0,
              unit_rate: item.stockUnit.product?.selling_price_per_unit || 0,
              stockUnits: [],
            };
          }
          acc[productId].quantity += item.quantity;
          acc[productId].stockUnits.push({
            stock_unit_id: item.stockUnit.id,
            quantity: item.quantity,
          });
          return acc;
        },
        {} as Record<
          string,
          {
            product_id: string;
            quantity: number;
            unit_rate: number;
            stockUnits: { stock_unit_id: string; quantity: number }[];
          }
        >,
      );

      const orderItems = Object.values(productAggregates).map((item) => ({
        product_id: item.product_id,
        required_quantity: item.quantity,
        unit_rate: item.unit_rate,
      }));

      const stockUnitItems = Object.values(productAggregates).flatMap(
        (item) => item.stockUnits,
      );

      // Create order data
      const orderData = {
        warehouse_id: warehouse.id,
        customer_id: selectedCustomerId,
        agent_id: detailsFormData.agentId || null,
        order_date: detailsFormData.orderDate,
        delivery_due_date: detailsFormData.deliveryDate || null,
        tax_type: detailsFormData.taxType,
        advance_amount: detailsFormData.advanceAmount
          ? parseFloat(detailsFormData.advanceAmount)
          : 0,
        discount_type: detailsFormData.discountType,
        discount_value:
          detailsFormData.discountType !== "none" && detailsFormData.discount
            ? parseFloat(detailsFormData.discount)
            : 0,
        payment_terms: detailsFormData.paymentTerms || null,
        transport_details: detailsFormData.transportDetails || null,
        notes: detailsFormData.notes || null,
        attachments: [],
        status: "completed",
      };

      // Call RPC function to create quick sales
      const sequenceNumber = await quickCreate.mutateAsync({
        orderData,
        orderItems,
        stockUnitItems,
      });

      toast.success("Quick sale created successfully");
      router.push(
        `/warehouse/${warehouse.slug}/sales-orders/${sequenceNumber}/details`,
      );
    } catch (error) {
      console.error("Error creating quick sale:", error);
      toast.error("Failed to create quick sale");
    } finally {
      setSaving(false);
    }
  };

  // Calculate step number
  const stepNumber =
    currentStep === "scanner" ? 1 : currentStep === "customer" ? 2 : 3;

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title="Quick Sales"
          currentStep={stepNumber}
          totalSteps={3}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Step Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          {currentStep === "scanner" && (
            <StockUnitScannerStep
              scannedUnits={scannedUnits}
              onScannedUnitsChange={setScannedUnits}
              warehouseId={warehouse.id}
            />
          )}

          {currentStep === "customer" && (
            <PartnerSelectionStep
              partnerType="customer"
              selectedPartnerId={selectedCustomerId}
              onSelectPartner={handleSelectCustomer}
            />
          )}

          {currentStep === "details" && (
            <QuickOrderDetailsStep
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
          {currentStep === "customer" && (
            <Button
              onClick={handleNext}
              disabled={!canProceedFromCustomer || saving}
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
              {saving ? "Creating..." : "Create Order"}
            </Button>
          )}
        </FormFooter>
      </div>
    </div>
  );
}
