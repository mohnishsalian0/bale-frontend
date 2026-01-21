"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconReceipt,
  IconBuildingWarehouse,
  IconNote,
  IconMapPin,
  IconCalendar,
  IconFileInvoice,
  IconUser,
  IconReceiptRefund,
  IconCurrencyRupee,
} from "@tabler/icons-react";
import ImageWrapper from "@/components/ui/image-wrapper";
import { formatCurrency } from "@/lib/utils/financial";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils/currency";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type {
  MeasuringUnit,
  StockType,
  PaymentMode,
  InvoiceStatus,
} from "@/types/database/enums";
import { Section } from "@/components/layouts/section";
import { getProductIcon } from "@/lib/utils/product";
import {
  useInvoiceBySlug,
  useInvoiceMutations,
} from "@/lib/query/hooks/invoices";
import { usePaymentsByInvoice } from "@/lib/query/hooks/payments";
import { useAdjustmentNotesByInvoice } from "@/lib/query/hooks/adjustment-notes";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { PaymentModeBadge } from "@/components/ui/payment-mode-badge";
import { getPaymentAllocationSummary } from "@/lib/utils/payment";
import { getAdjustmentItemSummary } from "@/lib/utils/adjustment-notes";
import type { PaymentAllocationListView } from "@/types/payments.types";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getInvoiceActions } from "@/lib/utils/action-menu";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { toast } from "sonner";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { InvoiceAllocationModal } from "@/app/(protected)/warehouse/[warehouse_slug]/payments/create/InvoiceAllocationModal";
import type { OutstandingInvoiceView } from "@/types/payments.types";
import { downloadInvoicePDF } from "@/lib/pdf/invoice-pdf-generator";
import { Progress } from "@/components/ui/progress";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    invoice_slug: string;
  }>;
}

