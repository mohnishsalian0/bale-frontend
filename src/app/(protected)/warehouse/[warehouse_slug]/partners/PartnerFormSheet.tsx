"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import {
  IconUser,
  IconPhone,
  IconAt,
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
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { PartnerFormData, partnerSchema } from "@/lib/validations/partner";

interface PartnerFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerType?: PartnerType;
  partnerToEdit?: PartnerDetailView;
}

export function PartnerFormSheet({
  open,
  onOpenChange,
  partnerType,
  partnerToEdit,
}: PartnerFormSheetProps) {
  const { user } = useSession();
  const { createPartner, updatePartner } = usePartnerMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      partnerType:
        (partnerToEdit?.partner_type as PartnerType) ||
        partnerType ||
        "customer",
      firstName: partnerToEdit?.first_name || "",
      lastName: partnerToEdit?.last_name || "",
      phoneNumber: partnerToEdit?.phone_number || "",
      email: partnerToEdit?.email || "",
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
    },
  });

  // Keep image handling separate from form state
  const [image, setImage] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(
    partnerToEdit?.image_url || null,
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [showBusinessDetails, setShowBusinessDetails] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [showTaxDetails, setShowTaxDetails] = useState(true);
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
    setImage(file);

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
    setImage(null);
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

  const onSubmit = async (data: PartnerFormData) => {
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
        console.error("Failed to create partner: ", error.message);
        toast.error("Failed to create partner");
      },
    };

    if (partnerToEdit) {
      const updates: PartnerUpdate = {
        first_name: data.firstName,
        last_name: data.lastName,
        phone_number: data.phoneNumber,
        email: data.email || null,
        company_name: data.companyName || null,
        address_line1: data.addressLine1 || null,
        address_line2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        pin_code: data.pinCode || null,
        gst_number: data.gstNumber || null,
        pan_number: data.panNumber || null,
        notes: data.notes || null,
        image_url: existingImageUrl,
      };

      updatePartner.mutate(
        {
          partnerId: partnerToEdit.id,
          partnerData: updates,
          image: image,
          companyId: user.company_id,
        },
        mutationOptions,
      );
    } else {
      const newPartner: Omit<PartnerInsert, "image_url"> = {
        partner_type: data.partnerType,
        first_name: data.firstName,
        last_name: data.lastName,
        phone_number: data.phoneNumber,
        email: data.email || null,
        company_name: data.companyName || null,
        address_line1: data.addressLine1 || null,
        address_line2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        country: data.country || null,
        pin_code: data.pinCode || null,
        gst_number: data.gstNumber || null,
        pan_number: data.panNumber || null,
        notes: data.notes || null,
      };

      createPartner.mutate(
        {
          partner: newPartner,
          image: image,
          companyId: user.company_id,
        },
        mutationOptions,
      );
    }
  };

  const handleCancel = () => {
    // Reset form
    reset();
    setImage(null);
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
          onSubmit={handleSubmit(onSubmit)}
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
                <Label required>Partner type</Label>
                <Controller
                  name="partnerType"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      name="partner-type"
                      className="overflow-x-auto scrollbar-hide"
                      disabled={!!partnerToEdit}
                    >
                      <RadioGroupItem value="customer">Customer</RadioGroupItem>
                      <RadioGroupItem value="supplier">Supplier</RadioGroupItem>
                      <RadioGroupItem value="vendor">Vendor</RadioGroupItem>
                      <RadioGroupItem value="agent">Agent</RadioGroupItem>
                    </RadioGroup>
                  )}
                />
                {errors.partnerType && (
                  <p className="text-sm text-red-600">
                    {errors.partnerType.message}
                  </p>
                )}
              </div>

              {/* Name Fields */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-4">
                  <InputWithIcon
                    label="First name"
                    placeholder="Enter first name"
                    {...register("firstName")}
                    required
                    className="flex-1"
                  />
                  <InputWithIcon
                    label="Last name"
                    placeholder="Enter last name"
                    {...register("lastName")}
                    required
                    className="flex-1"
                  />
                </div>
                {(errors.firstName || errors.lastName) && (
                  <div className="flex gap-4">
                    {errors.firstName && (
                      <p className="text-sm text-red-600 flex-1">
                        {errors.firstName.message}
                      </p>
                    )}
                    {errors.lastName && (
                      <p className="text-sm text-red-600 flex-1">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-2">
                <InputWithIcon
                  type="tel"
                  label="Phone number"
                  icon={<IconPhone />}
                  placeholder="Enter phone number"
                  {...register("phoneNumber")}
                  required
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-red-600">
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <InputWithIcon
                  type="email"
                  icon={<IconAt />}
                  placeholder="Email address"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
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
                      {...register("businessType")}
                      className="pl-12"
                    />
                  </div>
                  <div className="relative">
                    <IconBuilding className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                    <Input
                      placeholder="Company name"
                      {...register("companyName")}
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
                    {...register("addressLine1")}
                  />
                  <Input
                    placeholder="Address line 2"
                    {...register("addressLine2")}
                  />
                  <div className="flex gap-4">
                    <Input placeholder="City" {...register("city")} />
                    <Input placeholder="State" {...register("state")} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4">
                      <Input placeholder="Country" {...register("country")} />
                      <Input placeholder="Pin code" {...register("pinCode")} />
                    </div>
                    {errors.pinCode && (
                      <p className="text-sm text-red-600">
                        {errors.pinCode.message}
                      </p>
                    )}
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
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <IconId className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                      <Input
                        placeholder="GST number"
                        {...register("gstNumber")}
                        className="pl-12"
                      />
                    </div>
                    {errors.gstNumber && (
                      <p className="text-sm text-red-600">
                        {errors.gstNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <IconId className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
                      <Input
                        placeholder="PAN number"
                        {...register("panNumber")}
                        className="pl-12"
                      />
                    </div>
                    {errors.panNumber && (
                      <p className="text-sm text-red-600">
                        {errors.panNumber.message}
                      </p>
                    )}
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
                  {...register("notes")}
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
