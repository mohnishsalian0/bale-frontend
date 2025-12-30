"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InwardDetailsStep } from "../../InwardDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import {
  useGoodsInwardBySequenceNumber,
  useGoodsInwardMutations,
} from "@/lib/query/hooks/stock-flow";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import type { TransportType } from "@/types/database/enums";

interface DetailsFormData {
  inwardDate: string;
  expectedDeliveryDate: string;
  transportType: TransportType | null;
  transportReferenceNumber: string;
  notes: string;
  documentFile: File | null;
}

export default function EditGoodsInwardPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; inward_number: string }>;
}) {
  const { inward_number } = use(params);
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [saving, setSaving] = useState(false);

  // Fetch existing inward
  const {
    data: inward,
    isLoading,
    error,
  } = useGoodsInwardBySequenceNumber(inward_number);

  // Mutations
  const { updateInward } = useGoodsInwardMutations(inward_number);

  // Hide chrome for immersive flow experience
  useEffect(() => {
    hideChrome();
    return () => showChromeUI(); // Restore chrome on unmount
  }, [hideChrome, showChromeUI]);

  // Details form state
  const [detailsFormData, setDetailsFormData] = useState<DetailsFormData>({
    inwardDate: dateToISOString(new Date()),
    expectedDeliveryDate: "",
    transportType: null,
    transportReferenceNumber: "",
    notes: "",
    documentFile: null,
  });

  // Initialize form from fetched data and check edit restrictions
  useEffect(() => {
    if (!inward) return;

    // Check if inward can be edited - redirect if not
    if (inward.is_cancelled) {
      toast.error("Cannot edit a cancelled goods inward");
      router.push(
        `/warehouse/${warehouse.slug}/goods-inward/${inward_number}/details`,
      );
      return;
    }

    if (inward.has_invoice) {
      toast.error("Cannot edit goods inward - linked to invoice");
      router.push(
        `/warehouse/${warehouse.slug}/goods-inward/${inward_number}/details`,
      );
      return;
    }

    // Initialize form data
    setDetailsFormData({
      inwardDate: inward.inward_date || dateToISOString(new Date()),
      expectedDeliveryDate: inward.expected_delivery_date || "",
      transportType: (inward.transport_type as TransportType) || null,
      transportReferenceNumber: inward.transport_reference_number || "",
      notes: inward.notes || "",
      documentFile: null,
    });
  }, [inward, inward_number, router, warehouse.slug]);

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse.slug}/goods-inward/${inward_number}/details`,
    );
  };

  const handleSubmit = async () => {
    if (!inward) return;

    setSaving(true);

    try {
      await updateInward.mutateAsync({
        inwardId: inward.id,
        updateData: {
          inward_date: detailsFormData.inwardDate || undefined,
          expected_delivery_date:
            detailsFormData.expectedDeliveryDate || undefined,
          transport_type: detailsFormData.transportType || undefined,
          transport_reference_number:
            detailsFormData.transportReferenceNumber || undefined,
          notes: detailsFormData.notes || undefined,
        },
      });

      toast.success("Goods inward updated successfully");
      router.push(
        `/warehouse/${warehouse.slug}/goods-inward/${inward_number}/details`,
      );
    } catch (error) {
      console.error("Error updating goods inward:", error);
      toast.error("Failed to update goods inward");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading goods inward..." />;
  }

  // Error state
  if (error || !inward) {
    return (
      <ErrorState
        message="Failed to load goods inward"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={`Edit Inward ${inward.sequence_number}`}
          currentStep={1}
          totalSteps={1}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Form Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          <InwardDetailsStep
            formData={detailsFormData}
            onChange={(updates) =>
              setDetailsFormData((prev) => ({ ...prev, ...updates }))
            }
          />
        </div>

        {/* Bottom Action Bar - Fixed at bottom */}
        <FormFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </FormFooter>
      </div>
    </div>
  );
}
