"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  IconMapPin,
  IconPhone,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fab } from "@/components/ui/fab";
import { TabPills } from "@/components/ui/tab-pills";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import ImageWrapper from "@/components/ui/image-wrapper";
import { PartnerFormSheet } from "./PartnerFormSheet";
import { usePartners } from "@/lib/query/hooks/partners";
import { useSession } from "@/contexts/session-context";
import { getInitials } from "@/lib/utils/initials";
import type { PartnerType } from "@/types/database/enums";
import { getFormattedAddress, getPartnerName } from "@/lib/utils/partner";

const PARTNER_TYPES: { value: PartnerType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "customer", label: "Customer" },
  { value: "supplier", label: "Supplier" },
  { value: "vendor", label: "Vendor" },
  { value: "agent", label: "Agent" },
];

function getActionLabel(type: PartnerType): string {
  switch (type) {
    case "customer":
      return "Sales order";
    case "supplier":
    case "vendor":
      return "Goods inward";
    default:
      return "Job work";
  }
}

export default function PartnersPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const [selectedType, setSelectedType] = useState<PartnerType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePartner, setShowCreatePartner] = useState(false);

  // Fetch all partners using TanStack Query
  const {
    data: allPartners = [],
    isLoading: loading,
    isError: error,
    refetch,
  } = usePartners();

  // Filter partners by search query
  const filteredPartners = allPartners.filter((partner) => {
    const name = getPartnerName(partner);
    if (!name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    if (selectedType !== "all" && partner.partner_type !== selectedType) {
      return false;
    }

    return true;
  });

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
    <div className="relative flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 p-4">
        <div className="flex-1">
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
      <div className="px-4 py-2">
        <TabPills
          options={PARTNER_TYPES}
          value={selectedType}
          onValueChange={(value) =>
            setSelectedType(value as PartnerType | "all")
          }
        />
      </div>

      {/* Partner Cards */}
      <li className="grid grid-cols-1 lg:grid-cols-2 3xl:grid-cols-3 gap-4 items-stretch p-4">
        {filteredPartners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No partners found</p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search"
                : `Add your first ${selectedType.toLowerCase()}`}
            </p>
          </div>
        ) : (
          filteredPartners.map((partner) => {
            const name = getPartnerName(partner);
            const type = partner.partner_type as PartnerType;
            const address = getFormattedAddress(partner).join(", ");

            return (
              <ul key={partner.id}>
                <Card
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() =>
                    router.push(
                      `/warehouse/${warehouse.slug}/partners/${partner.id}`,
                    )
                  }
                >
                  <CardContent className="p-4 pb-3 flex flex-col gap-4">
                    {/* Partner Info */}
                    <div className="flex gap-4">
                      {/* Avatar */}
                      <ImageWrapper
                        size="lg"
                        shape="circle"
                        alt={name}
                        placeholderInitials={getInitials(name)}
                      />

                      {/* Details */}
                      <div className="flex-1 flex justify-between py-2">
                        <div className="flex flex-col">
                          <p className="text-base font-medium text-gray-900">
                            {name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {PARTNER_TYPES.find((t) => t.value === type)?.label}
                          </p>
                        </div>

                        {/* TODO: Amount */}
                        {/* {partner.amount && ( */}
                        {/*   <div className="flex flex-col items-end justify-center"> */}
                        {/*     <p */}
                        {/*       className={`text-base font-bold ${ */}
                        {/*         partner.transactionType === "sales" */}
                        {/*           ? "text-teal-700" */}
                        {/*           : "text-yellow-700" */}
                        {/*       }`} */}
                        {/*     > */}
                        {/*       ₹{partner.amount.toLocaleString("en-IN")} */}
                        {/*     </p> */}
                        {/*     <p className="text-xs text-gray-500"> */}
                        {/*       in {partner.transactionType} */}
                        {/*     </p> */}
                        {/*   </div> */}
                        {/* )} */}
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="flex gap-6 px-2 text-sm">
                      <div className="flex gap-1.5 items-center">
                        <IconMapPin className="size-4 text-gray-500 shrink-0" />
                        <span className="text-gray-700">
                          {address || "No address"}
                        </span>
                      </div>
                      <div className="flex gap-1.5 items-center text-nowrap">
                        <IconPhone className="size-4 text-primary-700" />
                        <span
                          className={
                            partner.phone_number
                              ? "text-primary-700 font-medium"
                              : "text-gray-700"
                          }
                        >
                          {partner.phone_number || "No phone number"}
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="px-6 pb-4 pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-700"
                    >
                      <IconPlus />
                      {getActionLabel(type)}
                    </Button>
                  </CardFooter>
                </Card>
              </ul>
            );
          })
        )}
      </li>

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
