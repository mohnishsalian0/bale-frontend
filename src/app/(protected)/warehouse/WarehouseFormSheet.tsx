"use client";

import { useState } from "react";
import { IconUser, IconPhone, IconChevronDown } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useWarehouseMutations } from "@/lib/query/hooks/warehouses";
import { Warehouse, WarehouseInsert } from "@/types/warehouses.types";
import { InputWithIcon } from "@/components/ui/input-with-icon";

interface WarehouseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null; // For edit mode
}

interface WarehouseFormData {
  name: string;
  contactName: string;
  contactNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
}

export function WarehouseFormSheet({
  open,
  onOpenChange,
  warehouse,
}: WarehouseFormSheetProps) {
  const { create, update } = useWarehouseMutations();

  const [formData, setFormData] = useState<WarehouseFormData>({
    name: warehouse?.name || "",
    contactName: warehouse?.contact_name || "",
    contactNumber: warehouse?.contact_number || "",
    addressLine1: warehouse?.address_line1 || "",
    addressLine2: warehouse?.address_line2 || "",
    city: warehouse?.city || "",
    state: warehouse?.state || "",
    country: warehouse?.country || "India",
    pinCode: warehouse?.pin_code || "",
  });

  const [showAddress, setShowAddress] = useState(false);

  const isEditMode = !!warehouse;
  const saving = create.isPending || update.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mutationOptions = {
      onSuccess: () => {
        toast.success(
          warehouse
            ? "Warehouse updated successfully"
            : "Warehouse created successfully",
        );
        handleCancel();
      },
      onError: () => {
        toast.error(
          warehouse
            ? "Failed to updated warehouse"
            : "Failed to created warehouse",
        );
      },
    };

    const warehouseData: WarehouseInsert = {
      name: formData.name,
      contact_name: formData.contactName || null,
      contact_number: formData.contactNumber || null,
      address_line1: formData.addressLine1 || null,
      address_line2: formData.addressLine2 || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      pin_code: formData.pinCode || null,
    };

    if (isEditMode && warehouse) {
      // Update existing warehouse using mutation
      update.mutate(
        {
          id: warehouse.id,
          data: warehouseData,
        },
        mutationOptions,
      );
    } else {
      // Create new warehouse using mutation
      create.mutate(warehouseData, mutationOptions);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      name: "",
      contactName: "",
      contactNumber: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "India",
      pinCode: "",
    });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Edit warehouse" : "Create warehouse"}
          </SheetTitle>
        </SheetHeader>

        {/* Form Content - Scrollable */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full overflow-y-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            {/* Basic Info */}
            <div className="flex flex-col gap-5 px-4 py-5">
              {/* Warehouse Name */}
              <InputWithIcon
                label="Warehouse name"
                placeholder="Enter a name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              {/* Contact Person Name */}
              <div className="relative">
                <IconUser className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                <Input
                  placeholder="Contact person name"
                  value={formData.contactName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactName: e.target.value,
                    }))
                  }
                  className="pl-12"
                />
              </div>

              {/* Contact Person Number */}
              <div className="relative">
                <IconPhone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                <Input
                  type="tel"
                  placeholder="Contact person number"
                  value={formData.contactNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactNumber: e.target.value,
                    }))
                  }
                  className="pl-12"
                />
              </div>
            </div>

            {/* Address Section */}
            <Collapsible
              open={showAddress}
              onOpenChange={setShowAddress}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showAddress ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">Address</h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showAddress ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-5">
                  <Input
                    placeholder="Address line 1"
                    value={formData.addressLine1}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        addressLine1: e.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Address line 2"
                    value={formData.addressLine2}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        addressLine2: e.target.value,
                      }))
                    }
                  />
                  <div className="flex gap-4">
                    <Input
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          city: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          state: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex gap-4">
                    <Input
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Pin code"
                      value={formData.pinCode}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          pinCode: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <SheetFooter>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1">
                {saving
                  ? isEditMode
                    ? "Updating..."
                    : "Saving..."
                  : isEditMode
                    ? "Update"
                    : "Save"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
