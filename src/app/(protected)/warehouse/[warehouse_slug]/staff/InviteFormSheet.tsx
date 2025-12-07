"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  RadioGroup as RadioGroupPills,
  RadioGroupItem as RadioGroupItemPills,
} from "@/components/ui/radio-group-pills";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { UserRole } from "@/types/database/enums";
import { useSession } from "@/contexts/session-context";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { useInviteMutations } from "@/lib/query/hooks/invites";
import { useCompany } from "@/lib/query/hooks/company";
import { LoadingState } from "@/components/layouts/loading-state";

interface InviteFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InviteFormData {
  role: UserRole;
  warehouseAccessMode: "all" | "select";
  warehouseIds: string[];
}

export function InviteFormSheet({ open, onOpenChange }: InviteFormSheetProps) {
  const { user } = useSession();
  const [formData, setFormData] = useState<InviteFormData>({
    role: "staff",
    warehouseAccessMode: "select",
    warehouseIds: [],
  });

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { data: company, isLoading: companyLoading } = useCompany();
  const { data: warehouses = [], isLoading: warehouseLoading } =
    useWarehouses();
  const { create: createInvite } = useInviteMutations();

  const handleWarehouseToggle = (warehouseId: string) => {
    setFormData((prev) => ({
      ...prev,
      warehouseIds: prev.warehouseIds.includes(warehouseId)
        ? prev.warehouseIds.filter((id) => id !== warehouseId)
        : [...prev.warehouseIds, warehouseId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendError(null);

    try {
      // Validate warehouse assignment when specific selection is required
      if (
        formData.warehouseAccessMode === "select" &&
        formData.warehouseIds.length === 0
      ) {
        throw new Error("Please select at least one warehouse");
      }

      // Set expiry to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invite using mutation
      const token = await createInvite.mutateAsync({
        companyId: user.company_id,
        companyName: company?.name || "Unknown company",
        role: formData.role,
        allWarehousesAccess: formData.warehouseAccessMode === "all",
        warehouseIds:
          formData.warehouseAccessMode === "select"
            ? formData.warehouseIds
            : [],
        expiresAt: expiresAt.toISOString(),
      });

      // Generate invite link
      const inviteUrl = `${window.location.origin}/invite/${token}`;

      // Get warehouse names for message
      const systemDescription =
        formData.warehouseAccessMode === "all"
          ? "our inventory system with access to all warehouses"
          : (() => {
              const selectedWarehouses = warehouses.filter((w) =>
                formData.warehouseIds.includes(w.id),
              );
              const warehouseNames = selectedWarehouses
                .map((w) => w.name)
                .join(", ");
              return warehouseNames
                ? `${warehouseNames} inventory system`
                : "our inventory system";
            })();

      const whatsappMessage = `Hi,

You've been invited to join ${company?.name || "Unknown company"} and get access to ${systemDescription} as ${formData.role === "admin" ? "Admin" : "Staff"}.

Here's your invite link:
🔗 ${inviteUrl}

📅 Please note: This link is valid for 7 days.

We're excited to have you onboard with us!

Thanks,
The Bale Team`;

      // Copy to clipboard as fallback
      try {
        await navigator.clipboard.writeText(inviteUrl);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }

      // Open WhatsApp with message
      const encodedMessage = encodeURIComponent(whatsappMessage);
      window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");

      // Success! Close sheet
      handleCancel();
    } catch (error) {
      console.error("Error sending invite:", error);
      setSendError("Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      role: "staff",
      warehouseAccessMode: "select",
      warehouseIds: [],
    });
    setSendError(null);
    onOpenChange(false);
  };

  if (companyLoading || warehouseLoading) {
    return <LoadingState message="Loading..." />;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Staff invite</SheetTitle>
        </SheetHeader>

        {/* Form Content - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col gap-6 px-4 py-5">
              {/* Role Selection */}
              <div className="flex flex-col gap-2">
                <Label>Role</Label>
                <RadioGroupPills
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as UserRole,
                    })
                  }
                  name="role"
                >
                  <RadioGroupItemPills value="admin">Admin</RadioGroupItemPills>
                  <RadioGroupItemPills value="staff">Staff</RadioGroupItemPills>
                </RadioGroupPills>
              </div>

              {/* Warehouse Access Mode */}
              <div className="flex flex-col gap-2">
                <Label>Warehouse access</Label>
                <RadioGroupPills
                  value={formData.warehouseAccessMode}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      warehouseAccessMode: value as "all" | "select",
                      warehouseIds:
                        value === "all" ? [] : formData.warehouseIds,
                    })
                  }
                  name="warehouseAccessMode"
                >
                  <RadioGroupItemPills value="all">
                    All warehouses
                  </RadioGroupItemPills>
                  <RadioGroupItemPills value="select">
                    Select warehouses
                  </RadioGroupItemPills>
                </RadioGroupPills>
              </div>

              {/* Warehouse Assignment (only when select mode) */}
              {formData.warehouseAccessMode === "select" && (
                <div className="flex flex-col gap-3">
                  <Label>Select warehouses</Label>
                  <div className="flex flex-col gap-3">
                    {warehouses.map((warehouse) => (
                      <div
                        key={warehouse.id}
                        className="flex items-start space-x-2"
                      >
                        <Checkbox
                          id={`warehouse-${warehouse.id}`}
                          checked={formData.warehouseIds.includes(warehouse.id)}
                          onCheckedChange={() =>
                            handleWarehouseToggle(warehouse.id)
                          }
                          className="mt-1.5"
                        />
                        <Label
                          htmlFor={`warehouse-${warehouse.id}`}
                          className="flex flex-col items-start gap-0 cursor-pointer flex-1"
                        >
                          <span className="text-base font-normal text-gray-700">
                            {warehouse.name}
                          </span>
                          <span className="text-xs font-normal text-gray-500 leading-relaxed">
                            {warehouse.address_line1 || "No address"}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <SheetFooter>
            {sendError && (
              <p className="text-sm text-red-600 text-center">{sendError}</p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={sending}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={sending}>
                {sending ? "Sending..." : "Create & Send Invite"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
