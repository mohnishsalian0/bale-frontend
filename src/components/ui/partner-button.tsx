"use client";

import { getPartnerName } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";
import type { PartnerListView } from "@/types/partners.types";
import ImageWrapper from "./image-wrapper";

interface PartnerButtonProps {
  partner: PartnerListView;
  onClick: () => void;
}

export function PartnerButton({ partner, onClick }: PartnerButtonProps) {
  const name = getPartnerName(partner);
  return (
    <button
      onClick={onClick}
      className="max-w-30 flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
    >
      <ImageWrapper
        size="md"
        shape="circle"
        alt={name}
        placeholderInitials={getInitials(name)}
      />
      <span
        className="text-xs text-gray-700 text-center line-clamp-2"
        title={name}
      >
        {name}
      </span>
    </button>
  );
}
