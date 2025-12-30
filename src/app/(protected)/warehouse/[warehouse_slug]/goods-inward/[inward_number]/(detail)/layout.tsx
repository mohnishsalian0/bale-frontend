"use client";

import { use, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useSession } from "@/contexts/session-context";
import {
  useGoodsInwardBySequenceNumber,
  useGoodsInwardMutations,
} from "@/lib/query/hooks/stock-flow";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getGoodsInwardDetailFooterItems } from "@/lib/utils/context-menu-items";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { toast } from "sonner";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    inward_number: string;
  }>;
  children: React.ReactNode;
}

export default function GoodsInwardDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse } = useSession();
  const { warehouse_slug, inward_number } = use(params);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch goods inward using TanStack Query
  const {
    data: inward,
    isLoading: loading,
    isError: error,
  } = useGoodsInwardBySequenceNumber(inward_number);
  console.log(inward);

  // Mutations
  const { cancelInward, deleteInward } = useGoodsInwardMutations(inward_number);

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/goods-inward/${inward_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/stock-units")) return "stock-units";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Handler functions
  const handleEdit = () => {
    router.push(`${basePath}/edit`);
  };

  const handleDelete = () => {
    if (!inward) return;

    deleteInward.mutate(inward.id, {
      onSuccess: () => {
        toast.success("Goods inward deleted successfully");
        router.push(`/warehouse/${warehouse.slug}/stock-flow`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting goods inward:", error);
        toast.error("Failed to delete goods inward");
      },
    });
  };

  const handleCancel = (reason: string) => {
    if (!inward) return;

    cancelInward.mutate(
      { inwardId: inward.id, cancellationReason: reason },
      {
        onSuccess: () => {
          toast.success("Goods inward cancelled successfully");
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling goods inward:", error);
          toast.error("Failed to cancel goods inward");
        },
      },
    );
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading goods inward..." />;
  }

  // Error state
  if (error || !inward) {
    return (
      <ErrorState
        title="Goods inward not found"
        message="This goods inward does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  return (
    <div className="flex flex-col grow">
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              GI-{inward.sequence_number}
            </h1>
            <p className="text-sm text-gray-500">
              Goods inward on {formatAbsoluteDate(inward.inward_date)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "details", label: "Inward details" },
            { value: "stock-units", label: "Stock units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>

        {/* Bottom Action Bar */}
        <ActionsFooter
          items={getGoodsInwardDetailFooterItems(
            inward.has_invoice || false,
            inward.is_cancelled || false,
            {
              onEdit: handleEdit,
              onDelete: () => setShowDeleteDialog(true),
              onCancel: () => setShowCancelDialog(true),
            },
          )}
        />

        {/* Cancel/Delete Dialogs */}
        {inward && (
          <>
            <CancelDialog
              open={showCancelDialog}
              onOpenChange={setShowCancelDialog}
              onConfirm={handleCancel}
              title="Cancel goods inward"
              message="Please provide a reason for cancelling this goods inward. This action cannot be undone."
              loading={cancelInward.isPending}
            />

            <DeleteDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onConfirm={handleDelete}
              title="Delete goods inward"
              message={`Are you sure you want to delete GI-${inward.sequence_number}? This action cannot be undone.`}
              loading={deleteInward.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}
