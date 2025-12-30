"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconUser, IconPhone, IconChevronDown } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { InputWrapper } from "@/components/ui/input-wrapper";
import {
  warehouseSchema,
  WarehouseFormData,
} from "@/lib/validations/warehouse";

interface WarehouseFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse | null; // For edit mode
}

export function WarehouseFormSheet({
  open,
  onOpenChange,
  warehouse,
}: WarehouseFormSheetProps) {
  const { create, update } = useWarehouseMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name || "",
      contactName: warehouse?.contact_name || "",
      contactNumber: warehouse?.contact_number || "",
      addressLine1: warehouse?.address_line1 || "",
      addressLine2: warehouse?.address_line2 || "",
      city: warehouse?.city || "",
      state: warehouse?.state || "",
      country: warehouse?.country || "India",
      pinCode: warehouse?.pin_code || "",
    },
  });

  const [showAddress, setShowAddress] = useState(true);

  const isEditMode = !!warehouse;
  const saving = create.isPending || update.isPending;

  const onSubmit = async (data: WarehouseFormData) => {
    const mutationOptions = {
      onSuccess: () => {
        toast.success(
          warehouse
            ? "Warehouse updated successfully"
            : "Warehouse created successfully",
        );
        handleCancel();
      },
      onError: (error: Error) => {
        console.error("Error upserting warehouse: ", error.message);
        toast.error(
          warehouse
            ? "Failed to updated warehouse"
            : "Failed to created warehouse",
        );
      },
    };

    const warehouseData: WarehouseInsert = {
      name: data.name,
      contact_name: data.contactName || null,
      contact_number: data.contactNumber || null,
      address_line1: data.addressLine1 || null,
      address_line2: data.addressLine2 || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      pin_code: data.pinCode || null,
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
    reset();
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
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col h-full overflow-y-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            {/* Basic Info */}
            <div className="flex flex-col gap-5 px-4 py-5">
              {/* Warehouse Name */}
              <InputWrapper
                label="Warehouse name"
                placeholder="Enter a name"
                {...register("name")}
                required
                isError={!!errors.name}
                errorText={errors.name?.message}
              />

              {/* Contact Person Name */}
              <InputWrapper
                placeholder="Contact person name"
                {...register("contactName")}
                icon={<IconUser />}
              />

              {/* Contact Person Number */}
              <InputWrapper
                type="tel"
                placeholder="Contact person number"
                {...register("contactNumber")}
                icon={<IconPhone />}
                isError={!!errors.contactNumber}
                errorText={errors.contactNumber?.message}
              />
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
                  <InputWrapper
                    placeholder="Address line 1"
                    {...register("addressLine1")}
                  />
                  <InputWrapper
                    placeholder="Address line 2"
                    {...register("addressLine2")}
                  />
                  <div className="flex gap-4">
                    <InputWrapper placeholder="City" {...register("city")} />
                    <InputWrapper placeholder="State" {...register("state")} />
                  </div>
                  <div className="flex gap-4">
                    <InputWrapper
                      placeholder="Country"
                      {...register("country")}
                    />
                    <InputWrapper
                      placeholder="Pin code"
                      {...register("pinCode")}
                      isError={!!errors.pinCode}
                      errorText={errors.pinCode?.message}
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
