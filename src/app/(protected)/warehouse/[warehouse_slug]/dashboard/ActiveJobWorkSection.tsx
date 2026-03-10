"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JobWorkStatusBadge } from "@/components/ui/job-work-status-badge";
import { Progress } from "@/components/ui/progress";
import { CardActions } from "@/components/layouts/card-actions";
import { DashboardSectionSkeleton } from "@/components/layouts/dashboard-section-skeleton";
import { ApprovalDialog } from "@/components/layouts/approval-dialog";
import { CompleteDialog } from "@/components/layouts/complete-dialog";
import {
  calculateCompletionPercentage,
  getJobWorkDisplayStatus,
  getProductSummary,
  getVendorName,
} from "@/lib/utils/job-work";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getJobWorkActions } from "@/lib/utils/action-menu";
import { useJobWorks, useJobWorkMutations } from "@/lib/query/hooks/job-works";
import { useSession } from "@/contexts/session-context";
import type { JobWorkListView } from "@/types/job-works.types";
import type { JobWorkStatus } from "@/types/database/enums";
import { toast } from "sonner";

interface ActiveJobWorkSectionProps {
  title: string;
  warehouseSlug: string;
}

/**
 * Self-contained section for displaying active job works
 * Handles its own data fetching, state management, and dialogs
 */
