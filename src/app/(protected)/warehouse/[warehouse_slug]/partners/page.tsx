"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Fab } from "@/components/ui/fab";
import { TabPills } from "@/components/ui/tab-pills";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import ImageWrapper from "@/components/ui/image-wrapper";
import { PartnerFormSheet } from "./PartnerFormSheet";
import { usePartnersWithStats } from "@/lib/query/hooks/partners";
import { useSession } from "@/contexts/session-context";
import { getInitials } from "@/lib/utils/initials";
import type { PartnerType } from "@/types/database/enums";
import { getPartnerName, getPartnerInfo } from "@/lib/utils/partner";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardActions } from "@/components/layouts/card-actions";
import { getPartnerActions } from "@/lib/utils/action-menu";
import { formatCurrency } from "@/lib/utils/currency";
import type { PartnerWithStatsListView } from "@/types/partners.types";

const PARTNER_TYPES: { value: PartnerType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "customer", label: "Customer" },
  { value: "supplier", label: "Supplier" },
  { value: "vendor", label: "Vendor" },
  { value: "agent", label: "Agent" },
];

export default function PartnersPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [selectedType, setSelectedType] = useState<PartnerType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePartner, setShowCreatePartner] = useState(false);

  // Fetch all partners with stats using TanStack Query
  const {
    data: allPartners = [],
    isLoading: loading,
    isError: error,
    refetch,
  } = usePartnersWithStats({
    partner_type: selectedType === "all" ? undefined : selectedType,
  });

  // Filter partners by search query
  const filteredPartners = allPartners.filter((partner) => {
    const name = getPartnerName(partner);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handler functions
  const handleEdit = (partner: PartnerWithStatsListView) => {
    router.push(`/warehouse/${warehouse.slug}/partners/${partner.id}/edit`);
  };

  const handleDelete = (partner: PartnerWithStatsListView) => {
    // TODO: Show delete dialog
    console.log("Delete partner:", partner.id);
  };

  const handleCreateSalesOrder = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouse.slug}/sales-orders/create?customer=${partner.id}`,
    );
  };

  const handleCreatePurchaseOrder = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouse.slug}/purchase-orders/create?supplier=${partner.id}`,
    );
  };

  const handleCreateSalesInvoice = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouse.slug}/invoices/create/sales?partner=${partner.id}`,
    );
  };

  const handleCreatePurchaseInvoice = (partner: PartnerWithStatsListView) => {
    router.push(
      `/warehouse/${warehouse.slug}/invoices/create/purchase?partner=${partner.id}`,
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
  if (loading) {
    return <LoadingState message="Loading partners..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load partners"
        message="Unable to fetch partners"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Partners</h1>
            {/* <p className="text-sm text-gray-500 mt-1"> */}
            {/*   <span className="text-teal-700 font-medium">₹40,000 sales</span> */}
            {/*   {" • "} */}
            {/*   <span className="text-yellow-700 font-medium"> */}
            {/*     ₹20,000 purchase */}
            {/*   </span> */}
            {/*   {" in past month"} */}
            {/* </p> */}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search for partner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/mascot/partner-handshake.png"
            alt="Partners"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filter */}
      <div className="px-4 py-4">
        <TabPills
          options={PARTNER_TYPES}
          value={selectedType}
          onValueChange={(value) =>
            setSelectedType(value as PartnerType | "all")
          }
        />
      </div>

      {/* Partner List */}
      <div className="flex-1 overflow-y-auto">
        {filteredPartners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No partners found</p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search"
                : `Add your first ${selectedType === "all" ? "partner" : selectedType.toLowerCase()}`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col border-b border-border">
            {filteredPartners.map((partner) => {
              const partnerName = getPartnerName(partner);
              const partnerInfo = getPartnerInfo(partner);
              const partnerType = partner.partner_type as PartnerType;

              // Calculate outstanding amount and label based on partner type
              const isReceivable = partnerType === "customer";
              const outstandingAmount = isReceivable
                ? partner.receivables_aggregates?.total_outstanding_amount || 0
                : partnerType === "supplier" || partnerType === "vendor"
                  ? partner.payables_aggregates?.total_outstanding_amount || 0
                  : 0;
              const outstandingLabel = isReceivable ? "to receive" : "to pay";
              const outstandingColor = isReceivable
                ? "text-teal-700"
                : "text-yellow-700";

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
                        `/warehouse/${warehouse.slug}/partners/${partner.id}`,
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
                    {outstandingAmount > 0 && (
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold ${outstandingColor}`}
                        >
                          {formatCurrency(outstandingAmount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {outstandingLabel}
                        </p>
                      </div>
                    )}
                  </button>

                  {/* Action Buttons */}
                  <CardActions items={actionItems} maxVisibleActions={2} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Fab
        onClick={() => setShowCreatePartner(true)}
        className="fixed bottom-20 right-4"
      />

      {/* Add Partner Sheet */}
      {showCreatePartner && (
        <PartnerFormSheet
          key="new-partner"
          open={showCreatePartner}
          onOpenChange={setShowCreatePartner}
        />
      )}
    </div>
  );
}
