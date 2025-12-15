"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconPlus, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageWrapper from "@/components/ui/image-wrapper";
import { usePartners } from "@/lib/query/hooks/partners";
import { getPartnerInfo, getPartnerName } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";
import type { PartnerType } from "@/types/database/enums";
import { PartnerFormSheet } from "@/app/(protected)/warehouse/[warehouse_slug]/partners/PartnerFormSheet";

interface PartnerSelectionStepProps {
  partnerType: PartnerType;
  selectedPartnerId: string | null;
  onSelectPartner: (partnerId: string) => void;
}

export function PartnerSelectionStep({
  partnerType,
  selectedPartnerId,
  onSelectPartner,
}: PartnerSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddPartner, setShowAddPartner] = useState(false);
  const { data: partners = [], isLoading: loading } = usePartners({
    partner_type: partnerType,
  });

  // Dynamic labels based on partner type
  const labels: Record<
    PartnerType,
    {
      title: string;
      newButton: string;
      searchPlaceholder: string;
      loading: string;
      empty: string;
    }
  > = {
    customer: {
      title: "Select customer",
      newButton: "New customer",
      searchPlaceholder: "Search for customer",
      loading: "Loading customers...",
      empty: "No customers found",
    },
    supplier: {
      title: "Select supplier",
      newButton: "New supplier",
      searchPlaceholder: "Search for supplier",
      loading: "Loading suppliers...",
      empty: "No suppliers found",
    },
    agent: {
      title: "Select agent",
      newButton: "New agent",
      searchPlaceholder: "Search for agent",
      loading: "Loading agents...",
      empty: "No agents found",
    },
    vendor: {
      title: "Select vendor",
      newButton: "New vendor",
      searchPlaceholder: "Search for vendor",
      loading: "Loading vendors...",
      empty: "No vendors found",
    },
  };

  const label = labels[partnerType];

  // Filter and sort partners using useMemo
  const filteredPartners = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter partners
    let filtered = partners.filter((partner) => {
      // Search filter (case-insensitive)
      if (query) {
        const fullName =
          `${partner.first_name} ${partner.last_name}`.toLowerCase();
        const companyName = partner.company_name?.toLowerCase() || "";
        const phoneNumber = partner.phone_number?.toLowerCase() || "";

        return (
          fullName.includes(query) ||
          companyName.includes(query) ||
          phoneNumber.includes(query)
        );
      }
      return true;
    });

    // Sort: selected partner first, then alphabetically
    filtered.sort((a, b) => {
      if (a.id === selectedPartnerId) return -1;
      if (b.id === selectedPartnerId) return 1;

      // Sort by company name if exists, otherwise by first name
      const aName = a.company_name || a.first_name;
      const bName = b.company_name || b.first_name;
      return aName.localeCompare(bName);
    });

    return filtered;
  }, [partners, searchQuery, selectedPartnerId]);

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{label.title}</h3>
          <Button variant="ghost" onClick={() => setShowAddPartner(true)}>
            <IconPlus className="size-4" />
            {label.newButton}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder={label.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
        </div>
      </div>

      {/* Partner List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">{label.loading}</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">{label.empty}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredPartners.map((partner) => {
              const isSelected = partner.id === selectedPartnerId;
              const partnerName = getPartnerName(partner);
              const partnerInfo = getPartnerInfo(partner);

              return (
                <button
                  key={partner.id}
                  onClick={() => onSelectPartner(partner.id)}
                  className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
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
                      className="text-xs text-gray-500 truncate"
                    >
                      {partnerInfo}
                    </p>
                  </div>

                  {/* Selection Checkmark */}
                  {isSelected && (
                    <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                      <IconCheck className="size-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Partner Sheet */}
      <PartnerFormSheet
        open={showAddPartner}
        onOpenChange={setShowAddPartner}
        partnerType={partnerType}
      />
    </>
  );
}