export default function InvoiceDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, invoice_slug } = use(params);

  // Fetch invoice using TanStack Query
  const { data: invoice, isLoading, isError } = useInvoiceBySlug(invoice_slug);

  // Invoice mutations
  const { cancel: cancelInvoice, delete: deleteInvoice } =
    useInvoiceMutations();

  // Fetch payments for this invoice
  const { data: payments = [], isLoading: paymentsLoading } =
    usePaymentsByInvoice(invoice?.id || null);

  // Fetch adjustment notes for this invoice
  const { data: adjustmentNotesResult, isLoading: adjustmentsLoading } =
    useAdjustmentNotesByInvoice(invoice?.id || null, 1, 100);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInvoice, setPaymentInvoice] =
    useState<OutstandingInvoiceView | null>(null);

  const adjustmentNotes = adjustmentNotesResult?.data || [];

  // Calculate financial breakdown
  const financials = useMemo(() => {
    if (!invoice) return null;

    const subtotal = invoice.subtotal_amount || 0;
    const discountAmount = invoice.discount_amount || 0;
    const taxableAmount = invoice.taxable_amount || 0;
    const cgst = invoice.total_cgst_amount || 0;
    const sgst = invoice.total_sgst_amount || 0;
    const igst = invoice.total_igst_amount || 0;
    const totalTax = cgst + sgst + igst;
    const totalAmount = invoice.total_amount || 0;

    return {
      subtotal,
      discountAmount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      totalAmount,
    };
  }, [invoice]);

  const invoiceTypeLabel =
    invoice?.invoice_type === "sales" ? "Sales invoice" : "Purchase invoice";

  // Calculate payment progress and color
  const paymentProgress = useMemo((): {
    percentage: number;
    color: "blue" | "yellow";
    showBar: boolean;
  } => {
    if (!invoice) return { percentage: 0, color: "blue", showBar: false };

    const totalAmount = invoice.total_amount || 0;
    const outstandingAmount = invoice.outstanding_amount || 0;
    const paidAmount = totalAmount - outstandingAmount;
    const percentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

    const showBar =
      invoice.status === "partially_paid" || invoice.status === "overdue";
    const color = invoice.status === "overdue" ? "yellow" : "blue";

    return { percentage, color, showBar };
  }, [invoice]);

  const handleCancel = (reason: string) => {
    if (!invoice) return;
    cancelInvoice.mutate(
      { invoiceId: invoice.id, reason },
      {
        onSuccess: () => {
          toast.success(`${invoiceTypeLabel} cancelled successfully`);
          setShowCancelDialog(false);
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

  const handleDelete = () => {
    if (!invoice) return;
    deleteInvoice.mutate(invoice.id, {
      onSuccess: () => {
        toast.success(`${invoiceTypeLabel} deleted successfully`);
        router.push(`/warehouse/${warehouse_slug}/invoices`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting invoice:", error);
        toast.error(`Failed to delete ${invoiceTypeLabel.toLowerCase()}`);
      },
    });
  };

  const handleMakePayment = () => {
    if (!invoice) return;

    // Create OutstandingInvoiceView object for modal
    const invoiceForPayment: OutstandingInvoiceView = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      slug: invoice.slug,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date,
      invoice_type: invoice.invoice_type,
      outstanding_amount: invoice.outstanding_amount || 0,
      total_amount: invoice.total_amount,
      status: invoice.status,
    };

    setPaymentInvoice(invoiceForPayment);
    setShowPaymentModal(true);
  };

  const handleAllocatePayment = (amount: number) => {
    if (!invoice) return;

    // Determine payment type based on invoice type
    const paymentType =
      invoice.invoice_type === "sales" ? "receipt" : "payment";

    // Build URL params
    const params = new URLSearchParams({
      from_invoice: "true",
      party_ledger_id: invoice.party_ledger_id || "",
      invoice_id: invoice.id,
      invoice_slug: invoice.slug,
      allocation_amount: amount.toString(),
    });

    // Navigate to payment create page
    router.push(
      `/warehouse/${warehouse_slug}/payments/create/${paymentType}/against_ref?${params.toString()}`,
    );
  };

  const handleDownload = async () => {
    if (!invoice) return;
    try {
      await downloadInvoicePDF(invoice);
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    }
  };

  // Footer action items
  const footerItems = invoice
    ? getInvoiceActions(invoice, {
        onMakePayment: handleMakePayment,
        onDownload: handleDownload,
        onCreateAdjustment: () => {
          const adjustmentType =
            invoice.invoice_type === "sales" ? "credit" : "debit";
          router.push(
            `/warehouse/${warehouse_slug}/adjustment-notes/create/${adjustmentType}?invoice_number=${invoice.invoice_number}`,
          );
        },
        onEdit: () => {
          router.push(
            `/warehouse/${warehouse_slug}/invoices/${invoice_slug}/edit`,
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

  if (isLoading || paymentsLoading || adjustmentsLoading) {
    return <LoadingState message="Loading invoice details..." />;
  }

  if (isError || !invoice) {
    return (
      <ErrorState
        title="Could not load invoice"
        message="An error occurred while fetching the invoice details."
        onRetry={() => router.refresh()}
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
                className={`text-2xl font-bold ${invoice.status === "cancelled" ? "text-gray-400" : "text-gray-900"}`}
              >
                {invoice.invoice_number}
              </h1>
              <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {invoiceTypeLabel}
              {invoice.invoice_date &&
                ` • ${formatAbsoluteDate(invoice.invoice_date)}`}
              {invoice.due_date &&
                ` • Due on ${formatAbsoluteDate(invoice.due_date)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-700">
              ₹{formatCurrency(financials?.totalAmount || 0)}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        {paymentProgress.showBar && invoice.outstanding_amount !== null && (
          <div className="mt-4 max-w-sm">
            <p className="text-sm text-gray-700 mb-1">
              Outstanding: ₹{formatCurrency(invoice.outstanding_amount)}
            </p>
            <Progress
              color={paymentProgress.color}
              value={paymentProgress.percentage}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {/* Payments Section */}
          <Section
            title="Payments"
            subtitle={`${payments.length} payment${payments.length !== 1 ? "s" : ""}`}
            icon={() => <IconCurrencyRupee />}
          >
            {payments.length > 0 && (
              <div className="flex flex-col">
                {payments.map((payment) => {
                  const isAdvance =
                    payment.payment_allocations.length === 0 ||
                    payment.payment_allocations.every(
                      (alloc: PaymentAllocationListView) =>
                        alloc.allocation_type === "advance",
                    );
                  const allocationSummary = getPaymentAllocationSummary(
                    payment.payment_allocations,
                  );
                  const showAllocationSummary = !isAdvance && allocationSummary;
                  const tdsInfo =
                    payment.tds_amount && payment.tds_amount > 0
                      ? `TDS: ${formatCurrencyUtil(payment.tds_amount)}`
                      : "";

                  return (
                    <button
                      key={payment.id}
                      onClick={() =>
                        router.push(
                          `/warehouse/${warehouse_slug}/payments/${payment.slug}`,
                        )
                      }
                      className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-700">
                              {payment.party_ledger?.name || "N/A"}
                            </p>
                            <PaymentModeBadge
                              mode={payment.payment_mode as PaymentMode}
                            />
                          </div>

                          <p className="text-sm font-semibold text-gray-700">
                            {formatCurrencyUtil(payment.total_amount || 0)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-500 text-left">
                            {isAdvance ? "Advance" : "Against"}
                            {showAllocationSummary && (
                              <span className="ml-1 text-gray-500">
                                {allocationSummary}
                              </span>
                            )}
                          </p>

                          {tdsInfo && (
                            <p className="text-xs text-gray-500">{tdsInfo}</p>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mt-1 text-left">
                          {payment.payment_number}
                          {` • ${formatAbsoluteDate(payment.payment_date)}`}
                        </p>

                        {(payment.instrument_number || payment.transaction_id) && (
                          <p className="text-xs text-gray-500 mt-1 text-left">
                            {payment.instrument_number && `Inst: ${payment.instrument_number}`}
                            {payment.transaction_id && `TXN: ${payment.transaction_id}`}
                            {payment.instrument_date &&
                              ` • Date: ${formatAbsoluteDate(payment.instrument_date)}`}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          <Section
            title="Adjustments"
            subtitle={`${adjustmentNotes.length} adjustment${adjustmentNotes.length !== 1 ? "s" : ""}`}
            icon={() => <IconReceiptRefund />}
          >
            {adjustmentNotes.length > 0 && (
              <div className="flex flex-col">
                {adjustmentNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() =>
                      router.push(
                        `/warehouse/${warehouse_slug}/adjustment-notes/${note.slug}/details`,
                      )
                    }
                    className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-700">
                          {note.adjustment_number}
                        </p>

                        <p className="text-sm font-semibold text-gray-700">
                          {formatCurrencyUtil(note.total_amount)}
                        </p>
                      </div>

                      <p className="text-sm text-gray-500 text-left">
                        {getAdjustmentItemSummary(note.adjustment_note_items)}
                      </p>

                      <p className="text-xs text-gray-500 text-left">
                        {formatAbsoluteDate(note.adjustment_date)}
                      </p>

                      <p
                        className="text-xs text-gray-500 truncate text-left"
                        title={note.reason}
                      >
                        {note.reason}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* Line Items Section */}
          <Section
            title={`${invoice.invoice_items.length} items at ₹${formatCurrency(financials?.totalAmount || 0)}`}
            subtitle="Line items"
            icon={() => <IconReceipt />}
          >
            <div>
              <ul className="space-y-6">
                {invoice.invoice_items.map((item) => (
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
                        {item.quantity}{" "}
                        {getMeasuringUnitAbbreviation(
                          item.product?.measuring_unit as MeasuringUnit,
                        )}{" "}
                        × ₹{item.rate.toFixed(2)}
                      </p>
                      {item.gst_rate && item.gst_rate > 0 ? (
                        <p className="text-xs text-gray-500 mt-0.5">
                          GST: {item.gst_rate}%
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-gray-700 shrink-0">
                      ₹{formatCurrency(item.amount || 0)}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Financial Breakdown */}
              {financials && (
                <div className="space-y-4 pt-3 mt-6 border-t border-border">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold">
                      ₹{formatCurrency(financials.subtotal)}
                    </span>
                  </div>

                  {financials.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>
                        Discount
                        {invoice.discount_type === "percentage" &&
                          ` (${invoice.discount_value}%)`}
                      </span>
                      <span className="font-semibold text-green-600">
                        -₹{formatCurrency(financials.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Taxable Amount</span>
                    <span className="font-semibold">
                      ₹{formatCurrency(financials.taxableAmount)}
                    </span>
                  </div>

                  {invoice.tax_type === "gst" &&
                    (financials.cgst > 0 || financials.sgst > 0) && (
                      <>
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>CGST</span>
                          <span className="font-semibold">
                            ₹{formatCurrency(financials.cgst)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>SGST</span>
                          <span className="font-semibold">
                            ₹{formatCurrency(financials.sgst)}
                          </span>
                        </div>
                      </>
                    )}

                  {invoice.tax_type === "igst" && financials.igst > 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>IGST</span>
                      <span className="font-semibold">
                        ₹{formatCurrency(financials.igst)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-gray-700 pt-2 border-t">
                    <span>Total</span>
                    <span className="font-semibold">
                      ₹{formatCurrency(financials.totalAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Party Section (Customer for sales, Supplier for purchase) */}
          <Section
            title={
              invoice.party_name ||
              invoice.party_display_name ||
              "Unknown Party"
            }
            subtitle={
              invoice.invoice_type === "sales" ? "Customer" : "Supplier"
            }
            icon={() => <IconUser />}
          >
            <div className="space-y-3">
              {/* Billing Address */}
              {(invoice.party_billing_address_line1 || invoice.party_billing_address_line2) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 flex items-center gap-1.5">
                    <IconMapPin className="size-4 text-gray-700" />
                    Billing address
                  </span>
                  <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                    {invoice.party_billing_address_line1 && (
                      <p>{invoice.party_billing_address_line1}</p>
                    )}
                    {invoice.party_billing_address_line2 && (
                      <p>{invoice.party_billing_address_line2}</p>
                    )}
                    {invoice.party_billing_city &&
                      invoice.party_billing_state &&
                      invoice.party_billing_pincode && (
                        <p>
                          {invoice.party_billing_city}, {invoice.party_billing_state} -{" "}
                          {invoice.party_billing_pincode}
                        </p>
                      )}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {(invoice.party_shipping_address_line1 || invoice.party_shipping_address_line2) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 flex items-center gap-1.5">
                    <IconMapPin className="size-4 text-gray-700" />
                    Shipping address
                  </span>
                  <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                    {invoice.party_shipping_address_line1 && (
                      <p>{invoice.party_shipping_address_line1}</p>
                    )}
                    {invoice.party_shipping_address_line2 && (
                      <p>{invoice.party_shipping_address_line2}</p>
                    )}
                    {invoice.party_shipping_city &&
                      invoice.party_shipping_state &&
                      invoice.party_shipping_pincode && (
                        <p>
                          {invoice.party_shipping_city}, {invoice.party_shipping_state} -{" "}
                          {invoice.party_shipping_pincode}
                        </p>
                      )}
                  </div>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-gray-700">GSTIN</span>
                <span className="font-semibold text-gray-700">
                  {invoice.party_gst_number || "-"}
                </span>
              </div>
            </div>
          </Section>

          {/* Invoice Details Section */}
          <Section
            title="Invoice Information"
            subtitle="Dates and terms"
            icon={() => <IconFileInvoice />}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <IconCalendar className="size-4 text-gray-700" />
                  <span>Invoice Date</span>
                </div>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(invoice.invoice_date)}
                </span>
              </div>

              {invoice.due_date && (
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <IconCalendar className="size-4 text-gray-700" />
                    <span>Due Date</span>
                  </div>
                  <span className="font-semibold text-gray-700">
                    {formatAbsoluteDate(invoice.due_date)}
                  </span>
                </div>
              )}

              {invoice.payment_terms && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Payment Terms</span>
                  <span className="font-semibold text-gray-700">
                    {invoice.payment_terms}
                  </span>
                </div>
              )}

              {invoice.tax_type && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Tax Type</span>
                  <span className="font-semibold text-gray-700">
                    {invoice.tax_type === "no_tax"
                      ? "No Tax"
                      : invoice.tax_type === "gst"
                        ? "GST (CGST + SGST)"
                        : "IGST"}
                  </span>
                </div>
              )}

              {/* Supplier Invoice Details (Purchase Only) */}
              {invoice.invoice_type === "purchase" &&
                invoice.supplier_invoice_number && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Supplier Invoice #</span>
                      <span className="font-semibold text-gray-700">
                        {invoice.supplier_invoice_number}
                      </span>
                    </div>
                    {invoice.supplier_invoice_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700">
                          Supplier Invoice Date
                        </span>
                        <span className="font-semibold text-gray-700">
                          {formatAbsoluteDate(invoice.supplier_invoice_date)}
                        </span>
                      </div>
                    )}
                  </>
                )}
            </div>
          </Section>

          {/* Warehouse Section */}
          <Section
            title={invoice.warehouse_name || "Unknown Warehouse"}
            subtitle="Warehouse"
            icon={() => <IconBuildingWarehouse />}
          >
            {(invoice.warehouse_address_line1 ||
              invoice.warehouse_address_line2) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <IconMapPin className="size-4 text-gray-700" />
                  Address
                </span>
                <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                  {invoice.warehouse_address_line1 && (
                    <p>{invoice.warehouse_address_line1}</p>
                  )}
                  {invoice.warehouse_address_line2 && (
                    <p>{invoice.warehouse_address_line2}</p>
                  )}
                  {invoice.warehouse_city &&
                    invoice.warehouse_state &&
                    invoice.warehouse_pincode && (
                      <p>
                        {invoice.warehouse_city}, {invoice.warehouse_state} -{" "}
                        {invoice.warehouse_pincode}
                      </p>
                    )}
                </div>
              </div>
            )}
            {invoice.company_gst_number && (
              <div className="flex justify-between text-sm mt-3">
                <span className="text-gray-700">GSTIN</span>
                <span className="font-semibold text-gray-700">
                  {invoice.company_gst_number}
                </span>
              </div>
            )}
          </Section>

          {/* Notes Section */}
          <Section
            title="Notes"
            subtitle={
              !invoice.notes && !invoice.cancellation_reason
                ? "No note added"
                : ""
            }
            icon={() => <IconNote />}
          >
            {invoice.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Invoice notes
                </p>
                <p className="text-sm text-gray-700">{invoice.notes}</p>
              </div>
            )}
            {invoice.cancellation_reason && invoice.is_cancelled && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Cancellation reason
                </p>
                <p className="text-sm text-gray-700">
                  {invoice.cancellation_reason}
                </p>
              </div>
            )}
          </Section>

          {/* Export Status */}
          {invoice.exported_to_tally_at && (
            <Section
              title="Export Status"
              subtitle=""
              icon={() => <IconFileInvoice />}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Exported to Tally</span>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(invoice.exported_to_tally_at)}
                </span>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <ActionsFooter items={footerItems} />

      {/* Cancel Dialog */}
      <CancelDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onConfirm={handleCancel}
        title={`Cancel ${invoiceTypeLabel.toLowerCase()}`}
        message={`Are you sure you want to cancel ${invoice.invoice_number}? This action cannot be undone.`}
        loading={cancelInvoice.isPending}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        title={`Delete ${invoiceTypeLabel.toLowerCase()}`}
        message={`Are you sure you want to delete ${invoice.invoice_number}? This action cannot be undone.`}
        loading={deleteInvoice.isPending}
      />

      {/* Payment Allocation Modal */}
      <InvoiceAllocationModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        invoice={paymentInvoice}
        onAllocate={handleAllocatePayment}
      />
    </div>
  );
}
