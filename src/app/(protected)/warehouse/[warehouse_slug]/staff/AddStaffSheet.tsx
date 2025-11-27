"use client";

import { useState, useEffect } from "react";
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
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/supabase";
import type { UserRole } from "@/types/database/enums";
import { useSession } from "@/contexts/session-context";

interface AddStaffSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStaffAdded?: () => void;
}

interface InviteFormData {
  role: UserRole;
  warehouseIds: string[];
}

type WarehouseRow = Tables<"warehouses">;

export function AddStaffSheet({
  open,
  onOpenChange,
  onStaffAdded,
}: AddStaffSheetProps) {
  const { user } = useSession();
  const [formData, setFormData] = useState<InviteFormData>({
    role: "staff",
    warehouseIds: [],
  });

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const supabase = createClient();

  // Fetch warehouses when sheet opens
  useEffect(() => {
    if (open) {
      fetchWarehouses();
    }
  }, [open]);

  const fetchWarehouses = async () => {
    try {
      setLoadingWarehouses(true);
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    } finally {
      setLoadingWarehouses(false);
    }
  };

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
      const supabase = createClient();

      // Validate warehouse assignment for staff role
      if (formData.role === "staff" && formData.warehouseIds.length === 0) {
        throw new Error("Please select at least one warehouse");
      }

      // Get company name
      const { data: company } = await supabase
        .from("companies")
        .select("name")
        .single();

      if (!company) {
        throw new Error("Failed to fetch company details");
      }

      // Set expiry to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invite using RPC function
      const { data: token, error: inviteError } = await supabase.rpc(
        "create_staff_invite",
        {
          p_company_id: user.company_id,
          p_company_name: company.name,
          p_role: formData.role,
          p_warehouse_ids:
            formData.role === "staff" ? formData.warehouseIds : null,
          p_expires_at: expiresAt.toISOString(),
        },
      );

      if (inviteError || !token) {
        throw new Error("Failed to create invite");
      }

      // Generate invite link
      const inviteUrl = `${window.location.origin}/invite/${token}`;

      // Get warehouse names for message
      const selectedWarehouses = warehouses.filter((w) =>
        formData.warehouseIds.includes(w.id),
      );
      const warehouseNames = selectedWarehouses.map((w) => w.name).join(", ");

      const systemDescription =
        formData.role === "staff" && warehouseNames
          ? `${warehouseNames} inventory system`
          : "our inventory system";

      const whatsappMessage = `Hi,

You've been invited to join ${company.name} and get access to ${systemDescription} as ${formData.role === "admin" ? "Admin" : "Staff"}.

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

      // Success! Close sheet and notify parent
      handleCancel();
      if (onStaffAdded) {
        onStaffAdded();
      }
    } catch (error) {
      console.error("Error sending invite:", error);
      setSendError(
        error instanceof Error ? error.message : "Failed to send invite",
      );
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      role: "staff",
      warehouseIds: [],
    });
    setSendError(null);
    onOpenChange(false);
  };

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
                      warehouseIds:
                        value === "admin" ? [] : formData.warehouseIds,
                    })
                  }
                  name="role"
                >
                  <RadioGroupItemPills value="admin">Admin</RadioGroupItemPills>
                  <RadioGroupItemPills value="staff">Staff</RadioGroupItemPills>
                </RadioGroupPills>
              </div>

              {/* Warehouse Assignment (only for staff) */}
              {formData.role === "staff" && (
                <div className="flex flex-col gap-3">
                  <Label>Assign warehouses</Label>
                  {loadingWarehouses ? (
                    <p className="text-sm text-gray-500">
                      Loading warehouses...
                    </p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {warehouses.map((warehouse) => (
                        <div
                          key={warehouse.id}
                          className="flex items-start space-x-2"
                        >
                          <Checkbox
                            id={`warehouse-${warehouse.id}`}
                            checked={formData.warehouseIds.includes(
                              warehouse.id,
                            )}
                            onCheckedChange={() =>
                              handleWarehouseToggle(warehouse.id)
                            }
                            className="mt-1.5"
                          />
                          <Label
                            htmlFor={`warehouse-${warehouse.id}`}
                            className="flex flex-col items-start gap-0 cursor-pointer flex-1"
                          >
                            <span className="text-base font-normal text-gray-900">
                              {warehouse.name}
                            </span>
                            <span className="text-xs font-normal text-gray-500 leading-relaxed">
                              {warehouse.address_line1 || "No address"}
                            </span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
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
