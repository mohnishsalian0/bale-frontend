"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  IconPackage,
  IconCash,
  IconBuildingWarehouse,
  IconNote,
  IconMapPin,
  IconCurrencyRupee,
  IconPercentage,
  IconCalendar,
  IconArrowsShuffle,
} from "@tabler/icons-react";
import {
  getJobWorkStatusConfig,
  JobWorkStatusBadge,
} from "@/components/ui/job-work-status-badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import ImageWrapper from "@/components/ui/image-wrapper";
import { Section } from "@/components/layouts/section";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { ApprovalDialog } from "@/components/layouts/approval-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { CompleteDialog } from "@/components/layouts/complete-dialog";
import { useSession } from "@/contexts/session-context";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/financial";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { getInitials } from "@/lib/utils/initials";
import {
  getPartnerName,
  getFormattedAddress,
  mapPartnerBillingAddress,
} from "@/lib/utils/partner";
import {
  getVendorName,
  getJobWorkDisplayStatus,
  calculateCompletionPercentage,
  type DisplayStatus,
} from "@/lib/utils/job-work";
import { getProductIcon } from "@/lib/utils/product";
import { getJobWorkActions } from "@/lib/utils/action-menu";
import {
  useJobWorkByNumber,
  useJobWorkMutations,
} from "@/lib/query/hooks/job-works";
import { toast } from "sonner";
import type {
  MeasuringUnit,
  StockType,
  JobWorkStatus,
} from "@/types/database/enums";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    job_work_number: string;
  }>;
}

