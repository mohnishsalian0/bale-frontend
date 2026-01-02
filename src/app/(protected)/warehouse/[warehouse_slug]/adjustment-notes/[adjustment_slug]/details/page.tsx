"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconReceipt,
  IconUsers,
  IconBuildingWarehouse,
  IconNote,
  IconMapPin,
  IconCalendar,
  IconFileInvoice,
} from "@tabler/icons-react";
import ImageWrapper from "@/components/ui/image-wrapper";
import { formatCurrency } from "@/lib/utils/currency";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { Section } from "@/components/layouts/section";
import { getProductIcon } from "@/lib/utils/product";
import {
  useAdjustmentNoteBySlug,
  useAdjustmentNoteMutations,
} from "@/lib/query/hooks/adjustment-notes";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getAdjustmentNoteActions } from "@/lib/utils/action-menu";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { toast } from "sonner";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    adjustment_slug: string;
  }>;
}

export default function AdjustmentNoteDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, adjustment_slug } = use(params);

  const {
    data: adjustmentNote,
    isLoading: loading,
    isError: error,
  } = useAdjustmentNoteBySlug(adjustment_slug);

  // Adjustment note mutations
  const { cancel: cancelAdjustmentNote, remove: deleteAdjustmentNote } =
    useAdjustmentNoteMutations();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Calculate financial totals
  const financials = useMemo(() => {
    if (!adjustmentNote) return null;

    const taxableAmount = adjustmentNote.subtotal_amount || 0;
    const cgst = adjustmentNote.total_cgst_amount || 0;
    const sgst = adjustmentNote.total_sgst_amount || 0;
    const igst = adjustmentNote.total_igst_amount || 0;
    const totalTax = adjustmentNote.total_tax_amount || 0;
    const roundOff = adjustmentNote.round_off_amount || 0;
    const totalAmount = adjustmentNote.total_amount || 0;

    return {
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalTax,
      roundOff,
      totalAmount,
    };
  }, [adjustmentNote]);

  const adjustmentTypeLabel =
    adjustmentNote?.adjustment_type === "credit" ? "Credit note" : "Debit note";

  const handleCancel = (reason: string) => {
    if (!adjustmentNote) return;
    cancelAdjustmentNote.mutate(
      { id: adjustmentNote.id, reason },
      {
        onSuccess: () => {
          toast.success(`${adjustmentTypeLabel} cancelled successfully`);
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling adjustment note:", error);
          toast.error(
            `Failed to cancel ${adjustmentTypeLabel.toLowerCase()}: ${error.message}`,
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (!adjustmentNote) return;
    deleteAdjustmentNote.mutate(adjustmentNote.id, {
      onSuccess: () => {
        toast.success(`${adjustmentTypeLabel} deleted successfully`);
        router.push(`/warehouse/${warehouse_slug}/adjustment-notes`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting adjustment note:", error);
        toast.error(`Failed to delete ${adjustmentTypeLabel.toLowerCase()}`);
      },
    });
  };

  // Footer action items
  const footerItems = adjustmentNote
    ? getAdjustmentNoteActions(adjustmentNote, {
        onEdit: () => {
          router.push(
            `/warehouse/${warehouse_slug}/adjustment-notes/${adjustment_slug}/edit`,
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
    return <LoadingState message="Loading adjustment note details..." />;
  }

  // Error state
  if (error || !adjustmentNote) {
    return (
      <ErrorState
        title="Failed to load adjustment note"
        message="Could not load the adjustment note details"
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
                className={`text-2xl font-bold ${adjustmentNote.is_cancelled ? "text-gray-400" : "text-gray-900"}`}
              >
                {adjustmentNote.adjustment_number}
              </h1>
              {adjustmentNote.is_cancelled && (
                <Badge color="gray">Cancelled</Badge>
              )}
              {adjustmentNote.exported_to_tally_at && (
                <Badge variant="secondary" color="blue">
                  Exported to Tally
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {adjustmentTypeLabel}
              {adjustmentNote.adjustment_date &&
                ` • ${formatAbsoluteDate(adjustmentNote.adjustment_date)}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-700">
              {formatCurrency(financials?.totalAmount || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Rest of sections in padded container */}
        <div className="flex flex-col gap-3 p-4">
          {/* Referenced Invoice Section */}
          {adjustmentNote.invoice && (
            <Section
              title={adjustmentNote.invoice.invoice_number || ""}
              subtitle="Referenced invoice"
              icon={() => <IconFileInvoice />}
            >
              <Link
                href={`/warehouse/${warehouse_slug}/invoices/${adjustmentNote.invoice.slug || ""}`}
                className="text-sm text-blue-600 hover:underline"
              >
                View invoice details →
              </Link>
            </Section>
          )}

          {/* Line Items Section */}
          <Section
            title={`${adjustmentNote.adjustment_note_items.length} items at ${formatCurrency(financials?.totalAmount || 0)}`}
            subtitle="Line items"
            icon={() => <IconReceipt />}
          >
            <div>
              <ul className="space-y-6">
                {adjustmentNote.adjustment_note_items.map((item) => (
                  <li key={item.id} className="flex gap-3">
                    <div className="mt-0.5">
                      <ImageWrapper
                        size="sm"
                        shape="square"
                        imageUrl={item.product?.product_images?.[0]}
                        alt={item.product_name || ""}
                        placeholderIcon={getProductIcon(
                          item.product?.stock_type as StockType,
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-gray-700 truncate"
                        title={item.product_name || undefined}
                      >
                        {item.product_name || "Unknown Product"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity}{" "}
                        {getMeasuringUnitAbbreviation(
                          item.product?.measuring_unit as MeasuringUnit,
                        )}{" "}
                        × {formatCurrency(item.rate)}
                      </p>
                      {item.gst_rate && item.gst_rate > 0 && (
                        <p className="text-xs text-gray-500">
                          GST: {item.gst_rate}%
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-700 shrink-0">
                      {formatCurrency(item.amount || 0)}
                    </p>
                  </li>
                ))}
              </ul>

              {/* Financial Breakdown */}
              {financials && (
                <div className="space-y-4 pt-3 mt-6 border-t border-border">
                  <div className="flex justify-between text-sm text-gray-700">
                    <span>Taxable Amount</span>
                    <span className="font-semibold">
                      {formatCurrency(financials.taxableAmount)}
                    </span>
                  </div>

                  {adjustmentNote.tax_type === "gst" &&
                    (financials.cgst > 0 || financials.sgst > 0) && (
                      <>
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>CGST</span>
                          <span className="font-semibold">
                            {formatCurrency(financials.cgst)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-700">
                          <span>SGST</span>
                          <span className="font-semibold">
                            {formatCurrency(financials.sgst)}
                          </span>
                        </div>
                      </>
                    )}

                  {adjustmentNote.tax_type === "igst" &&
                    financials.igst > 0 && (
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>IGST</span>
                        <span className="font-semibold">
                          {formatCurrency(financials.igst)}
                        </span>
                      </div>
                    )}

                  {financials.roundOff !== 0 && (
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Round Off</span>
                      <span className="font-semibold">
                        {financials.roundOff > 0 ? "+" : ""}
                        {formatCurrency(financials.roundOff)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-gray-700 pt-2 border-t">
                    <span>Total</span>
                    <span className="font-semibold">
                      {formatCurrency(financials.totalAmount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Party Section */}
          <Section
            title={
              adjustmentNote.party_name ||
              adjustmentNote.party_display_name ||
              "Unknown Party"
            }
            subtitle={
              adjustmentNote.adjustment_type === "credit"
                ? "Customer"
                : "Supplier"
            }
            icon={() => <IconUsers />}
          >
            <div className="space-y-3">
              {(adjustmentNote.party_address_line1 ||
                adjustmentNote.party_address_line2) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 flex items-center gap-2">
                    <IconMapPin className="size-4" />
                    Address
                  </span>
                  <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                    {adjustmentNote.party_address_line1 && (
                      <p>{adjustmentNote.party_address_line1}</p>
                    )}
                    {adjustmentNote.party_address_line2 && (
                      <p>{adjustmentNote.party_address_line2}</p>
                    )}
                    {adjustmentNote.party_city &&
                      adjustmentNote.party_state &&
                      adjustmentNote.party_pincode && (
                        <p>
                          {adjustmentNote.party_city},{" "}
                          {adjustmentNote.party_state} -{" "}
                          {adjustmentNote.party_pincode}
                        </p>
                      )}
                  </div>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">GSTIN</span>
                <span className="font-semibold text-gray-700">
                  {adjustmentNote.party_gst_number || "-"}
                </span>
              </div>
            </div>
          </Section>

          {/* Adjustment Details Section */}
          <Section
            title="Adjustment details"
            subtitle=""
            icon={() => <IconCalendar />}
          >
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Adjustment Date</span>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(adjustmentNote.adjustment_date)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Adjustment Type</span>
                <span className="font-semibold text-gray-700 capitalize">
                  {adjustmentNote.adjustment_type === "credit"
                    ? "Credit Note"
                    : "Debit Note"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Tax Type</span>
                <span className="font-semibold text-gray-700">
                  {adjustmentNote.tax_type === "no_tax"
                    ? "No Tax"
                    : adjustmentNote.tax_type === "gst"
                      ? "GST (CGST + SGST)"
                      : "IGST"}
                </span>
              </div>
            </div>
          </Section>

          {/* Reason Section */}
          {adjustmentNote.reason && (
            <Section
              title="Reason"
              subtitle={adjustmentNote.reason}
              icon={() => <IconNote />}
            />
          )}

          {/* Warehouse Section */}
          {adjustmentNote.warehouse && (
            <Section
              title={
                adjustmentNote.warehouse_name || adjustmentNote.warehouse.name
              }
              subtitle="Warehouse"
              icon={() => <IconBuildingWarehouse />}
            >
              {(adjustmentNote.warehouse_address_line1 ||
                adjustmentNote.warehouse_address_line2) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 flex items-center gap-2">
                    <IconMapPin className="size-4" />
                    Address
                  </span>
                  <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                    {adjustmentNote.warehouse_address_line1 && (
                      <p>{adjustmentNote.warehouse_address_line1}</p>
                    )}
                    {adjustmentNote.warehouse_address_line2 && (
                      <p>{adjustmentNote.warehouse_address_line2}</p>
                    )}
                    {adjustmentNote.warehouse_city &&
                      adjustmentNote.warehouse_state &&
                      adjustmentNote.warehouse_pincode && (
                        <p>
                          {adjustmentNote.warehouse_city},{" "}
                          {adjustmentNote.warehouse_state} -{" "}
                          {adjustmentNote.warehouse_pincode}
                        </p>
                      )}
                  </div>
                </div>
              )}
              {adjustmentNote.company_gst_number && (
                <div className="flex justify-between text-sm mt-3">
                  <span className="text-gray-700">GSTIN</span>
                  <span className="font-semibold text-gray-700">
                    {adjustmentNote.company_gst_number}
                  </span>
                </div>
              )}
            </Section>
          )}

          {/* Notes Section */}
          <Section
            title="Notes"
            subtitle={
              !adjustmentNote.notes && !adjustmentNote.cancellation_reason
                ? "No note added"
                : ""
            }
            icon={() => <IconNote />}
          >
            {adjustmentNote.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Adjustment notes
                </p>
                <p className="text-sm text-gray-700">{adjustmentNote.notes}</p>
              </div>
            )}
            {adjustmentNote.cancellation_reason &&
              adjustmentNote.is_cancelled && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    Cancellation reason
                  </p>
                  <p className="text-sm text-gray-700">
                    {adjustmentNote.cancellation_reason}
                  </p>
                </div>
              )}
          </Section>

          {/* Export Status */}
          {adjustmentNote.exported_to_tally_at && (
            <Section
              title="Export Status"
              subtitle=""
              icon={() => <IconFileInvoice />}
            >
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Exported to Tally</span>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(adjustmentNote.exported_to_tally_at)}
                </span>
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <ActionsFooter items={footerItems} />

      {/* Cancel Dialog */}
      {adjustmentNote && (
        <CancelDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          onConfirm={handleCancel}
          title={`Cancel ${adjustmentTypeLabel.toLowerCase()}`}
          message={`Are you sure you want to cancel ${adjustmentNote.adjustment_number}? This action cannot be undone.`}
          loading={cancelAdjustmentNote.isPending}
        />
      )}

      {/* Delete Dialog */}
      {adjustmentNote && (
        <DeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={handleDelete}
          title={`Delete ${adjustmentTypeLabel.toLowerCase()}`}
          message={`Are you sure you want to delete ${adjustmentNote.adjustment_number}? This action cannot be undone.`}
          loading={deleteAdjustmentNote.isPending}
        />
      )}
    </div>
  );
}
