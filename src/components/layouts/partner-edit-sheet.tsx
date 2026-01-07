"use client";

import { useState } from "react";
import { IconX } from "@tabler/icons-react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePartners } from "@/lib/query/hooks/partners";
import { getPartnerName } from "@/lib/utils/partner";
import type { PartnerType } from "@/types/database/enums";
import type { SalesOrderUpdate } from "@/types/sales-orders.types";
import type { PurchaseOrderUpdate } from "@/types/purchase-orders.types";

interface PartnerEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    data: Partial<SalesOrderUpdate> | Partial<PurchaseOrderUpdate>,
    onSuccessCallback?: () => void,
  ) => void;
  isPending: boolean;
  partnerType: "customer" | "supplier" | "agent";
  currentPartnerId: string | null;
}

const PARTNER_CONFIG = {
  customer: {
    label: "Customer",
    field: "customer_id",
    nullable: false,
  },
  supplier: {
    label: "Supplier",
    field: "supplier_id",
    nullable: false,
  },
  agent: {
    label: "Agent",
    field: "agent_id",
    nullable: true,
  },
} as const;

export function PartnerEditSheet({
  open,
  onOpenChange,
  onSave,
  isPending,
  partnerType,
  currentPartnerId,
}: PartnerEditSheetProps) {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(
    currentPartnerId,
  );

  const config = PARTNER_CONFIG[partnerType];
  const { data: partners = [] } = usePartners({
    partner_type: partnerType as PartnerType,
  });

  const handleSave = () => {
    onSave({ [config.field]: selectedPartnerId }, () => onOpenChange(false));
  };

  const formContent = (
    <div className="space-y-2">
      <Label htmlFor="partner">{config.label}</Label>
      <div className="flex gap-2">
        <Select
          value={selectedPartnerId || (config.nullable ? "none" : "")}
          onValueChange={(value) =>
            setSelectedPartnerId(value === "none" ? null : value)
          }
          disabled={isPending}
        >
          <SelectTrigger id="partner" className="flex-1">
            <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {config.nullable && (
              <SelectItem value="none">
                No {config.label.toLowerCase()}
              </SelectItem>
            )}
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {getPartnerName(partner)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {config.nullable && selectedPartnerId && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedPartnerId(null)}
            disabled={isPending}
            type="button"
          >
            <IconX className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const footerButtons = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={isPending || (!config.nullable && !selectedPartnerId)}
      >
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Edit ${config.label}`}
      description={`Update the ${config.label.toLowerCase()} for this order`}
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
