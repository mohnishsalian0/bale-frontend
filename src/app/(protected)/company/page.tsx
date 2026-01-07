"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconMapPin,
  IconPencil,
  IconBuilding,
  IconPlus,
  IconCurrencyRupee,
  IconShare,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/layouts/section";
import ImageWrapper from "@/components/ui/image-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { WarehouseFormSheet } from "@/app/(protected)/warehouse/WarehouseFormSheet";
import { CompanyEditSheet } from "@/app/(protected)/company/CompanyEditSheet";
import { useCompany } from "@/lib/query/hooks/company";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import {
  getFormattedCompanyAddress,
  getCompanyContactInfo,
} from "@/lib/utils/company";
import {
  getWarehouseFormattedAddress,
  getWarehouseContactDetails,
} from "@/lib/utils/warehouse";
import { Warehouse } from "@/types/warehouses.types";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function CompanyPage() {
  const router = useRouter();
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null,
  );

  // Fetch company and warehouses using TanStack Query hooks
  const {
    data: company,
    isLoading: companyLoading,
    isError: companyError,
    refetch: refetchCompany,
  } = useCompany();
  const {
    data: warehouses = [],
    isLoading: warehousesLoading,
    isError: warehousesError,
    refetch: refetchWarehouses,
  } = useWarehouses();

  const loading = companyLoading || warehousesLoading;
  const error = companyError || warehousesError;

  if (loading) {
    return <LoadingState message="Loading company details..." />;
  }

  if (error || !company) {
    return (
      <ErrorState
        title="Failed to load company"
        message="Company not found"
        onRetry={() => {
          refetchCompany();
          refetchWarehouses();
        }}
      />
    );
  }

  const addressLines = getFormattedCompanyAddress(company);
  const hasContactInfo =
    company.phone_number || company.email || company.website_url;

  const handleEditWarehouse = (warehouse: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWarehouse(warehouse);
    setShowCreateWarehouse(true);
  };

  const handleShareWarehouse = (warehouse: Warehouse, e: React.MouseEvent) => {
    e.stopPropagation();

    // Build address string
    const addressParts = [
      warehouse.name,
      warehouse.address_line1,
      warehouse.address_line2,
      warehouse.city && warehouse.state
        ? `${warehouse.city}, ${warehouse.state}`
        : warehouse.city || warehouse.state,
      warehouse.pin_code ? `- ${warehouse.pin_code}` : "",
      warehouse.country,
    ].filter(Boolean);

    const message = `📍 Warehouse Location\\n\\n${addressParts.join("\\n")}`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const handleNewWarehouse = () => {
    setEditingWarehouse(null);
    setShowCreateWarehouse(true);
  };

  const handleSheetClose = (open: boolean) => {
    setShowCreateWarehouse(open);
    if (!open) {
      setEditingWarehouse(null);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header Section */}
      <div className="relative px-4 pt-6 pb-4 border-b border-gray-200">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <ImageWrapper
            size="lg"
            shape="square"
            imageUrl={company.logo_url || undefined}
            alt={company.name}
            placeholderIcon={IconBuilding}
          />

          {/* Info Column */}
          <div className="flex-1 min-w-0">
            {/* Company Name */}
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>

            {/* Business Type */}
            {company.business_type && (
              <p className="text-sm text-gray-700 mt-1">
                {company.business_type}
              </p>
            )}

            {/* Contact Info Row */}
            {hasContactInfo && (
              <div className="flex items-center flex-wrap gap-2 mt-1 text-sm text-gray-700">
                {getCompanyContactInfo(company)}
              </div>
            )}
          </div>

          {/* Edit Button */}
          <Button
            variant="ghost"
            onClick={() => setShowEditCompany(true)}
            className="shrink-0"
          >
            <IconPencil />
            Edit
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {/* Address Section */}
          {addressLines.length > 0 && (
            <Section
              title="Address"
              subtitle="Company registered address"
              icon={() => <IconMapPin />}
            >
              <div className="space-y-1">
                {addressLines.map((line, index) => (
                  <p key={index} className="text-sm text-gray-700">
                    {line}
                  </p>
                ))}
              </div>
            </Section>
          )}

          {/* Financial Information Section */}
          {(company.gst_number || company.pan_number) && (
            <Section
              title="Financial information"
              subtitle="Tax and business registration details"
              icon={() => <IconCurrencyRupee />}
            >
              <div className="space-y-3">
                {company.gst_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">GST number</span>
                    <span className="font-semibold text-gray-700">
                      {company.gst_number}
                    </span>
                  </div>
                )}

                {company.pan_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">PAN</span>
                    <span className="font-semibold text-gray-700">
                      {company.pan_number}
                    </span>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Warehouses Section */}
          <div className="flex flex-col gap-3 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Warehouses</h2>
              <PermissionGate permission="warehouses.create" mode="disable">
                <Button variant="ghost" size="sm" onClick={handleNewWarehouse}>
                  <IconPlus />
                  New warehouse
                </Button>
              </PermissionGate>
            </div>

            {/* Warehouse Cards */}
            {warehouses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-600 mb-2">No warehouses found</p>
                <p className="text-sm text-gray-500">
                  Create your first warehouse to get started
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {warehouses.map((warehouse) => {
                  const formattedAddress =
                    getWarehouseFormattedAddress(warehouse);
                  const contactDetails = getWarehouseContactDetails(warehouse);

                  return (
                    <div
                      key={warehouse.id}
                      onClick={() =>
                        router.push(`/warehouse/${warehouse.slug}/dashboard`)
                      }
                      className="flex items-center gap-3 p-4 rounded-lg cursor-pointer select-none transition-all bg-background border border-border hover:bg-gray-50"
                    >
                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col">
                        <p
                          className="text-base font-medium text-gray-700 truncate"
                          title={warehouse.name}
                        >
                          {warehouse.name}
                        </p>
                        <p
                          className="text-sm text-gray-500"
                          title={formattedAddress}
                        >
                          {formattedAddress}
                        </p>
                        {contactDetails && (
                          <p
                            className="text-sm font-medium text-gray-500"
                            title={contactDetails}
                          >
                            {contactDetails}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <PermissionGate
                          permission="warehouses.update"
                          mode="disable"
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEditWarehouse(warehouse, e)}
                          >
                            <IconPencil />
                            Edit
                          </Button>
                        </PermissionGate>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleShareWarehouse(warehouse, e)}
                        >
                          <IconShare />
                          Share
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Warehouse Sheet */}
      {showCreateWarehouse && (
        <WarehouseFormSheet
          key={editingWarehouse ? editingWarehouse.id : "new-warehouse"}
          open={showCreateWarehouse}
          onOpenChange={handleSheetClose}
          warehouse={editingWarehouse}
        />
      )}

      {/* Company Edit Sheet */}
      {showEditCompany && (
        <CompanyEditSheet
          key={company.id}
          open={showEditCompany}
          onOpenChange={setShowEditCompany}
          company={company}
        />
      )}
    </div>
  );
}
