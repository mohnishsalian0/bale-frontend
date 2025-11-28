"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PartnerButton } from "@/components/ui/partner-button";
import { IconPlus, IconUsers } from "@tabler/icons-react";
import type { RecentPartner } from "@/lib/queries/dashboard";
import { PartnerFormSheet } from "../partners/PartnerFormSheet";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/session-context";
import { PartnerType } from "@/types/database/enums";

interface PartnersSectionProps {
  title: string;
  newButtonLabel: string;
  partnerType: PartnerType;
  partners: RecentPartner[];
}

export function PartnersSection({
  title,
  newButtonLabel,
  partnerType,
  partners,
}: PartnersSectionProps) {
  const router = useRouter();
  const { warehouse } = useSession();
  const [showCreatePartnerSheet, setShowCreatePartnerSheet] = useState(false);

  if (partners.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreatePartnerSheet(true)}
          >
            <IconPlus />
            {newButtonLabel}
          </Button>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No {title.toLowerCase()} yet</p>
        </div>
      </div>
    );
  }

  const hasMore = partners.length === 8;
  const displayPartners = partners.slice(0, 7);

  return (
    <>
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreatePartnerSheet(true)}
          >
            <IconPlus />
            {newButtonLabel}
          </Button>
        </div>
        <div className="px-1">
          <div className="grid grid-cols-4 md:grid-cols-6">
            {displayPartners.map((partner) => (
              <PartnerButton
                key={partner.id}
                partner={partner}
                onClick={() =>
                  router.push(
                    `/warehouse/${warehouse.slug}/partners/${partner.id}`,
                  )
                }
              />
            ))}
            {/* View all button if more than 7 partners */}
            {hasMore && (
              <button
                onClick={() =>
                  router.push(
                    `/warehouse/${warehouse.slug}/partners?type=customer`,
                  )
                }
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <IconUsers className="size-5 text-gray-600" />
                </div>
                <span className="text-xs text-gray-700 text-center">
                  View all
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Add Partner Sheet */}
      {showCreatePartnerSheet && (
        <PartnerFormSheet
          key="new-partner"
          open={showCreatePartnerSheet}
          onOpenChange={setShowCreatePartnerSheet}
          partnerType={partnerType}
        />
      )}
    </>
  );
}
