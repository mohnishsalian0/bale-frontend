"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconPlus, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageWrapper from "@/components/ui/image-wrapper";
import { usePartners } from "@/lib/query/hooks/partners";
import { getPartnerInfo, getPartnerName } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";

interface SupplierSelectionStepProps {
  selectedSupplierId: string | null;
  onSelectSupplier: (supplierId: string) => void;
  onAddNewSupplier: () => void;
}

export function SupplierSelectionStep({
  selectedSupplierId,
  onSelectSupplier,
  onAddNewSupplier,
}: SupplierSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: suppliers = [], isLoading: loading } = usePartners({
    partner_type: "supplier",
  });

  // Filter and sort suppliers using useMemo
  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter suppliers
    let filtered = suppliers.filter((supplier) => {
      // Search filter (case-insensitive)
      if (query) {
        const fullName =
          `${supplier.first_name} ${supplier.last_name}`.toLowerCase();
        const companyName = supplier.company_name?.toLowerCase() || "";
        const phoneNumber = supplier.phone_number?.toLowerCase() || "";

        return (
          fullName.includes(query) ||
          companyName.includes(query) ||
          phoneNumber.includes(query)
        );
      }
      return true;
    });

    // Sort: selected supplier first, then alphabetically
    filtered.sort((a, b) => {
      if (a.id === selectedSupplierId) return -1;
      if (b.id === selectedSupplierId) return 1;

      // Sort by company name if exists, otherwise by first name
      const aName = a.company_name || a.first_name;
      const bName = b.company_name || b.first_name;
      return aName.localeCompare(bName);
    });

    return filtered;
  }, [suppliers, searchQuery, selectedSupplierId]);

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Select supplier
          </h3>
          <Button variant="ghost" onClick={onAddNewSupplier}>
            <IconPlus className="size-4" />
            New supplier
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search for supplier"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
        </div>
      </div>

      {/* Supplier List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading suppliers...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No suppliers found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredSuppliers.map((supplier) => {
              const isSelected = supplier.id === selectedSupplierId;
              const partnerName = getPartnerName(supplier);
              const partnerInfo = getPartnerInfo(supplier);

              return (
                <button
                  key={supplier.id}
                  onClick={() => onSelectSupplier(supplier.id)}
                  className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Supplier Image */}
                  <ImageWrapper
                    size="md"
                    shape="circle"
                    imageUrl={supplier.image_url || undefined}
                    alt={partnerName}
                    placeholderInitials={getInitials(partnerName)}
                  />

                  {/* Supplier Info */}
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
    </>
  );
}
