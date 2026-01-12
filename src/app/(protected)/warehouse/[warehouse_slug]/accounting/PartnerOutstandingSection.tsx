"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { CardActions } from "@/components/layouts/card-actions";
import { DashboardSectionSkeleton } from "@/components/layouts/dashboard-section-skeleton";
import { formatCurrency } from "@/lib/utils/currency";
import { getPartnerName, getPartnerInfo } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";
import { getPartnerActions } from "@/lib/utils/action-menu";
import { usePartnersWithStats } from "@/lib/query/hooks/partners";
import type { PartnerWithStatsListView } from "@/types/partners.types";

interface PartnerOutstandingSectionProps {
  title: string;
  subtitle: string;
  partnerType: "customer" | "supplier";
  warehouseSlug: string;
}

export function PartnerOutstandingSection({
  title,
  subtitle,
  partnerType,
  warehouseSlug,
}: PartnerOutstandingSectionProps) {
  const router = useRouter();

  // Fetch partners with stats, sorted by outstanding amount
  const {
    data: partners = [],
    isLoading,
    isError,
  } = usePartnersWithStats({
    partner_type: partnerType,
    limit: 5,
    order_by:
      partnerType === "customer"
        ? "receivables_aggregates.total_outstanding_amount"
        : "payables_aggregates.total_outstanding_amount",
    order_direction: "desc",
  });

  // Handler functions
  const handleEdit = (partner: PartnerWithStatsListView) => {
    router.push(`/warehouse/${warehouseSlug}/partners/${partner.id}/edit`);
  };

  const handleDelete = (partner: PartnerWithStatsListView) => {
    // TODO: Show delete dialog
    console.log("Delete partner:", partner.id);
  };

  const handleCreateSalesOrder = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouseSlug}/sales-orders/create?customer=${partner.id}`,
    );
  };

  const handleCreatePurchaseOrder = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouseSlug}/purchase-orders/create?supplier=${partner.id}`,
    );
  };

  const handleCreateSalesInvoice = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouseSlug}/invoices/create/sales?partner=${partner.id}`,
    );
  };

  const handleCreatePurchaseInvoice = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouseSlug}/invoices/create/purchase?partner=${partner.id}`,
    );
  };

  const handleRecordReceipt = (partner: PartnerWithStatsListView) => {
    // TODO: Open payment modal with receipt type
    console.log("Record receipt for partner:", partner.id);
  };

  const handleRecordPayment = (partner: PartnerWithStatsListView) => {
    // TODO: Open payment modal with payment type
    console.log("Record payment for partner:", partner.id);
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
          <p className="text-sm text-red-500">Failed to load partners</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-6">
      <div className="flex items-center justify-between px-4 py-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            router.push(
              `/warehouse/${warehouseSlug}/partners?type=${partnerType}`,
            )
          }
        >
          View all →
        </Button>
      </div>

      {partners.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">
            No outstanding {subtitle.toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="flex flex-col border-b border-border">
          {partners.map((partner) => {
            const partnerName = getPartnerName(partner);
            const partnerInfo = getPartnerInfo(partner);
            const outstandingAmount =
              partnerType === "customer"
                ? partner.receivables_aggregates?.total_outstanding_amount || 0
                : partner.payables_aggregates?.total_outstanding_amount || 0;

            // Get action items for this partner
            const actionItems = getPartnerActions(partner, {
              onEdit: () => handleEdit(partner),
              onDelete: () => handleDelete(partner),
              onCreateSalesOrder:
                partner.partner_type === "customer"
                  ? () => handleCreateSalesOrder(partner)
                  : undefined,
              onCreatePurchaseOrder:
                partner.partner_type === "supplier" ||
                partner.partner_type === "vendor"
                  ? () => handleCreatePurchaseOrder(partner)
                  : undefined,
              onCreateSalesInvoice:
                partner.partner_type === "customer"
                  ? () => handleCreateSalesInvoice(partner)
                  : undefined,
              onCreatePurchaseInvoice:
                partner.partner_type === "supplier" ||
                partner.partner_type === "vendor"
                  ? () => handleCreatePurchaseInvoice(partner)
                  : undefined,
              onRecordReceipt:
                partner.partner_type === "customer"
                  ? () => handleRecordReceipt(partner)
                  : undefined,
              onRecordPayment:
                partner.partner_type === "supplier" ||
                partner.partner_type === "vendor"
                  ? () => handleRecordPayment(partner)
                  : undefined,
            });

            return (
              <div
                key={partner.id}
                className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300"
              >
                <button
                  onClick={() =>
                    router.push(
                      `/warehouse/${warehouseSlug}/partners/${partner.id}`,
                    )
                  }
                  className="flex items-center gap-3 text-left hover:cursor-pointer"
                >
                  {/* Partner Image */}
                  <ImageWrapper
                    size="md"
                    shape="circle"
                    imageUrl={partner.image_url || undefined}
                    alt={partnerName}
                    placeholderInitials={getInitials(partnerName)}
                  />

                  {/* Partner Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={partnerName}
                      className="text-base font-medium text-gray-700 truncate"
                    >
                      {partnerName}
                    </p>
                    <p
                      title={partnerInfo}
                      className="text-sm text-gray-500 truncate"
                    >
                      {partnerInfo}
                    </p>
                  </div>

                  {/* Outstanding Amount */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-700">
                      {formatCurrency(outstandingAmount)}
                    </p>
                    <p className="text-xs text-gray-500">outstanding</p>
                  </div>
                </button>

                {/* Action Buttons */}
                <CardActions items={actionItems} maxVisibleActions={2} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
