"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { Progress } from "@/components/ui/progress";
import { CardActions } from "@/components/layouts/card-actions";
import { DashboardSectionSkeleton } from "@/components/layouts/dashboard-section-skeleton";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { formatCurrency } from "@/lib/utils/currency";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  getInvoiceDisplayStatus,
  getInvoiceItemSummary,
} from "@/lib/utils/invoice";
import { getInvoiceActions } from "@/lib/utils/action-menu";
import { useInvoices, useInvoiceMutations } from "@/lib/query/hooks/invoices";
import { useSession } from "@/contexts/session-context";
import type { InvoiceListView } from "@/types/invoices.types";
import type { InvoiceStatus } from "@/types/database/enums";
import { toast } from "sonner";

interface ActiveInvoicesSectionProps {
  title: string;
  invoiceType: "sales" | "purchase";
  warehouseSlug: string;
}

export function ActiveInvoicesSection({
  title,
  invoiceType,
  warehouseSlug,
}: ActiveInvoicesSectionProps) {
  const router = useRouter();
  const { warehouse } = useSession();

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListView | null>(null);

  // Fetch invoices with status filter
  const {
    data: invoicesResponse,
    isLoading,
    isError,
  } = useInvoices({
    filters: {
      invoice_type: invoiceType,
      warehouse_id: warehouse.id,
      status: ["open", "partially_paid"],
    },
    page: 1,
    pageSize: 5,
  });

  // Mutations
  const { delete: deleteInvoice, cancel: cancelInvoice } = useInvoiceMutations();

  const invoices = invoicesResponse?.data || [];

  // Handler functions
  const handleMakePayment = (invoice: InvoiceListView) => {
    // TODO: Open payment modal
    console.log("Make payment for invoice:", invoice.id);
  };

  const handleDownload = (invoice: InvoiceListView) => {
    // TODO: Download invoice
    console.log("Download invoice:", invoice.id);
  };

  const handleCreateAdjustment = (invoice: InvoiceListView) => {
    const adjustmentType = invoice.invoice_type === "sales" ? "credit" : "debit";
    router.push(
      `/warehouse/${warehouseSlug}/adjustment-notes/create/${adjustmentType}?invoice_number=${invoice.invoice_number}`,
    );
  };

  const handleEdit = (invoice: InvoiceListView) => {
    router.push(`/warehouse/${warehouseSlug}/invoices/${invoice.slug}/edit`);
  };

  const handleDelete = (invoice: InvoiceListView) => {
    setSelectedInvoice(invoice);
    setShowDeleteDialog(true);
  };

  const handleConfirmCancel = (reason: string) => {
    if (!selectedInvoice) return;

    const invoiceTypeLabel =
      selectedInvoice.invoice_type === "sales"
        ? "Sales invoice"
        : "Purchase invoice";

    cancelInvoice.mutate(
      { invoiceId: selectedInvoice.id, reason },
      {
        onSuccess: () => {
          toast.success(`${invoiceTypeLabel} cancelled successfully`);
          setShowCancelDialog(false);
          setSelectedInvoice(null);
        },
        onError: (error) => {
          console.error("Error cancelling invoice:", error);
          toast.error(
            `Failed to cancel ${invoiceTypeLabel.toLowerCase()}: ${error.message}`,
          );
        },
      },
    );
  };

  const handleCancel = (invoice: InvoiceListView) => {
    setSelectedInvoice(invoice);
    setShowCancelDialog(true);
  };

  const handleConfirmDelete = () => {
    if (!selectedInvoice) return;

    const invoiceTypeLabel =
      selectedInvoice.invoice_type === "sales"
        ? "Sales invoice"
        : "Purchase invoice";

    deleteInvoice.mutate(selectedInvoice.id, {
      onSuccess: () => {
        toast.success(`${invoiceTypeLabel} deleted successfully`);
        setShowDeleteDialog(false);
        setSelectedInvoice(null);
      },
      onError: (error) => {
        console.error("Error deleting invoice:", error);
        toast.error(`Failed to delete ${invoiceTypeLabel.toLowerCase()}`);
      },
    });
  };

  // Loading state
  if (isLoading) {
    return <DashboardSectionSkeleton title={title} itemCount={5} />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col mt-6">
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-red-500">Failed to load invoices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-6">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(
              `/warehouse/${warehouseSlug}/invoices?invoice_type=${invoiceType}&status=open,partially_paid`,
            )
          }
        >
          View all →
        </Button>
      </div>

      {invoices.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">
            No active {title.toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="flex flex-col border-b border-border">
          {invoices.map((invoice) => {
            const invoiceStatusData = getInvoiceDisplayStatus(invoice);
            const outstandingInfo =
              invoice.outstanding_amount && invoice.outstanding_amount > 0
                ? `${formatCurrency(invoice.outstanding_amount)} due`
                : "";
            const showProgressBar =
              invoiceStatusData.status === "partially_paid" ||
              invoiceStatusData.status === "overdue";
            const progressBarColor =
              invoiceStatusData.status === "overdue" ? "yellow" : "blue";

            const progressValue =
              (((invoice.total_amount || 0) -
                (invoice.outstanding_amount || 0)) /
                (invoice.total_amount || 1)) *
              100;

            // Get action items for this invoice
            const actionItems = getInvoiceActions(invoice, {
              onMakePayment: () => handleMakePayment(invoice),
              onDownload: () => handleDownload(invoice),
              onCreateAdjustment: () => handleCreateAdjustment(invoice),
              onEdit: () => handleEdit(invoice),
              onDelete: () => handleDelete(invoice),
              onCancel: () => handleCancel(invoice),
            });

            return (
              <div
                key={invoice.id}
                className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300"
              >
                <button
                  onClick={() =>
                    router.push(
                      `/warehouse/${warehouseSlug}/invoices/${invoice.slug}`,
                    )
                  }
                  className="flex flex-col gap-2 text-left hover:cursor-pointer"
                >
                  {/* Title and Status Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium text-gray-700">
                          {invoice.party_name || invoice.party_display_name}
                        </p>
                        <InvoiceStatusBadge
                          status={invoiceStatusData.status as InvoiceStatus}
                          text={invoiceStatusData.text}
                        />
                      </div>

                      {/* Amount */}
                      <p className="text-sm font-semibold text-gray-700">
                        {formatCurrency(invoice.total_amount)}
                      </p>
                    </div>

                    {/* Subtexts spanning full width */}
                    <p className="text-sm text-gray-500 text-left mt-1">
                      {getInvoiceItemSummary(invoice.invoice_items)}
                    </p>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {invoice.invoice_number}
                        {invoice.due_date &&
                          ` • Due on ${formatAbsoluteDate(invoice.due_date)}`}
                      </p>
                      {showProgressBar && (
                        <p className="text-xs text-gray-500">
                          {outstandingInfo}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {showProgressBar && (
                    <Progress color={progressBarColor} value={progressValue} />
                  )}
                </button>

                {/* Action Buttons */}
                <CardActions items={actionItems} maxVisibleActions={2} />
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Dialog */}
      {selectedInvoice && (
        <CancelDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleConfirmCancel}
          title={`Cancel ${selectedInvoice.invoice_type === "sales" ? "sales invoice" : "purchase invoice"}`}
          message={`Are you sure you want to cancel ${selectedInvoice.invoice_number}? This action cannot be undone.`}
          loading={cancelInvoice.isPending}
        />
      )}

      {/* Delete Dialog */}
      {selectedInvoice && (
        <DeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleConfirmDelete}
          title={`Delete ${selectedInvoice.invoice_type === "sales" ? "sales invoice" : "purchase invoice"}`}
          message={`Are you sure you want to delete ${selectedInvoice.invoice_number}? This action cannot be undone.`}
          loading={deleteInvoice.isPending}
        />
      )}
    </div>
  );
}
