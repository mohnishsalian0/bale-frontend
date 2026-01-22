"use client";

import { useState, useEffect } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import {
  IconUser,
  IconPhone,
  IconAt,
  IconChevronDown,
  IconId,
  IconCurrencyRupee,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { usePartnerMutations } from "@/lib/query/hooks/partners";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { InputWrapper } from "@/components/ui/input-wrapper";
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
      companyName: partnerToEdit?.company_name || "",
      creditLimitEnabled: partnerToEdit?.credit_limit_enabled || false,
      creditLimit: partnerToEdit?.credit_limit || "",
      billingAddressLine1: partnerToEdit?.billing_address_line1 || "",
      billingAddressLine2: partnerToEdit?.billing_address_line2 || "",
      billingCity: partnerToEdit?.billing_city || "",
      billingState: partnerToEdit?.billing_state || "",
      billingCountry: partnerToEdit?.billing_country || "India",
      billingPinCode: partnerToEdit?.billing_pin_code || "",
      shippingSameAsBilling: partnerToEdit?.shipping_same_as_billing ?? true,
      shippingAddressLine1: partnerToEdit?.shipping_address_line1 || "",
      shippingAddressLine2: partnerToEdit?.shipping_address_line2 || "",
      shippingCity: partnerToEdit?.shipping_city || "",
      shippingState: partnerToEdit?.shipping_state || "",
      shippingCountry: partnerToEdit?.shipping_country || "India",
      shippingPinCode: partnerToEdit?.shipping_pin_code || "",
      gstNumber: partnerToEdit?.gst_number || "",
      panNumber: partnerToEdit?.pan_number || "",
      notes: partnerToEdit?.notes || "",
    },
  });

  // Watch credit limit enabled to conditionally show credit limit input
  const creditLimitEnabled = useWatch({
    control,
    name: "creditLimitEnabled",
  });

  // Watch shipping same as billing to conditionally show shipping address fields
  const shippingSameAsBilling = useWatch({
    control,
    name: "shippingSameAsBilling",
  });

  // Keep image handling separate from form state
  const [image, setImage] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(
    partnerToEdit?.image_url || null,
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [showContactDetails, setShowContactDetails] = useState(true);
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
        phone_number: data.phoneNumber || null,
        email: data.email || null,
        company_name: data.companyName,
        credit_limit_enabled: data.creditLimitEnabled,
        credit_limit: data.creditLimitEnabled ? data.creditLimit : 0,
        billing_address_line1: data.billingAddressLine1 || null,
        billing_address_line2: data.billingAddressLine2 || null,
        billing_city: data.billingCity || null,
        billing_state: data.billingState || null,
        billing_country: data.billingCountry || null,
        billing_pin_code: data.billingPinCode || null,
        shipping_same_as_billing: data.shippingSameAsBilling,
        // If shipping same as billing, store NULL. Otherwise store shipping fields.
        shipping_address_line1: data.shippingSameAsBilling
          ? null
          : data.shippingAddressLine1 || null,
        shipping_address_line2: data.shippingSameAsBilling
          ? null
          : data.shippingAddressLine2 || null,
        shipping_city: data.shippingSameAsBilling
          ? null
          : data.shippingCity || null,
        shipping_state: data.shippingSameAsBilling
          ? null
          : data.shippingState || null,
        shipping_country: data.shippingSameAsBilling
          ? null
          : data.shippingCountry || null,
        shipping_pin_code: data.shippingSameAsBilling
          ? null
          : data.shippingPinCode || null,
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
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        phone_number: data.phoneNumber || null,
        email: data.email || null,
        company_name: data.companyName,
        credit_limit_enabled: data.creditLimitEnabled,
        credit_limit: data.creditLimitEnabled ? data.creditLimit : 0,
        billing_address_line1: data.billingAddressLine1 || null,
        billing_address_line2: data.billingAddressLine2 || null,
        billing_city: data.billingCity || null,
        billing_state: data.billingState || null,
        billing_country: data.billingCountry || null,
        billing_pin_code: data.billingPinCode || null,
        shipping_same_as_billing: data.shippingSameAsBilling,
        // If shipping same as billing, store NULL. Otherwise store shipping fields.
        shipping_address_line1: data.shippingSameAsBilling
          ? null
          : data.shippingAddressLine1 || null,
        shipping_address_line2: data.shippingSameAsBilling
          ? null
          : data.shippingAddressLine2 || null,
        shipping_city: data.shippingSameAsBilling
          ? null
          : data.shippingCity || null,
        shipping_state: data.shippingSameAsBilling
          ? null
          : data.shippingState || null,
        shipping_country: data.shippingSameAsBilling
          ? null
          : data.shippingCountry || null,
        shipping_pin_code: data.shippingSameAsBilling
          ? null
          : data.shippingPinCode || null,
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
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            {/* Image Upload & Basic Info */}
            <div className="flex flex-col gap-6 px-4 py-5">
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

              {/* Partner name */}
              <InputWrapper
                label="Partner name"
                placeholder="Enter partner name"
                {...register("companyName")}
                required
                helpText="Ensure this name matches exactly as it appears in Tally"
                isError={!!errors.companyName}
                errorText={errors.companyName?.message}
              />
            </div>

            {/* Business Details Section */}
            <Collapsible
              open={showContactDetails}
              onOpenChange={setShowContactDetails}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showContactDetails ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Contact details
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showContactDetails ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  {/* Name Fields */}
                  <div className="flex gap-4">
                    <InputWrapper
                      placeholder="Enter first name"
                      {...register("firstName")}
                      className="flex-1"
                      isError={!!errors.firstName}
                      errorText={errors.firstName?.message}
                    />
                    <InputWrapper
                      placeholder="Enter last name"
                      {...register("lastName")}
                      className="flex-1"
                      isError={!!errors.lastName}
                      errorText={errors.lastName?.message}
                    />
                  </div>

                  {/* Phone Number */}
                  <InputWrapper
                    type="tel"
                    icon={<IconPhone />}
                    placeholder="Enter phone number"
                    {...register("phoneNumber")}
                    isError={!!errors.phoneNumber}
                    errorText={errors.phoneNumber?.message}
                  />

                  {/* Email */}
                  <InputWrapper
                    type="email"
                    icon={<IconAt />}
                    placeholder="Email address"
                    {...register("email")}
                    isError={!!errors.email}
                    errorText={errors.email?.message}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Addresses Section */}
            <Collapsible
              open={showAddress}
              onOpenChange={setShowAddress}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showAddress ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">Addresses</h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showAddress ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  {/* Billing Address */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-3 block">
                      Billing address
                    </Label>
                    <div className="flex flex-col gap-4">
                      <InputWrapper
                        placeholder="Address line 1"
                        {...register("billingAddressLine1")}
                      />
                      <InputWrapper
                        placeholder="Address line 2"
                        {...register("billingAddressLine2")}
                      />
                      <div className="flex gap-4">
                        <InputWrapper
                          placeholder="City"
                          {...register("billingCity")}
                          className="flex-1"
                        />
                        <InputWrapper
                          placeholder="State"
                          {...register("billingState")}
                          className="flex-1"
                        />
                      </div>
                      <div className="flex gap-4">
                        <InputWrapper
                          placeholder="Country"
                          {...register("billingCountry")}
                          className="flex-1"
                        />
                        <InputWrapper
                          placeholder="Pin code"
                          {...register("billingPinCode")}
                          isError={!!errors.billingPinCode}
                          errorText={errors.billingPinCode?.message}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Same as Billing Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Controller
                      name="shippingSameAsBilling"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          id="shipping-same-checkbox"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label
                      htmlFor="shipping-same-checkbox"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Shipping same as billing
                    </Label>
                  </div>

                  {/* Shipping Address (shown when toggle is unchecked) */}
                  {!shippingSameAsBilling && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-3 block">
                        Shipping address
                      </Label>
                      <div className="flex flex-col gap-4">
                        <InputWrapper
                          placeholder="Address line 1"
                          {...register("shippingAddressLine1")}
                        />
                        <InputWrapper
                          placeholder="Address line 2"
                          {...register("shippingAddressLine2")}
                        />
                        <div className="flex gap-4">
                          <InputWrapper
                            placeholder="City"
                            {...register("shippingCity")}
                            className="flex-1"
                          />
                          <InputWrapper
                            placeholder="State"
                            {...register("shippingState")}
                            className="flex-1"
                          />
                        </div>
                        <div className="flex gap-4">
                          <InputWrapper
                            placeholder="Country"
                            {...register("shippingCountry")}
                            className="flex-1"
                          />
                          <InputWrapper
                            placeholder="Pin code"
                            {...register("shippingPinCode")}
                            isError={!!errors.shippingPinCode}
                            errorText={errors.shippingPinCode?.message}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tax & Credit Details Section */}
            <Collapsible
              open={showTaxDetails}
              onOpenChange={setShowTaxDetails}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showTaxDetails ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Tax & Credit Details
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showTaxDetails ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  {/* GST Number */}
                  <InputWrapper
                    placeholder="GST number"
                    icon={<IconId />}
                    {...register("gstNumber")}
                    isError={!!errors.gstNumber}
                    errorText={errors.gstNumber?.message}
                  />

                  {/* PAN Number */}
                  <InputWrapper
                    placeholder="PAN number"
                    icon={<IconId />}
                    {...register("panNumber")}
                    isError={!!errors.panNumber}
                    errorText={errors.panNumber?.message}
                  />

                  {/* Credit Limit Toggle */}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="credit-limit-toggle">
                      Enable credit limit
                    </Label>
                    <Controller
                      name="creditLimitEnabled"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="credit-limit-toggle"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </div>

                  {/* Credit Limit Amount */}
                  {creditLimitEnabled && (
                    <InputWrapper
                      type="number"
                      placeholder="Credit limit amount"
                      icon={<IconCurrencyRupee />}
                      {...register("creditLimit")}
                      min="0"
                      step="0.01"
                      isError={!!errors.creditLimit}
                      errorText={errors.creditLimit?.message}
                    />
                  )}
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