export default function JobWorkDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, job_work_number } = use(params);
  const { warehouse } = useSession();

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch data using TanStack Query hooks
  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
  } = useJobWorkByNumber(job_work_number);

  // Job work mutations
  const {
    cancel: cancelOrder,
    complete: completeOrder,
    update: updateOrder,
    delete: deleteOrder,
  } = useJobWorkMutations();

  // Get financials from database-calculated values
  const financials = useMemo(() => {
    if (!order) return null;
    const itemTotal = order.job_work_items.reduce(
      (sum, item) => sum + (item.line_total || 0),
      0,
    );
    return {
      subtotal: itemTotal,
      discountAmount: order.discount_amount || 0,
      afterDiscount: itemTotal - (order.discount_amount || 0),
      gstAmount: order.gst_amount || 0,
      finalTotal: order.total_amount || 0,
    };
  }, [order]);

  // Calculate completion percentage using utility
  const completionPercentage = useMemo(() => {
    if (!order) return 0;
    return calculateCompletionPercentage(order.job_work_items);
  }, [order]);

  // Compute display status (includes 'overdue' logic) using utility
  const displayStatusData = useMemo(() => {
    if (!order)
      return { status: "in_progress" as DisplayStatus, text: "In Progress" };
    return getJobWorkDisplayStatus(
      order.status as JobWorkStatus,
      order.due_date,
    );
  }, [order]);

  const progressBarColor = getJobWorkStatusConfig(
    displayStatusData.status,
  ).color;

  // Handler functions
  const handleApprove = () => {
    setShowApproveDialog(true);
  };

  const handleConfirmApprove = () => {
    if (!order) return;
    updateOrder.mutate(
      {
        orderId: order.id,
        data: { status: "in_progress" },
      },
      {
        onSuccess: () => {
          toast.success("Job work approved successfully.");
          setShowApproveDialog(false);
        },
        onError: (error) => {
          toast.error("Failed to approve job work.");
          console.error("Error approving job work:", error);
        },
      },
    );
  };

  const handleComplete = (notes?: string) => {
    if (!order) return;
    completeOrder.mutate(
      { orderId: order.id, completeData: { notes } },
      {
        onSuccess: () => {
          toast.success("Job work marked as complete");
          setShowCompleteDialog(false);
        },
        onError: (error) => {
          console.error("Error completing job work:", error);
          toast.error("Failed to complete job work");
        },
      },
    );
  };

  const handleCancel = (reason: string) => {
    if (!order) return;
    cancelOrder.mutate(
      { orderId: order.id, cancelData: { reason } },
      {
        onSuccess: () => {
          toast.success("Job work cancelled");
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling job work:", error);
          toast.error("Failed to cancel job work");
        },
      },
    );
  };

  const handleShare = async () => {
    if (!order) return;

    const orderUrl = `${window.location.origin}/warehouse/${warehouse.slug}/job-works/${order.sequence_number}/details`;
    try {
      await navigator.clipboard.writeText(orderUrl);
      toast.success("Link copied to clipboard");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy link");
    }
  };

  const handleDelete = () => {
    if (!order) return;
    deleteOrder.mutate(order.id, {
      onSuccess: () => {
        toast.success("Job work deleted successfully");
        router.push(`/warehouse/${warehouse.slug}/job-works`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting job work:", error);
        toast.error("Failed to delete job work");
      },
    });
  };

  const handleEdit = () => {
    router.push(
      `/warehouse/${warehouse_slug}/job-works/${job_work_number}/edit`,
    );
  };

  const handleCreateConvert = () => {
    if (!order) return;
    router.push(
      `/warehouse/${warehouse.slug}/goods-convert/create?job_work=${order.id}`,
    );
  };

  const handleCreateInvoice = () => {
    if (!order) return;
    const params = new URLSearchParams({
      order: order.sequence_number.toString(),
    });
    router.push(
      `/warehouse/${warehouse.slug}/invoices/quick-create/purchase?${params.toString()}`,
    );
  };

  // Loading state
  if (orderLoading) {
    return <LoadingState message="Loading job work..." />;
  }

  // Error state
  if (orderError || !order) {
    return (
      <ErrorState
        title="Job work not found"
        message="This job work does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  const serviceTypeName = order.service_type?.name;

  return (
    <div className="flex flex-col grow">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`text-2xl font-bold ${order.status === "cancelled" ? "text-gray-400" : "text-gray-900"}`}
            >
              JW-{order.sequence_number}
            </h1>
            <JobWorkStatusBadge
              status={displayStatusData.status}
              text={displayStatusData.text}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Job work started on {formatAbsoluteDate(order.start_date)}
            {serviceTypeName && ` • ${serviceTypeName}`}
          </p>
        </div>

        {/* Progress Bar */}
        {displayStatusData.status !== "approval_pending" && (
          <div className="mt-4 max-w-sm">
            <p className="text-sm text-gray-700 mb-1">
              {completionPercentage}% received
            </p>
            <Progress color={progressBarColor} value={completionPercentage} />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {/* Goods Converts Section (placeholder) */}
          <Section
            title="Goods converts"
            subtitle="0 goods converts"
            icon={() => <IconArrowsShuffle />}
          >
            {null}
          </Section>

          {/* Line Items Section */}
          <Section
            title={`${order.job_work_items.length} items at ₹${formatCurrency(financials?.finalTotal || 0)}`}
            subtitle="Line items"
            icon={() => <IconPackage />}
          >
            <div>
              <ul className="space-y-6">
                {order.job_work_items.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <div className="mt-0.5">
                      <ImageWrapper
                        size="sm"
                        shape="square"
                        imageUrl={item.product?.product_images?.[0]}
                        alt={item.product?.name || ""}
                        placeholderIcon={getProductIcon(
                          item.product?.stock_type as StockType,
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-gray-700 truncate"
                        title={item.product?.name}
                      >
                        {item.product?.name || "Unknown Product"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.received_quantity || 0}
                        {" / "}
                        {item.expected_quantity}{" "}
                        {getMeasuringUnitAbbreviation(
                          item.product?.measuring_unit as MeasuringUnit,
                        )}{" "}
                        received
                      </p>
                      {/* Progress bar */}
                      {displayStatusData.status !== "approval_pending" && (
                        <Progress
                          size="sm"
                          color={progressBarColor}
                          value={
                            item.expected_quantity > 0
                              ? ((item.received_quantity || 0) /
                                  item.expected_quantity) *
                                100
                              : 0
                          }
                          className="max-w-sm mt-1"
                        />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-700 shrink-0">
                      ₹{formatCurrency(item.line_total || 0)}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Financial Breakdown */}
              {financials && (
                <div className="space-y-4 pt-3 mt-6 border-t border-border">
                  {order.discount_type !== "none" && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>
                        Discount
                        {order.discount_type === "percentage" &&
                          ` (${order.discount_value || 0}%)`}
                      </span>
                      <span className="font-semibold">
                        -₹{formatCurrency(financials.discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Item total</span>
                    <span className="font-semibold">
                      ₹{formatCurrency(financials.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>GST</span>
                    <span className="font-semibold">
                      ₹{formatCurrency(financials.gstAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-700 pt-2 border-t">
                    <span>Total</span>
                    <span className="font-semibold">
                      ₹{formatCurrency(financials.finalTotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Vendor Section */}
          <Section
            title={getVendorName(order.vendor)}
            subtitle="Vendor"
            icon={() => <>{getInitials(getVendorName(order.vendor))}</>}
          >
            {order.vendor &&
              getFormattedAddress(mapPartnerBillingAddress(order.vendor))
                .length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 flex items-center gap-2">
                    <IconMapPin className="size-4" />
                    Address
                  </span>
                  <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                    {getFormattedAddress(
                      mapPartnerBillingAddress(order.vendor),
                    ).map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
          </Section>

          {/* Agent Section */}
          <Section
            title={
              order.agent ? getPartnerName(order.agent) : "No agent assigned"
            }
            subtitle="Agent"
            icon={() => (
              <>
                {order.agent ? getInitials(getPartnerName(order.agent)) : "—"}
              </>
            )}
          />

          {/* Payment Details Section */}
          <Section
            title="Payment details"
            subtitle={`₹${formatCurrency(order.advance_amount || 0)} advance`}
            icon={() => <IconCash />}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <IconCurrencyRupee className="size-4 text-gray-500" />
                  <span>Advance amount</span>
                </div>
                <span className="font-semibold text-gray-700">
                  ₹{formatCurrency(order.advance_amount || 0)}
                </span>
              </div>
              {order.discount_type !== "none" && (
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    {order.discount_type === "percentage" ? (
                      <IconPercentage className="size-4 text-gray-500" />
                    ) : (
                      <IconCurrencyRupee className="size-4 text-gray-500" />
                    )}
                    <span>Discount</span>
                  </div>
                  <span className="font-semibold text-gray-700">
                    {order.discount_type === "percentage"
                      ? `${order.discount_value || 0}%`
                      : `₹${formatCurrency(order.discount_value || 0)}`}
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* Warehouse Section */}
          <Section
            title={order.warehouse?.name || "Unknown Warehouse"}
            subtitle="Warehouse"
            icon={() => <IconBuildingWarehouse />}
          >
            {order.warehouse &&
              getFormattedAddress(order.warehouse).length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 flex items-center gap-2">
                    <IconMapPin className="size-4" />
                    Address
                  </span>
                  <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                    {getFormattedAddress(order.warehouse).map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              )}
          </Section>

          {/* Important Dates Section */}
          <Section
            title="Important dates"
            subtitle={formatAbsoluteDate(order.start_date)}
            icon={() => <IconCalendar />}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Start date</span>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(order.start_date)}
                </span>
              </div>
              {order.due_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Due date</span>
                  <span className="font-semibold text-gray-700">
                    {formatAbsoluteDate(order.due_date)}
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* Notes Section */}
          <Section
            title="Notes"
            subtitle={
              !order.notes && !order.cancellation_reason ? "No notes added" : ""
            }
            icon={() => <IconNote />}
          >
            {(order.notes || order.cancellation_reason) && (
              <div className="space-y-4">
                {order.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Order notes
                    </p>
                    <p className="text-sm text-gray-700">{order.notes}</p>
                  </div>
                )}
                {order.cancellation_reason && order.status === "cancelled" && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">
                      Cancellation reason
                    </p>
                    <p className="text-sm text-gray-700">
                      {order.cancellation_reason}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <ActionsFooter
        items={getJobWorkActions(
          displayStatusData.status,
          order.has_convert || false,
          {
            onApprove: handleApprove,
            onEdit: handleEdit,
            onCreateConvert: handleCreateConvert,
            onCreateInvoice: handleCreateInvoice,
            onComplete: () => setShowCompleteDialog(true),
            onShare: handleShare,
            onCancel: () => setShowCancelDialog(true),
            onDelete: () => setShowDeleteDialog(true),
          },
        )}
      />

      {/* Dialogs */}
      {order && (
        <>
          <CancelDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
            onConfirm={handleCancel}
            title="Cancel job work"
            message="Please provide a reason for cancelling this job work. This action cannot be undone."
            loading={cancelOrder.isPending}
          />

          <CompleteDialog
            open={showCompleteDialog}
            title="Mark job work as complete"
            description="This will mark the job work as completed. You can optionally add completion notes."
            onOpenChange={setShowCompleteDialog}
            onComplete={handleComplete}
            hasNotes={true}
            loading={completeOrder.isPending}
          />

          <ApprovalDialog
            open={showApproveDialog}
            onOpenChange={setShowApproveDialog}
            orderNumber={order.sequence_number}
            orderType="JW"
            onConfirm={handleConfirmApprove}
            loading={updateOrder.isPending}
          />

          {showDeleteDialog && (
            <DeleteDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onConfirm={handleDelete}
              title="Delete job work"
              message={`Are you sure you want to delete JW-${order.sequence_number}? This action cannot be undone.`}
              loading={deleteOrder.isPending}
            />
          )}
        </>
      )}
    </div>
  );
}
