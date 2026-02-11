"use client";

import { use, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconArrowBarToDown, IconAlertTriangle } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useSession } from "@/contexts/session-context";
import {
  useGoodsConvertBySequenceNumber,
  useGoodsConvertMutations,
} from "@/lib/query/hooks/goods-converts";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getGoodsConvertActions } from "@/lib/utils/action-menu";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { ConvertStatusBadge } from "@/components/ui/convert-status-badge";
import { toast } from "sonner";
import { ConvertStatus } from "@/types/database/enums";
import { getInputQuantitiesByUnit } from "@/lib/utils/goods-convert";
import {
  formatMeasuringUnitQuantities,
  getMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import type { MeasuringUnit } from "@/types/database/enums";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    convert_number: string;
  }>;
  children: React.ReactNode;
}

export default function GoodsConvertDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse } = useSession();
  const { warehouse_slug, convert_number } = use(params);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch goods convert using TanStack Query
  const {
    data: convert,
    isLoading: loading,
    isError: error,
  } = useGoodsConvertBySequenceNumber(convert_number);

  // Mutations
  const { cancelConvert, deleteConvert } = useGoodsConvertMutations(
    warehouse.id,
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!convert) return null;

    // Calculate total input quantities
    const inputQuantities = getInputQuantitiesByUnit(convert);
    const totalInput = formatMeasuringUnitQuantities(inputQuantities);

    // If completed, calculate output and wastage
    if (convert.status === "completed" && convert.output_stock_units) {
      const outputQuantities = new Map<MeasuringUnit, number>();
      convert.output_stock_units.forEach((unit) => {
        const measuringUnit = unit.product?.measuring_unit as MeasuringUnit;
        if (measuringUnit) {
          const qty = Number(unit.initial_quantity) || 0;
          outputQuantities.set(
            measuringUnit,
            (outputQuantities.get(measuringUnit) || 0) + qty,
          );
        }
      });
      const totalOutput = formatMeasuringUnitQuantities(outputQuantities);

      // Calculate wastage (from adjustments)
      const wastage = Math.abs(
        convert.wastage.reduce((sum, w) => sum + w.quantity_adjusted, 0),
      );

      return { totalInput, totalOutput, wastage, isCompleted: true };
    }

    return { totalInput, isCompleted: false };
  }, [convert]);

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/goods-convert/${convert_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/input-units")) return "input-units";
    if (pathname.endsWith("/output-units")) return "output-units";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Handler functions
  const handleComplete = () => {
    if (!convert) return;
    router.push(`${basePath}/complete`);
  };

  const handleEdit = () => {
    if (!convert) return;
    router.push(`${basePath}/edit`);
  };

  const handleCancel = (reason: string) => {
    if (!convert) return;

    cancelConvert.mutate(
      { convertId: convert.id, cancellationReason: reason },
      {
        onSuccess: () => {
          toast.success("Goods convert cancelled successfully");
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling goods convert:", error);
          toast.error("Failed to cancel goods convert");
        },
      },
    );
  };

  const handleDelete = () => {
    if (!convert) return;

    deleteConvert.mutate(convert.id, {
      onSuccess: () => {
        toast.success("Goods convert deleted successfully");
        router.push(`/warehouse/${warehouse.slug}/goods-convert`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting goods convert:", error);
        toast.error("Failed to delete goods convert");
      },
    });
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading goods convert..." />;
  }

  // Error state
  if (error || !convert) {
    return (
      <ErrorState
        title="Goods convert not found"
        message="This goods convert does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  // Get actions based on convert status
  const actions = getGoodsConvertActions(convert.status as ConvertStatus, {
    onEdit: handleEdit,
    onComplete: handleComplete,
    onCancel: () => setShowCancelDialog(true),
    onDelete: () => setShowDeleteDialog(true),
  });

  return (
    <div className="flex flex-col grow">
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              GC-{convert.sequence_number}
            </h1>
            <ConvertStatusBadge status={convert.status as ConvertStatus} />
          </div>
          <p className="text-sm text-gray-500">
            {convert.service_type?.name || "Conversion"} on{" "}
            {formatAbsoluteDate(convert.start_date)}
          </p>
        </div>

        {/* Metrics */}
        {metrics && (
          <div className="px-4 pb-4">
            {metrics.isCompleted ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs text-gray-500">Total Input</span>
                  </div>
                  <p className="font-semibold text-gray-700">
                    {metrics.totalInput}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs text-gray-500">Total Output</span>
                  </div>
                  <p className="font-semibold text-gray-700">
                    {metrics.totalOutput}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-2 mb-2">
                    <IconAlertTriangle className="size-4 text-gray-500" />
                    <span className="text-xs text-gray-500">Wastage</span>
                  </div>
                  <p className="font-semibold text-yellow-700">
                    {metrics.wastage}{" "}
                    {getMeasuringUnitAbbreviation(
                      convert.output_product.measuring_unit as MeasuringUnit,
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex gap-2 mb-2">
                    <IconArrowBarToDown className="size-4 text-gray-500" />
                    <span className="text-xs text-gray-500">Total Input</span>
                  </div>
                  <p className="font-semibold text-gray-700">
                    {metrics.totalInput}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "details", label: "Convert details" },
            { value: "input-units", label: "Input units" },
            { value: "output-units", label: "Output units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>

        {/* Bottom Action Bar */}
        <ActionsFooter items={actions} />

        {/* Dialogs */}
        {convert && (
          <>
            <CancelDialog
              open={showCancelDialog}
              onOpenChange={setShowCancelDialog}
              onConfirm={handleCancel}
              title="Cancel goods convert"
              message="Please provide a reason for cancelling this goods convert. This action cannot be undone."
              loading={cancelConvert.isPending}
            />

            <DeleteDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onConfirm={handleDelete}
              title="Delete goods convert"
              message={`Are you sure you want to delete GC-${convert.sequence_number}? This action cannot be undone.`}
              loading={deleteConvert.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}
