"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconPlus, IconCheck } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageWrapper from "@/components/ui/image-wrapper";
import { useCustomers } from "@/lib/query/hooks/partners";
import { getPartnerInfo, getPartnerName } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";

interface CustomerSelectionStepProps {
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string) => void;
  onAddNewCustomer: () => void;
}

export function CustomerSelectionStep({
  selectedCustomerId,
  onSelectCustomer,
  onAddNewCustomer,
}: CustomerSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: customers = [], isLoading: loading } = useCustomers();

  // Filter and sort customers using useMemo
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter customers
    let filtered = customers.filter((customer) => {
      // Search filter (case-insensitive)
      if (query) {
        const fullName =
          `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const companyName = customer.company_name?.toLowerCase() || "";
        const phoneNumber = customer.phone_number?.toLowerCase() || "";

        return (
          fullName.includes(query) ||
          companyName.includes(query) ||
          phoneNumber.includes(query)
        );
      }
      return true;
    });

    // Sort: selected customer first, then alphabetically
    filtered.sort((a, b) => {
      if (a.id === selectedCustomerId) return -1;
      if (b.id === selectedCustomerId) return 1;

      // Sort by company name if exists, otherwise by first name
      const aName = a.company_name || a.first_name;
      const bName = b.company_name || b.first_name;
      return aName.localeCompare(bName);
    });

    return filtered;
  }, [customers, searchQuery, selectedCustomerId]);

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Select customer
          </h3>
          <Button variant="ghost" onClick={onAddNewCustomer}>
            <IconPlus className="size-4" />
            New customer
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search for customer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
        </div>
      </div>

      {/* Customer List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No customers found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredCustomers.map((customer) => {
              const isSelected = customer.id === selectedCustomerId;
              const partnerName = getPartnerName(customer);
              const partnerInfo = getPartnerInfo(customer);

              return (
                <button
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer.id)}
                  className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Customer Image */}
                  <ImageWrapper
                    size="md"
                    shape="circle"
                    imageUrl={customer.image_url || undefined}
                    alt={partnerName}
                    placeholderInitials={getInitials(partnerName)}
                  />

                  {/* Customer Info */}
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
