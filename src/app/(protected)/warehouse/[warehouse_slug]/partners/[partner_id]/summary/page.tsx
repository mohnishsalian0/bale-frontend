"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  IconPhone,
  IconMail,
  IconMapPin,
  IconNotes,
  IconUser,
  IconCurrencyRupee,
} from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Section } from "@/components/layouts/section";
import { usePartnerWithOrderStats } from "@/lib/query/hooks/partners";
import { getFormattedAddress } from "@/lib/utils/partner";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    partner_id: string;
  }>;
}

export default function PartnerSummaryPage({ params }: PageParams) {
  const router = useRouter();
  const { partner_id } = use(params);

  // Fetch partner using TanStack Query (cached from layout)
  const {
    data: partner,
    isLoading: loading,
    isError: error,
  } = usePartnerWithOrderStats(partner_id);

  if (loading) {
    return <LoadingState message="Loading partner summary..." />;
  }

  if (error || !partner) {
    return (
      <ErrorState
        title="Partner not found"
        message="This partner does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  const addressLines = getFormattedAddress(partner);
  const contactName =
    partner.first_name && partner.last_name
      ? `${partner.first_name} ${partner.last_name}`.trim()
      : null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Contact Information Section */}
      <Section
        title="Contact information"
        subtitle=""
        icon={() => <IconUser />}
      >
        <div className="space-y-3">
          {/* Contact Person */}
          {contactName && partner.company_name && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Contact person</span>
              <span className="font-semibold text-gray-700">{contactName}</span>
            </div>
          )}

          {/* Phone Number */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconPhone className="size-4" />
              Phone
            </span>
            <span className="font-semibold text-gray-700">
              {partner.phone_number || "—"}
            </span>
          </div>

          {/* Email */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMail className="size-4" />
              Email
            </span>
            <span className="font-semibold text-gray-700">
              {partner.email || "—"}
            </span>
          </div>

          {/* Address */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            {addressLines.length > 0 ? (
              <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                {addressLines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            ) : (
              <span className="text-gray-500 italic">No address provided</span>
            )}
          </div>
        </div>
      </Section>

      {/* Financial Information Section */}
      <Section
        title="Financial information"
        subtitle=""
        icon={() => <IconCurrencyRupee />}
      >
        <div className="space-y-3">
          {/* GST Number */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">GST number</span>
            <span className="font-semibold text-gray-700">
              {partner.gst_number || "—"}
            </span>
          </div>

          {/* PAN */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">PAN</span>
            <span className="font-semibold text-gray-700">
              {partner.pan_number || "—"}
            </span>
          </div>
        </div>
      </Section>

      {/* Notes Section */}
      {partner.notes && (
        <Section
          title="Notes"
          subtitle=""
          onEdit={() => {}}
          icon={() => <IconNotes />}
        >
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {partner.notes}
          </p>
        </Section>
      )}
    </div>
  );
}
