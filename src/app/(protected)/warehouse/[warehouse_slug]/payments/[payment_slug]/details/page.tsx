"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconReceipt,
  IconCalendar,
  IconNote,
  IconFileInvoice,
  IconUsers,
} from "@tabler/icons-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { PaymentMode } from "@/types/database/enums";
import { Section } from "@/components/layouts/section";
import {
  usePaymentBySlug,
  usePaymentMutations,
} from "@/lib/query/hooks/payments";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { PaymentModeBadge } from "@/components/ui/payment-mode-badge";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getPaymentDetailFooterItems } from "@/lib/utils/context-menu-items";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { toast } from "sonner";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    payment_slug: string;
  }>;
}

export default function PaymentDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, payment_slug } = use(params);

  const {
    data: payment,
    isLoading: loading,
    isError: error,
  } = usePaymentBySlug(payment_slug);

  // Payment mutations
  const { cancel: cancelPayment, delete: deletePayment } =
    usePaymentMutations();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const allocations = payment?.payment_allocations || [];

  const paymentTypeLabel =
    payment?.voucher_type === "receipt" ? "Receipt" : "Payment";

  const handleCancel = (reason: string) => {
    if (!payment) return;
    cancelPayment.mutate(
      { paymentId: payment.id, reason },
      {
        onSuccess: () => {
          toast.success(`${paymentTypeLabel} cancelled successfully`);
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling payment:", error);
          toast.error(
            `Failed to cancel ${paymentTypeLabel.toLowerCase()}: ${error.message}`,
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (!payment) return;
    deletePayment.mutate(payment.id, {
      onSuccess: () => {
        toast.success(`${paymentTypeLabel} deleted successfully`);
        router.push(`/warehouse/${warehouse_slug}/payments`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting payment:", error);
        toast.error(`Failed to delete ${paymentTypeLabel.toLowerCase()}`);
      },
    });
  };

  // Footer action items
  const footerItems = payment
    ? getPaymentDetailFooterItems(payment, {
        onEdit: () => {
          router.push(
            `/warehouse/${warehouse_slug}/payments/${payment_slug}/edit`,
          );
        },
        onDelete: () => {
          setShowDeleteDialog(true);
        },
        onCancel: () => {
          setShowCancelDialog(true);
        },
      })
    : [];

  // Loading state
  if (loading) {
    return <LoadingState message="Loading payment details..." />;
  }

  // Error state
  if (error || !payment) {
    return (
      <ErrorState
        title="Failed to load payment"
        message="Could not load the payment details"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  return (
    <div className="flex flex-col grow">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1
                className={`text-2xl font-bold ${payment.is_cancelled ? "text-gray-400" : "text-gray-900"}`}
              >
                {payment.payment_number}
              </h1>
              {payment.is_cancelled && <Badge color="gray">Cancelled</Badge>}
              <PaymentModeBadge mode={payment.payment_mode as PaymentMode} />
              {payment.exported_to_tally_at && (
                <Badge variant="secondary" color="blue">
                  Exported to Tally
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {payment.voucher_type === "receipt" ? "Received" : "Paid"} on{" "}
              {formatAbsoluteDate(payment.payment_date)}
              {payment.party_ledger && ` • ${payment.party_ledger.name}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-700">
              {formatCurrency(payment.net_amount || 0)}
            </p>
            {payment.tds_applicable && (
              <p className="text-sm text-gray-500 mt-1">
                TDS deducted: {formatCurrency(payment.tds_amount)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Rest of sections in padded container */}
        <div className="flex flex-col gap-3 p-4">
          {/* Allocations & Amount Section */}
          <Section
            title={`${allocations.length} ${allocations.length === 1 ? "allocation" : "allocations"} at ${formatCurrency(payment.net_amount || 0)}`}
            subtitle="Allocations & amount"
            icon={() => <IconReceipt />}
          >
            <div>
              {allocations.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No allocations for this payment
                </p>
              ) : (
                <>
                  <ul className="space-y-6">
                    {allocations.map((allocation) => (
                      <li key={allocation.id} className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          {allocation.invoice ? (
                            <Link
                              href={`/warehouse/${warehouse_slug}/invoices/${allocation.invoice.slug}/details`}
                              className="text-sm font-medium text-gray-700 hover:underline truncate block"
                              title={allocation.invoice.invoice_number}
                            >
                              {allocation.invoice.invoice_number}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-gray-700 truncate">
                              {allocation.allocation_type === "advance"
                                ? "Advance Payment"
                                : "Allocation"}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            {allocation.allocation_type === "advance"
                              ? "Advance"
                              : "Against Reference"}
                            {allocation.invoice &&
                              ` • ${formatAbsoluteDate(allocation.invoice.invoice_date)}`}
                          </p>
                          {allocation.invoice && (
                            <p className="text-xs text-gray-500">
                              Total:{" "}
                              {formatCurrency(
                                allocation.invoice.total_amount ?? 0,
                              )}
                            </p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-700 shrink-0">
                          {formatCurrency(allocation.amount_applied || 0)}
                        </p>
                      </li>
                    ))}
                  </ul>

                  {/* Financial Breakdown */}
                  <div className="space-y-4 pt-3 mt-6 border-t border-border">
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Total Amount</span>
                      <span className="font-semibold">
                        {formatCurrency(payment.total_amount || 0)}
                      </span>
                    </div>

                    {payment.tds_applicable && (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>TDS Deducted</span>
                        <span className="font-semibold">
                          -{formatCurrency(payment.tds_amount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between font-semibold text-gray-700 pt-2 border-t">
                      <span>Net Amount</span>
                      <span className="font-semibold">
                        {formatCurrency(payment.net_amount || 0)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Section>
          {/* Party Section */}
          <Section
            title={payment.party_ledger?.name || "Unknown Party"}
            subtitle={
              payment.voucher_type === "receipt" ? "Received from" : "Paid to"
            }
            icon={() => <IconUsers />}
          />

          {/* Payment Information Section */}
          <Section
            title="Payment Information"
            subtitle="Date and mode details"
            icon={() => <IconCalendar />}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Payment Date</span>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(payment.payment_date)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Payment Mode</span>
                <span className="font-semibold text-gray-700 capitalize">
                  {payment.payment_mode}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Bank/Cash Account</span>
                <span className="font-semibold text-gray-700">
                  {payment.counter_ledger?.name || "-"}
                </span>
              </div>

              {payment.reference_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Reference Number</span>
                  <span className="font-semibold text-gray-700">
                    {payment.reference_number}
                  </span>
                </div>
              )}

              {payment.reference_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Reference Date</span>
                  <span className="font-semibold text-gray-700">
                    {formatAbsoluteDate(payment.reference_date)}
                  </span>
                </div>
              )}
            </div>
          </Section>

          {/* Notes Section */}
          <Section
            title="Notes"
            subtitle={
              !payment.notes && !payment.cancellation_reason
                ? "No note added"
                : ""
            }
            icon={() => <IconNote />}
          >
            {payment.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Payment notes
                </p>
                <p className="text-sm text-gray-700">{payment.notes}</p>
              </div>
            )}
            {payment.cancellation_reason && payment.is_cancelled && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Cancellation reason
                </p>
                <p className="text-sm text-gray-700">
                  {payment.cancellation_reason}
                </p>
              </div>
            )}
          </Section>

          {/* Export Status */}
          {payment.exported_to_tally_at && (
            <Section
              title="Export Status"
              subtitle=""
              icon={() => <IconFileInvoice />}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Exported to Tally</span>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(payment.exported_to_tally_at)}
                </span>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <ActionsFooter items={footerItems} />

      {/* Cancel Dialog */}
      {payment && (
        <CancelDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleCancel}
          title={`Cancel ${paymentTypeLabel.toLowerCase()}`}
          message={`Are you sure you want to cancel ${payment.payment_number}? This action cannot be undone.`}
          loading={cancelPayment.isPending}
        />
      )}

      {/* Delete Dialog */}
      {payment && (
        <DeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title={`Delete ${paymentTypeLabel.toLowerCase()}`}
          message={`Are you sure you want to delete ${payment.payment_number}? This action cannot be undone.`}
          loading={deletePayment.isPending}
        />
      )}
    </div>
  );
}
