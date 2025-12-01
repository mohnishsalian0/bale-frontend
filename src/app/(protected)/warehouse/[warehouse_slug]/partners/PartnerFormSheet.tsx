"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  IconUser,
  IconPhone,
  IconChevronDown,
  IconBuildingFactory2,
  IconBuilding,
  IconId,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { usePartnerMutations } from "@/lib/query/hooks/partners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { Label } from "@/components/ui/label";
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
import { validateImageFile } from "@/lib/storage";
import type { PartnerType } from "@/types/database/enums";
import type {
  PartnerDetailView,
  PartnerInsert,
  PartnerUpdate,
} from "@/types/partners.types";
import { useSession } from "@/contexts/session-context";

interface PartnerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerType?: PartnerType;
  partnerToEdit?: PartnerDetailView;
}

interface PartnerFormData {
  partnerType: PartnerType;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  businessType: string;
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  gstNumber: string;
  panNumber: string;
  notes: string;
  image: File | null;
}

export function PartnerFormSheet({
  open,
  onOpenChange,
  partnerType,
  partnerToEdit,
}: PartnerFormSheetProps) {
  const { user } = useSession();
  const { createPartner, updatePartner } = usePartnerMutations();

  const [formData, setFormData] = useState<PartnerFormData>({
    partnerType:
      (partnerToEdit?.partner_type as PartnerType) || partnerType || "customer",
    firstName: partnerToEdit?.first_name || "",
    lastName: partnerToEdit?.last_name || "",
    phoneNumber: partnerToEdit?.phone_number || "",
    businessType: "",
    companyName: partnerToEdit?.company_name || "",
    addressLine1: partnerToEdit?.address_line1 || "",
    addressLine2: partnerToEdit?.address_line2 || "",
    city: partnerToEdit?.city || "",
    state: partnerToEdit?.state || "",
    country: partnerToEdit?.country || "India",
    pinCode: partnerToEdit?.pin_code || "",
    gstNumber: partnerToEdit?.gst_number || "",
    panNumber: partnerToEdit?.pan_number || "",
    notes: partnerToEdit?.notes || "",
    image: null,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(
    partnerToEdit?.image_url || null,
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    partnerToEdit?.image_url || null,
  );

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageError(validation.error!);
      return;
    }

    setImageError(null);
    setFormData((prev) => ({ ...prev, image: file }));

    // Create preview using object URL
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleRemoveImage = () => {
    // Revoke blob URL if it exists
    if (imagePreview && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, image: null }));
    setExistingImageUrl(null);
    setImageError(null);
  };

  // Cleanup blob URLs on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const mutationOptions = {
      onSuccess: () => {
        toast.success(
          partnerToEdit
            ? "Partner updated successfully"
            : "Partner created successfully",
        );
        handleCancel();
      },
      onError: (error: Error) => {
        toast.error(error.message);
      },
    };

    if (partnerToEdit) {
      const updates: PartnerUpdate = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
        company_name: formData.companyName || null,
        address_line1: formData.addressLine1 || null,
        address_line2: formData.addressLine2 || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        pin_code: formData.pinCode || null,
        gst_number: formData.gstNumber || null,
        pan_number: formData.panNumber || null,
        notes: formData.notes || null,
        image_url: existingImageUrl,
      };

      updatePartner.mutate(
        {
          partnerId: partnerToEdit.id,
          updates,
          image: formData.image,
          companyId: user.company_id,
        },
        mutationOptions,
      );
    } else {
      const newPartner: Omit<PartnerInsert, "image_url"> = {
        partner_type: formData.partnerType,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
        email: null,
        company_name: formData.companyName || null,
        address_line1: formData.addressLine1 || null,
        address_line2: formData.addressLine2 || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        pin_code: formData.pinCode || null,
        gst_number: formData.gstNumber || null,
        pan_number: formData.panNumber || null,
        notes: formData.notes || null,
      };

      createPartner.mutate(
        {
          partner: newPartner,
          image: formData.image,
          companyId: user.company_id,
        },
        mutationOptions,
      );
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      partnerType: "customer",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      businessType: "",
      companyName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      country: "India",
      pinCode: "",
      gstNumber: "",
      panNumber: "",
      notes: "",
      image: null,
    });
    setImagePreview(null);
    setImageError(null);
    setExistingImageUrl(null);
    onOpenChange(false);
  };

  const isPending = createPartner.isPending || updatePartner.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          <SheetTitle>
            {partnerToEdit ? "Edit partner" : "Add partner"}
          </SheetTitle>
        </SheetHeader>

        {/* Form Content - Scrollable */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full overflow-y-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            {/* Image Upload & Basic Info */}
            <div className="flex flex-col gap-5 px-4 py-5">
              {/* Image Upload */}
              <div className="flex flex-col items-center gap-3">
                <label
                  htmlFor="partner-image"
                  className="relative flex flex-col items-center justify-center size-40 rounded-full border-shadow-gray bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Partner preview"
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <>
                      <IconUser className="size-12 text-gray-700 mb-2" />
                      <span className="text-base text-gray-700">Add image</span>
                    </>
                  )}
                  <input
                    id="partner-image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="sr-only"
                  />
                </label>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveImage}
                  >
                    Remove image
                  </Button>
                )}
              </div>
              {imageError && (
                <p className="text-sm text-red-600 text-center">{imageError}</p>
              )}

              {/* Partner Type */}
              <div className="flex flex-col gap-2">
                <Label>Partner type</Label>
                <RadioGroup
                  value={formData.partnerType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      partnerType: value as PartnerType,
                    }))
                  }
                  name="partner-type"
                  className="overflow-x-auto"
                  disabled={!!partnerToEdit}
                >
                  <RadioGroupItem value="customer">Customer</RadioGroupItem>
                  <RadioGroupItem value="supplier">Supplier</RadioGroupItem>
                  <RadioGroupItem value="vendor">Vendor</RadioGroupItem>
                  <RadioGroupItem value="agent">Agent</RadioGroupItem>
                </RadioGroup>
              </div>

              {/* Name Fields */}
              <div className="flex gap-4">
                <Input
                  placeholder="First name"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  required
                />
                <Input
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="relative">
                <IconPhone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                <Input
                  type="tel"
                  placeholder="Phone number"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phoneNumber: e.target.value,
                    }))
                  }
                  className="pl-12"
                />
              </div>
            </div>

            {/* Business Details Section */}
            <Collapsible
              open={showBusinessDetails}
              onOpenChange={setShowBusinessDetails}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showBusinessDetails ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Business details
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showBusinessDetails ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-5">
                  <div className="relative">
                    <IconBuildingFactory2 className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      placeholder="Business type"
                      value={formData.businessType}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          businessType: e.target.value,
                        }))
                      }
                      className="pl-12"
                    />
                  </div>
                  <div className="relative">
                    <IconBuilding className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      placeholder="Company name"
                      value={formData.companyName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                      className="pl-12"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

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

            {/* Tax Details Section */}
            <Collapsible
              open={showTaxDetails}
              onOpenChange={setShowTaxDetails}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showTaxDetails ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Tax Details
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showTaxDetails ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-5">
                  <div className="relative">
                    <IconId className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      placeholder="GST number"
                      value={formData.gstNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          gstNumber: e.target.value,
                        }))
                      }
                      className="pl-12"
                    />
                  </div>
                  <div className="relative">
                    <IconId className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      placeholder="PAN number"
                      value={formData.panNumber}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          panNumber: e.target.value,
                        }))
                      }
                      className="pl-12"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Additional Details Section */}
            <Collapsible
              open={showAdditionalDetails}
              onOpenChange={setShowAdditionalDetails}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showAdditionalDetails ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Additional Details
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showAdditionalDetails ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <Textarea
                  placeholder="Enter a note..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="min-h-32"
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          <SheetFooter>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending
                  ? partnerToEdit
                    ? "Updating..."
                    : "Saving..."
                  : partnerToEdit
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
