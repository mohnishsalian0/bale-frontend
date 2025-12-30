"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { OutwardDetailsStep } from "../../OutwardDetailsStep";
import { useSession } from "@/contexts/session-context";
import { useAppChrome } from "@/contexts/app-chrome-context";
import { toast } from "sonner";
import { dateToISOString } from "@/lib/utils/date";
import FormHeader from "@/components/ui/form-header";
import FormFooter from "@/components/ui/form-footer";
import {
  useGoodsOutwardBySequenceNumber,
  useGoodsOutwardMutations,
} from "@/lib/query/hooks/stock-flow";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import type { TransportType } from "@/types/database/enums";

interface DetailsFormData {
  outwardDate: string;
  dueDate: string;
  transportType: TransportType | null;
  transportReferenceNumber: string;
  notes: string;
  documentFile: File | null;
}

export default function EditGoodsOutwardPage({
  params,
}: {
  params: Promise<{ warehouse_slug: string; outward_number: string }>;
}) {
  const { outward_number } = use(params);
  const router = useRouter();
  const { warehouse } = useSession();
  const { hideChrome, showChromeUI } = useAppChrome();
  const [saving, setSaving] = useState(false);

  // Fetch existing outward
  const {
    data: outward,
    isLoading,
    error,
  } = useGoodsOutwardBySequenceNumber(outward_number);

  // Mutations
  const { updateOutward } = useGoodsOutwardMutations(outward_number);

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

  // Initialize form from fetched data and check edit restrictions
  useEffect(() => {
    if (!outward) return;

    // Check if outward can be edited - redirect if not
    if (outward.is_cancelled) {
      toast.error("Cannot edit a cancelled goods outward");
      router.push(
        `/warehouse/${warehouse.slug}/goods-outward/${outward_number}/details`,
      );
      return;
    }

    if (outward.has_invoice) {
      toast.error("Cannot edit goods outward - linked to invoice");
      router.push(
        `/warehouse/${warehouse.slug}/goods-outward/${outward_number}/details`,
      );
      return;
    }

    // Initialize form data
    setDetailsFormData({
      outwardDate: outward.outward_date || dateToISOString(new Date()),
      dueDate: outward.expected_delivery_date || "",
      transportType: (outward.transport_type as TransportType) || null,
      transportReferenceNumber: outward.transport_reference_number || "",
      notes: outward.notes || "",
      documentFile: null,
    });
  }, [outward, outward_number, router, warehouse.slug]);

  const handleCancel = () => {
    router.push(
      `/warehouse/${warehouse.slug}/goods-outward/${outward_number}/details`,
    );
  };

  const handleSubmit = async () => {
    if (!outward) return;

    setSaving(true);

    try {
      await updateOutward.mutateAsync({
        outwardId: outward.id,
        updateData: {
          outward_date: detailsFormData.outwardDate || undefined,
          expected_delivery_date: detailsFormData.dueDate || undefined,
          transport_type: detailsFormData.transportType || undefined,
          transport_reference_number:
            detailsFormData.transportReferenceNumber || undefined,
          notes: detailsFormData.notes || undefined,
        },
      });

      toast.success("Goods outward updated successfully");
      router.push(
        `/warehouse/${warehouse.slug}/goods-outward/${outward_number}/details`,
      );
    } catch (error) {
      console.error("Error updating goods outward:", error);
      toast.error("Failed to update goods outward");
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading goods outward..." />;
  }

  // Error state
  if (error || !outward) {
    return (
      <ErrorState
        message="Failed to load goods outward"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="h-full flex flex-col items-center">
      <div className="flex-1 flex flex-col w-full overflow-y-hidden">
        {/* Header - Fixed at top */}
        <FormHeader
          title={`Edit Outward ${outward.sequence_number}`}
          currentStep={1}
          totalSteps={1}
          onCancel={handleCancel}
          disableCancel={saving}
        />

        {/* Form Content - Scrollable */}
        <div className="flex-1 flex-col overflow-y-auto flex">
          <OutwardDetailsStep
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
