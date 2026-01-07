"use client";

import { useState, useMemo } from "react";
import {
  IconSearch,
  IconPlus,
  IconCheck,
  IconBuildingWarehouse,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import ImageWrapper from "@/components/ui/image-wrapper";
import { usePartners } from "@/lib/query/hooks/partners";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { getPartnerInfo, getPartnerName } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";
import type { PartnerType } from "@/types/database/enums";
import { getWarehouseFormattedAddress } from "@/lib/utils/warehouse";

interface PartnerSelectionStepProps {
  partnerTypes: PartnerType | PartnerType[];
  selectedType: "partner" | "warehouse";
  selectedPartnerId: string | null;
  selectedWarehouseId: string | null;
  currentWarehouseId: string;
  onTypeChange: (type: "partner" | "warehouse") => void;
  onSelectPartner: (partnerId: string) => void;
  onSelectWarehouse: (warehouseId: string) => void;
  onAddNewPartner: () => void;
  title?: string;
  buttonLabel?: string;
}

export function PartnerSelectionStep({
  partnerTypes,
  selectedType,
  selectedPartnerId,
  selectedWarehouseId,
  currentWarehouseId,
  onTypeChange,
  onSelectPartner,
  onSelectWarehouse,
  onAddNewPartner,
  title = "Received from / Dispatch to",
  buttonLabel = "New partner",
}: PartnerSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Normalize partnerTypes to array for filter
  const partnerTypeFilter = Array.isArray(partnerTypes)
    ? partnerTypes
    : [partnerTypes];

  const { data: partners = [], isLoading: partnersLoading } = usePartners({
    partner_type: partnerTypeFilter,
  });

  const { data: warehouses = [], isLoading: warehousesLoading } =
    useWarehouses();

  // Filter out current warehouse
  const otherWarehouses = warehouses.filter(
    (wh) => wh.id !== currentWarehouseId,
  );

  const loading = partnersLoading || warehousesLoading;

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
      const aName = a.company_name || a.first_name || "";
      const bName = b.company_name || b.first_name || "";
      return (aName || "").localeCompare(bName || "");
    });

    return filtered;
  }, [partners, searchQuery, selectedPartnerId]);

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {selectedType === "partner" && (
            <Button variant="ghost" onClick={onAddNewPartner}>
              <IconPlus className="size-4" />
              {buttonLabel}
            </Button>
          )}
        </div>

        {/* Radio Pills */}
        <RadioGroup
          value={selectedType}
          onValueChange={(value) =>
            onTypeChange(value as "partner" | "warehouse")
          }
          name="selection-type"
          className="flex-wrap"
        >
          <RadioGroupItem value="partner">Partner</RadioGroupItem>
          <RadioGroupItem value="warehouse">Warehouse</RadioGroupItem>
        </RadioGroup>

        {/* Search - Only for partners */}
        {selectedType === "partner" && (
          <div className="relative">
            <Input
              placeholder="Search for partner"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Content - Conditional based on type */}
      <div className="flex-1 overflow-y-auto">
        {selectedType === "partner" ? (
          // Partner List
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">Loading partners...</p>
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">No partners found</p>
              </div>
            ) : (
              <div className="flex flex-col border-b border-border">
                {filteredPartners.map((partner) => {
                  const isSelected = partner.id === selectedPartnerId;
                  const partnerName = getPartnerName(partner);
                  const partnerInfo = getPartnerInfo(partner);

                  return (
                    <button
                      key={partner.id}
                      onClick={() => onSelectPartner(partner.id)}
                      className="flex items-center gap-3 p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors text-left"
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
          </>
        ) : (
          // Warehouse Dropdown
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">Loading warehouses...</p>
              </div>
            ) : otherWarehouses.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-gray-500">No warehouses found</p>
              </div>
            ) : (
              <div className="flex flex-col border-b border-border">
                {otherWarehouses.map((warehouse) => {
                  const isSelected = warehouse.id === selectedWarehouseId;
                  const formattedAddress =
                    getWarehouseFormattedAddress(warehouse);

                  return (
                    <button
                      key={warehouse.id}
                      onClick={() => onSelectWarehouse(warehouse.id)}
                      className="flex items-center gap-3 p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center bg-gray-100">
                        <IconBuildingWarehouse className="size-6 text-gray-500" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-base font-medium text-gray-700 truncate"
                          title={warehouse.name}
                        >
                          {warehouse.name}
                        </div>
                        <div
                          className="text-sm text-gray-500 truncate"
                          title={formattedAddress}
                        >
                          {formattedAddress}
                        </div>
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
        )}
      </div>
    </>
  );
}