export function ActiveJobWorkSection({
  title,
  warehouseSlug,
}: ActiveJobWorkSectionProps) {
  const router = useRouter();
  const { warehouse } = useSession();

  // Dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<JobWorkListView | null>(
    null,
  );

  // Fetch job works
  const {
    data: jobWorksResponse,
    isLoading,
    isError,
  } = useJobWorks({
    filters: {
      warehouseId: warehouse.id,
      status: ["approval_pending", "in_progress"],
      limit: 5,
    },
    page: 1,
    pageSize: 5,
  });

  // Mutations
  const { update: updateJobWork, complete: completeJobWork } =
    useJobWorkMutations();

  const orders = jobWorksResponse?.data || [];

  // =====================================================
  // Handler Functions
  // =====================================================

  const handleApprove = (order: JobWorkListView) => {
    setSelectedOrder(order);
    setShowApprovalDialog(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedOrder) return;

    updateJobWork.mutate(
      {
        orderId: selectedOrder.id,
        data: { status: "in_progress" },
      },
      {
        onSuccess: () => {
          toast.success(
            `Job Work JW-${selectedOrder.sequence_number} approved.`,
          );
          setShowApprovalDialog(false);
          setSelectedOrder(null);
        },
        onError: (error) => {
          toast.error("Failed to approve job work.");
          console.error("Error approving job work:", error);
        },
      },
    );
  };

  const handleComplete = (order: JobWorkListView) => {
    setSelectedOrder(order);
    setShowCompleteDialog(true);
  };

  const handleConfirmComplete = (notes?: string) => {
    if (!selectedOrder) return;

    completeJobWork.mutate(
      { orderId: selectedOrder.id, completeData: { notes } },
      {
        onSuccess: () => {
          toast.success("Job work marked as complete");
          setShowCompleteDialog(false);
          setSelectedOrder(null);
        },
        onError: (error) => {
          console.error("Error completing job work:", error);
          toast.error("Failed to complete job work");
        },
      },
    );
  };

  const handleShare = async (order: JobWorkListView) => {
    const orderUrl = `${window.location.origin}/warehouse/${warehouseSlug}/job-works/${order.sequence_number}/details`;
    try {
      await navigator.clipboard.writeText(orderUrl);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }

    const orderShareMessage = `Here are the details and live status of job work #${order.sequence_number}\n🔗 ${orderUrl}`;
    const encodedMessage = encodeURIComponent(orderShareMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  // Loading state
  if (isLoading) {
    return <DashboardSectionSkeleton title={title} itemCount={5} />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col mt-6">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Button variant="ghost" size="sm" disabled>
            View all →
          </Button>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-red-600">Failed to load job works</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col mt-6">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                `/warehouse/${warehouseSlug}/job-works?status=approval_pending,in_progress`,
              )
            }
          >
            View all →
          </Button>
        </div>

        {orders.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-gray-500">
              No pending or in-progress job works
            </p>
          </div>
        ) : (
          <div className="flex flex-col border-b border-border">
            {orders.map((order) => {
              const displayStatusData = getJobWorkDisplayStatus(
                order.status as JobWorkStatus,
                order.due_date,
              );

              const completionPercentage = calculateCompletionPercentage(
                order.job_work_items || [],
              );

              const productSummary = getProductSummary(order.job_work_items);

              const showProgressBar =
                displayStatusData.status === "in_progress" ||
                displayStatusData.status === "overdue";
              const progressColor =
                displayStatusData.status === "overdue" ? "yellow" : "blue";

              const vendorName = getVendorName(order.vendor);

              const actionItems = getJobWorkActions(
                displayStatusData.status,
                order.has_convert || false,
                {
                  onApprove: () => handleApprove(order),
                  onCreateConvert: () => {
                    router.push(
                      `/warehouse/${warehouseSlug}/goods-convert/create?job_work=${order.id}`,
                    );
                  },
                  onCreateInvoice: () => {
                    const params = new URLSearchParams({
                      order: order.sequence_number.toString(),
                      full_order: "true",
                    });
                    router.push(
                      `/warehouse/${warehouseSlug}/invoices/create/purchase?${params.toString()}`,
                    );
                  },
                  onEdit: () => {
                    router.push(
                      `/warehouse/${warehouseSlug}/job-works/${order.sequence_number}/edit`,
                    );
                  },
                  onComplete: () => handleComplete(order),
                  onShare: () => handleShare(order),
                  onCancel: () => {
                    console.log("Cancel:", order.id);
                  },
                  onDelete: () => {
                    console.log("Delete:", order.id);
                  },
                },
              );

              return (
                <Card
                  key={order.id}
                  className="rounded-none border-x-0 border-b-0 shadow-none bg-transparent hover:bg-gray-100"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <button
                      onClick={() =>
                        router.push(
                          `/warehouse/${warehouseSlug}/job-works/${order.sequence_number}/details`,
                        )
                      }
                      className="flex flex-col gap-2 text-left hover:cursor-pointer"
                    >
                      {/* Title and Status Badge */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-base font-medium text-gray-700">
                            {vendorName}
                          </p>
                          <JobWorkStatusBadge
                            status={displayStatusData.status}
                            text={displayStatusData.text}
                          />
                        </div>

                        {/* Subtexts spanning full width */}
                        <p className="text-sm text-gray-500 mt-1">
                          {productSummary}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            JW-{order.sequence_number}
                            {order.due_date &&
                              ` • Due on ${formatAbsoluteDate(order.due_date)}`}
                          </p>
                          {order.status !== "approval_pending" && (
                            <p className="text-xs text-gray-500">
                              {completionPercentage}% completed
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {showProgressBar && (
                        <Progress
                          color={progressColor}
                          value={completionPercentage}
                        />
                      )}
                    </button>

                    {/* Action Buttons */}
                    <CardActions items={actionItems} maxVisibleActions={2} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedOrder && (
        <>
          {/* Approval Dialog */}
          <ApprovalDialog
            open={showApprovalDialog}
            onOpenChange={(isOpen) => {
              setShowApprovalDialog(isOpen);
              if (!isOpen) {
                setSelectedOrder(null);
              }
            }}
            orderNumber={selectedOrder.sequence_number}
            orderType="JW"
            onConfirm={handleConfirmApprove}
            loading={updateJobWork.isPending}
          />

          {/* Complete Dialog */}
          <CompleteDialog
            open={showCompleteDialog}
            title="Mark job work as complete"
            description="This will mark the job work as completed. You can optionally add completion notes."
            onOpenChange={(isOpen) => {
              setShowCompleteDialog(isOpen);
              if (!isOpen) {
                setSelectedOrder(null);
              }
            }}
            onComplete={handleConfirmComplete}
            hasNotes={true}
            loading={completeJobWork.isPending}
          />
        </>
      )}
    </>
  );
}
