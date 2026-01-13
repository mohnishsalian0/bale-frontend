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
import type { UserRole } from "@/types/database/enums";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { useStaffMutations } from "@/lib/query/hooks/users";
import { useSession } from "@/contexts/session-context";
import { LoadingState } from "@/components/layouts/loading-state";
import type { StaffListView } from "@/types/staff.types";
import { toast } from "sonner";

interface EditStaffSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMember: StaffListView;
}

interface EditFormData {
  role: UserRole;
  warehouseAccessMode: "all" | "select";
  warehouseIds: string[];
}

export function EditStaffSheet({
  open,
  onOpenChange,
  staffMember,
}: EditStaffSheetProps) {
  const { user } = useSession();
  const [formData, setFormData] = useState<EditFormData>({
    role: staffMember.role as UserRole,
    warehouseAccessMode: staffMember.all_warehouses_access ? "all" : "select",
    warehouseIds: staffMember.warehouses.map((w) => w.id),
  });

  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const { data: warehouses = [], isLoading: warehouseLoading } =
    useWarehouses();
  const { update: updateStaff } = useStaffMutations();

  // Reset form data when staff member or sheet visibility changes
  useEffect(() => {
    if (open) {
      setFormData({
        role: staffMember.role as UserRole,
        warehouseAccessMode: staffMember.all_warehouses_access
          ? "all"
          : "select",
        warehouseIds: staffMember.warehouses.map((w) => w.id),
      });
      setUpdateError(null);
    }
  }, [open, staffMember]);

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
    setUpdating(true);
    setUpdateError(null);

    try {
      // Validate warehouse assignment when specific selection is required
      if (
        formData.warehouseAccessMode === "select" &&
        formData.warehouseIds.length === 0
      ) {
        throw new Error("Please select at least one warehouse");
      }

      // Update staff member using mutation
      await updateStaff.mutateAsync({
        userId: staffMember.id,
        companyId: user.company_id,
        role: formData.role,
        allWarehousesAccess: formData.warehouseAccessMode === "all",
        warehouseIds:
          formData.warehouseAccessMode === "select"
            ? formData.warehouseIds
            : [],
      });

      toast.success("Staff member updated successfully");
      handleCancel();
    } catch (error) {
      console.error("Error updating staff member:", error);
      setUpdateError(
        error instanceof Error ? error.message : "Failed to update staff member",
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    setUpdateError(null);
    onOpenChange(false);
  };

  if (warehouseLoading) {
    return <LoadingState message="Loading..." />;
  }

  const fullName = `${staffMember.first_name} ${staffMember.last_name}`.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit {fullName}</SheetTitle>
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
            {updateError && (
              <p className="text-sm text-red-600 text-center">{updateError}</p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
                disabled={updating}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={updating}>
                {updating ? "Updating..." : "Update"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
