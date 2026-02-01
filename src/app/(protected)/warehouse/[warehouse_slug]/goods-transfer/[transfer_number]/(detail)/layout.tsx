"use client";

import { use, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useSession } from "@/contexts/session-context";
import {
  useGoodsTransferBySequenceNumber,
  useGoodsTransferMutations,
} from "@/lib/query/hooks/goods-transfers";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getGoodsTransferActions } from "@/lib/utils/action-menu";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { TransferStatusBadge } from "@/components/ui/transfer-status-badge";
import { toast } from "sonner";
import { TransferStatus } from "@/types/database/enums";
import { CompleteDialog } from "@/components/layouts/complete-dialog";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    transfer_number: string;
  }>;
  children: React.ReactNode;
}

export default function GoodsTransferDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse } = useSession();
  const { warehouse_slug, transfer_number } = use(params);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  // Fetch goods transfer using TanStack Query
  const {
    data: transfer,
    isLoading: loading,
    isError: error,
  } = useGoodsTransferBySequenceNumber(transfer_number);

  // Mutations
  const { completeTransfer, cancelTransfer, deleteTransfer } =
    useGoodsTransferMutations(warehouse.id);

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/goods-transfer/${transfer_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/stock-units")) return "stock-units";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Handler functions
  const handleComplete = () => {
    if (!transfer) return;

    completeTransfer.mutate(transfer.id, {
      onSuccess: () => {
        toast.success("Goods transfer completed successfully");
        setShowCompleteDialog(false);
      },
      onError: (error) => {
        console.error("Error completing goods transfer:", error);
        toast.error("Failed to complete goods transfer");
      },
    });
  };

  const handleCancel = (reason: string) => {
    if (!transfer) return;

    cancelTransfer.mutate(
      { transferId: transfer.id, cancellationReason: reason },
      {
        onSuccess: () => {
          toast.success("Goods transfer cancelled successfully");
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling goods transfer:", error);
          toast.error("Failed to cancel goods transfer");
        },
      },
    );
  };

  const handleDelete = () => {
    if (!transfer) return;

    deleteTransfer.mutate(transfer.id, {
      onSuccess: () => {
        toast.success("Goods transfer deleted successfully");
        router.push(`/warehouse/${warehouse.slug}/goods-transfer`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting goods transfer:", error);
        toast.error("Failed to delete goods transfer");
      },
    });
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading goods transfer..." />;
  }

  // Error state
  if (error || !transfer) {
    return (
      <ErrorState
        title="Goods transfer not found"
        message="This goods transfer does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  // Get actions based on transfer status
  const actions = getGoodsTransferActions(transfer.status as TransferStatus, {
    onComplete: () => setShowCompleteDialog(true),
    onCancel: () => setShowCancelDialog(true),
    onDelete: () => setShowDeleteDialog(true),
  });

  return (
    <div className="flex flex-col grow">
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              GT-{transfer.sequence_number}
            </h1>
            <TransferStatusBadge status={transfer.status as TransferStatus} />
          </div>
          <p className="text-sm text-gray-500">
            Goods transfer on {formatAbsoluteDate(transfer.transfer_date)}
          </p>
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "details", label: "Transfer details" },
            { value: "stock-units", label: "Stock units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>

        {/* Bottom Action Bar */}
        <ActionsFooter items={actions} />

        {/* Dialogs */}
        {transfer && (
          <>
            <CompleteDialog
              open={showCompleteDialog}
              onOpenChange={setShowCompleteDialog}
              onComplete={handleComplete}
              title="Complete goods transfer"
              description={`Are you sure you want to mark GT-${transfer.sequence_number} as completed? Stock units will be updated to the destination warehouse.`}
              loading={completeTransfer.isPending}
            />

            <CancelDialog
              open={showCancelDialog}
              onOpenChange={setShowCancelDialog}
              onConfirm={handleCancel}
              title="Cancel goods transfer"
              message="Please provide a reason for cancelling this goods transfer. This action cannot be undone."
              loading={cancelTransfer.isPending}
            />

            <DeleteDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onConfirm={handleDelete}
              title="Delete goods transfer"
              message={`Are you sure you want to delete GT-${transfer.sequence_number}? This action cannot be undone.`}
              loading={deleteTransfer.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}
