"use client";

import { use, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { useSession } from "@/contexts/session-context";
import {
  useGoodsOutwardBySequenceNumber,
  useGoodsOutwardMutations,
} from "@/lib/query/hooks/stock-flow";
import { useCompany } from "@/lib/query/hooks/company";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getGoodsOutwardActions } from "@/lib/utils/action-menu";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { toast } from "sonner";
import { downloadDeliveryChallanPDF } from "@/lib/pdf/delivery-challan-pdf-generator";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    outward_number: string;
  }>;
  children: React.ReactNode;
}

export default function GoodsOutwardDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse } = useSession();
  const { warehouse_slug, outward_number } = use(params);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetch goods outward using TanStack Query
  const {
    data: outward,
    isLoading: loading,
    isError: error,
  } = useGoodsOutwardBySequenceNumber(outward_number);

  // Fetch company data for PDF
  const { data: company } = useCompany();

  // Mutations
  const { cancelOutward, deleteOutward } =
    useGoodsOutwardMutations(outward_number);

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/goods-outward/${outward_number}`;
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
    if (!outward) return;

    deleteOutward.mutate(outward.id, {
      onSuccess: () => {
        toast.success("Goods outward deleted successfully");
        router.push(`/warehouse/${warehouse.slug}/stock-flow`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting goods outward:", error);
        toast.error("Failed to delete goods outward");
      },
    });
  };

  const handleCancel = (reason: string) => {
    if (!outward) return;

    cancelOutward.mutate(
      { outwardId: outward.id, cancellationReason: reason },
      {
        onSuccess: () => {
          toast.success("Goods outward cancelled successfully");
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling goods outward:", error);
          toast.error("Failed to cancel goods outward");
        },
      },
    );
  };

  const handleDownload = async () => {
    if (!outward || !company) return;

    setDownloading(true);
    try {
      await downloadDeliveryChallanPDF(outward, company);
      toast.success("Delivery challan downloaded successfully");
    } catch (error) {
      console.error("Error downloading delivery challan:", error);
      toast.error("Failed to download delivery challan");
    } finally {
      setDownloading(false);
    }
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading goods outward..." />;
  }

  // Error state
  if (error || !outward) {
    return (
      <ErrorState
        title="Goods outward not found"
        message="This goods outward does not exist or has been deleted"
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
              GO-{outward.sequence_number}
            </h1>
            <p className="text-sm text-gray-500">
              Goods outward on {formatAbsoluteDate(outward.outward_date)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "details", label: "Outward details" },
            { value: "stock-units", label: "Stock units" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>

        {/* Bottom Action Bar */}
        <ActionsFooter
          items={getGoodsOutwardActions(
            outward.has_invoice || false,
            outward.is_cancelled || false,
            {
              onEdit: handleEdit,
              onDelete: () => setShowDeleteDialog(true),
              onCancel: () => setShowCancelDialog(true),
              onDownload: handleDownload,
            },
            {
              downloading,
            },
          )}
        />

        {/* Cancel/Delete Dialogs */}
        {outward && (
          <>
            <CancelDialog
              open={showCancelDialog}
              onOpenChange={setShowCancelDialog}
              onConfirm={handleCancel}
              title="Cancel goods outward"
              message="Please provide a reason for cancelling this goods outward. This action cannot be undone."
              loading={cancelOutward.isPending}
            />

            <DeleteDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onConfirm={handleDelete}
              title="Delete goods outward"
              message={`Are you sure you want to delete GO-${outward.sequence_number}? This action cannot be undone.`}
              loading={deleteOutward.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}
