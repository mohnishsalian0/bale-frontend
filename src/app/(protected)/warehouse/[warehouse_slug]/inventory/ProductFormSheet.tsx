"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconChevronDown,
  IconX,
  IconPhoto,
  IconCurrencyRupee,
  IconScan,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
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
import MultipleSelector from "@/components/ui/multiple-selector";
import { validateImageFile, MAX_PRODUCT_IMAGES } from "@/lib/storage";
import type {
  ProductDetailView,
  ProductUpsertData,
} from "@/types/products.types";
import type { StockType, MeasuringUnit, TaxType } from "@/types/database/enums";
import { GST_RATES } from "@/types/database/enums";
import { useSession } from "@/contexts/session-context";
import {
  useProductMutations,
  useCreateProductAttribute,
  useProductImageMutations,
  useProductAttributes,
  useProductByCode,
} from "@/lib/query/hooks/products";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { productSchema, ProductFormData } from "@/lib/validations/product";
import IconGSM from "@/components/icons/IconGSM";
import IconThreadCount from "@/components/icons/IconThreadCount";
import { getProductIcon } from "@/lib/utils/product";
import { ProductCodeScanner } from "@/components/layouts/product-code-scanner";

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToEdit?: ProductDetailView;
}

export function ProductFormSheet({
  open,
  onOpenChange,
  productToEdit,
}: ProductFormSheetProps) {
  const { user } = useSession();
  const { create, update } = useProductMutations();
  const createAttribute = useCreateProductAttribute();
  const { upload, deleteImages, updateField } = useProductImageMutations();
  const { data: attributesData } = useProductAttributes();

  // Initialize form with React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    control,
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: productToEdit?.name || "",
      productCode: productToEdit?.product_code || "",
      showOnCatalog: productToEdit?.show_on_catalog ?? true,
      materials:
        productToEdit?.materials.map((m) => ({
          value: m.id,
          label: m.name,
        })) || [],
      colors:
        productToEdit?.colors.map((c) => ({
          value: c.id,
          label: c.name,
        })) || [],
      gsm: productToEdit?.gsm?.toString() || "",
      threadCount: productToEdit?.thread_count_cm?.toString() || "",
      tags:
        productToEdit?.tags.map((t) => ({ value: t.id, label: t.name })) || [],
      stockType: (productToEdit?.stock_type as StockType) || undefined,
      measuringUnit: (productToEdit?.measuring_unit as MeasuringUnit) || null,
      costPrice: productToEdit?.cost_price_per_unit?.toString() || "",
      sellingPrice: productToEdit?.selling_price_per_unit?.toString() || "",
      minStockAlert: productToEdit?.min_stock_alert ?? false,
      minStockThreshold: productToEdit?.min_stock_threshold?.toString() || "",
      taxType: (productToEdit?.tax_type as TaxType) || "gst",
      gstRate: productToEdit?.gst_rate ?? 5,
      hsnCode: productToEdit?.hsn_code || "",
      notes: productToEdit?.notes || "",
    },
  });

  // Watch stockType, measuringUnit, taxType and minStockAlert for conditional rendering
  const stockType = useWatch({ control, name: "stockType" });
  const measuringUnit = useWatch({ control, name: "measuringUnit" });
  const minStockAlert = useWatch({ control, name: "minStockAlert" });
  const taxType = useWatch({ control, name: "taxType" });

  // Image handling state (not part of form validation)
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showFeaturesImages, setShowFeaturesImages] = useState(true);
  const [showPricingTax, setShowPricingTax] = useState(true);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]); // Track original images to detect removals

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Query for scanned product
  const {
    data: scannedProduct,
    isError: isProductError,
    isLoading: isProductLoading,
  } = useProductByCode(scannedCode);

  // Compute saving state from mutations
  const saving =
    create.isPending ||
    update.isPending ||
    createAttribute.isPending ||
    upload.isPending ||
    deleteImages.isPending ||
    updateField.isPending;

  // Attribute options for MultipleSelector - derived from hook data
  const materialOptions =
    attributesData?.materials.map((m) => ({ value: m.id, label: m.name })) ||
    [];
  const colorOptions =
    attributesData?.colors.map((c) => ({ value: c.id, label: c.name })) || [];
  const tagOptions =
    attributesData?.tags.map((t) => ({ value: t.id, label: t.name })) || [];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check if adding these files would exceed the limit (existing + new uploads + incoming files)
    const totalImages = existingImages.length + images.length + files.length;
    if (totalImages > MAX_PRODUCT_IMAGES) {
      setImageError(`Maximum ${MAX_PRODUCT_IMAGES} images allowed`);
      return;
    }

    // Validate each file
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setImageError(validation.error!);
        return;
      }
    }

    setImageError(null);

    // Add files to images state
    const newImages = [...images, ...files];
    setImages(newImages);

    // Create previews using object URLs
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    // Revoke blob URL if it exists
    const urlToRemove = imagePreviews[index];
    if (urlToRemove && urlToRemove.startsWith("blob:")) {
      URL.revokeObjectURL(urlToRemove);
    }

    // Check if this is an existing image or a new upload
    const isExistingImage = index < existingImages.length;

    if (isExistingImage) {
      // Remove from existing images
      const newExistingImages = existingImages.filter((_, i) => i !== index);
      setExistingImages(newExistingImages);
    } else {
      // Remove from new uploads
      const adjustedIndex = index - existingImages.length;
      const newImages = images.filter((_, i) => i !== adjustedIndex);
      setImages(newImages);
    }

    // Update previews
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImagePreviews(newPreviews);
    setImageError(null);
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreviews]);

  // Handle scanned product code result
  useEffect(() => {
    if (!scannedCode || isProductLoading) return;

    if (isProductError) {
      // Product not found - populate field with scanned code
      setValue("productCode", scannedCode);
      toast.info(`Product code "${scannedCode}" entered`);
      setScannedCode(null); // Clear after handling
      return;
    }

    if (scannedProduct) {
      // Product found - show error
      toast.error(
        `Product "${scannedProduct.name}" already exists with this code`,
      );
      setScannedCode(null); // Clear after showing error
    }
  }, [scannedProduct, isProductError, isProductLoading, scannedCode, setValue]);

  const handleCodeScanned = (code: string) => {
    setScannedCode(code);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Step 1: Resolve attribute IDs (create new ones if needed)
      const materialIds: string[] = [];
      for (const opt of data.materials) {
        if (opt.value === opt.label) {
          // New material, create it
          const id = await createAttribute.mutateAsync({
            name: opt.label,
            groupName: "material",
          });
          materialIds.push(id);
        } else {
          materialIds.push(opt.value);
        }
      }

      const colorIds: string[] = [];
      for (const opt of data.colors) {
        if (opt.value === opt.label) {
          // New color, create it
          const id = await createAttribute.mutateAsync({
            name: opt.label,
            groupName: "color",
          });
          colorIds.push(id);
        } else {
          colorIds.push(opt.value);
        }
      }

      const tagIds: string[] = [];
      for (const opt of data.tags) {
        if (opt.value === opt.label) {
          // New tag, create it
          const id = await createAttribute.mutateAsync({
            name: opt.label,
            groupName: "tag",
          });
          tagIds.push(id);
        } else {
          tagIds.push(opt.value);
        }
      }

      // Step 2: Prepare product data
      const productData: ProductUpsertData = {
        name: data.name,
        product_code: data.productCode || null,
        show_on_catalog: data.showOnCatalog,
        gsm: data.gsm || null,
        thread_count_cm: data.threadCount || null,
        stock_type: data.stockType as StockType,
        measuring_unit: data.measuringUnit || null,
        cost_price_per_unit: data.costPrice || null,
        selling_price_per_unit: data.sellingPrice || null,
        min_stock_alert: data.minStockAlert,
        min_stock_threshold: data.minStockThreshold || null,
        tax_type: data.taxType,
        gst_rate: data.taxType === "gst" ? data.gstRate : null,
        hsn_code: data.hsnCode || null,
        notes: data.notes || null,
      };

      const attributeIds = { materialIds, colorIds, tagIds };

      // Step 3: Create or update product
      let productId: string;
      if (productToEdit) {
        productId = await update.mutateAsync({
          productId: productToEdit.id,
          productData,
          attributeIds,
        });
      } else {
        productId = await create.mutateAsync({
          productData,
          attributeIds,
        });
      }

      // Step 4: Handle images
      try {
        // Delete removed images from storage
        if (productToEdit) {
          const removedImages = originalImages.filter(
            (url) => !existingImages.includes(url),
          );
          if (removedImages.length > 0) {
            await deleteImages.mutateAsync(removedImages);
          }
        }

        const imageUrls: string[] = [...existingImages];

        // Upload new images
        if (images.length > 0) {
          const newImageUrls = await upload.mutateAsync({
            companyId: user.company_id,
            productId,
            images: images,
            offset: existingImages.length,
          });
          imageUrls.push(...newImageUrls);
        }

        // Update product images field if there are changes
        if (
          images.length > 0 ||
          existingImages.length !== (productToEdit?.product_images?.length || 0)
        ) {
          await updateField.mutateAsync({
            productId,
            imageUrls,
          });
        }
      } catch (uploadError) {
        console.error("Image upload failed:", uploadError);
        // Don't fail the whole operation if image upload fails
        toast.warning("Product saved, but some images failed to upload");
      }

      // Success!
      toast.success(
        productToEdit
          ? "Product updated successfully"
          : "Product created successfully",
      );
      handleCancel();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleCancel = () => {
    // Reset form
    reset();
    setImages([]);
    setImagePreviews([]);
    setImageError(null);
    setExistingImages([]);
    setOriginalImages([]);
    onOpenChange(false);
  };

  const RollIcon = getProductIcon("roll");
  const BatchIcon = getProductIcon("batch");
  const PieceIcon = getProductIcon("piece");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {/* Header */}
        <SheetHeader>
          <SheetTitle>
            {productToEdit ? "Edit product" : "Create product"}
          </SheetTitle>
        </SheetHeader>

        {/* Form Content - Scrollable */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            {/* Basic Info */}
            <div className="flex flex-col gap-6 px-4 py-5">
              {/* Product Name */}
              <InputWrapper
                label="Product name"
                placeholder="Enter a name"
                {...register("name")}
                required
                isError={!!errors.name}
                errorText={errors.name?.message}
              />

              {/* Product Code */}
              <div className="flex items-end gap-2">
                <InputWrapper
                  label="Product code"
                  placeholder="PROD-XXX (auto-generated if empty)"
                  {...register("productCode")}
                  isError={!!errors.productCode}
                  errorText={errors.productCode?.message}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  onClick={() => setShowScanner(true)}
                  title="Scan barcode/QR code"
                  className="size-11 border border-gray-300"
                >
                  <IconScan />
                </Button>
              </div>

              {/* Stock Type */}
              <div className="flex flex-col gap-2">
                <Label required>Stock Type</Label>
                <Controller
                  name="stockType"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value as string}
                      onValueChange={(value) => {
                        const stockType = value as StockType;
                        let measuringUnit: MeasuringUnit | null = null;

                        // Auto-set measuring unit based on stock type
                        if (stockType === "batch") {
                          measuringUnit = "unit";
                        }

                        field.onChange(stockType);
                        setValue("measuringUnit", measuringUnit);
                      }}
                      name="stock-type"
                      disabled={!!productToEdit}
                    >
                      <RadioGroupItem value="roll">
                        <RollIcon />
                        Roll
                      </RadioGroupItem>
                      <RadioGroupItem value="batch">
                        <BatchIcon />
                        Batch
                      </RadioGroupItem>
                      <RadioGroupItem value="piece">
                        <PieceIcon />
                        Piece
                      </RadioGroupItem>
                    </RadioGroup>
                  )}
                />
                {errors.stockType && (
                  <p className="text-sm text-red-700">
                    {errors.stockType.message}
                  </p>
                )}
              </div>

              {/* Measuring Unit - Only show for roll type */}
              {stockType === "roll" && (
                <div className="flex flex-col gap-2">
                  <Label required>Measuring Unit</Label>
                  <Controller
                    name="measuringUnit"
                    control={control}
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value as string}
                        onValueChange={field.onChange}
                        name="measuring-unit"
                        disabled={!!productToEdit}
                      >
                        <RadioGroupItem value="metre">Metre</RadioGroupItem>
                        <RadioGroupItem value="kilogram">
                          Kilogram
                        </RadioGroupItem>
                        <RadioGroupItem value="yard">Yard</RadioGroupItem>
                      </RadioGroup>
                    )}
                  />
                  {errors.measuringUnit && (
                    <p className="text-sm text-red-700">
                      {errors.measuringUnit.message}
                    </p>
                  )}
                </div>
              )}

              {/* Minimum Stock Alert */}
              <div className="flex items-center justify-between gap-2">
                <Label>Minimum stock alert</Label>
                <Controller
                  name="minStockAlert"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* Minimum Stock Threshold */}
              {minStockAlert && (
                <InputWrapper
                  type="number"
                  placeholder="Minimum stock threshold"
                  {...register("minStockThreshold")}
                  step="1"
                  min="0"
                  isError={!!errors.minStockThreshold}
                  errorText={errors.minStockThreshold?.message}
                />
              )}
            </div>

            {/* Features & Images Section */}
            <Collapsible
              open={showFeaturesImages}
              onOpenChange={setShowFeaturesImages}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showFeaturesImages ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Features & Images
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showFeaturesImages ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  {/* Materials */}
                  <div className="flex flex-col gap-2">
                    <Label required>Materials</Label>
                    <Controller
                      name="materials"
                      control={control}
                      render={({ field }) => (
                        <MultipleSelector
                          value={field.value}
                          defaultOptions={materialOptions}
                          onChange={field.onChange}
                          placeholder="Select materials"
                          creatable
                          triggerSearchOnFocus
                          hidePlaceholderWhenSelected
                          emptyIndicator={
                            <p className="text-center text-sm text-gray-500">
                              No materials found
                            </p>
                          }
                        />
                      )}
                    />
                    {errors.materials && (
                      <p className="text-sm text-red-700">
                        {errors.materials.message}
                      </p>
                    )}
                  </div>

                  {/* Colors */}
                  <div className="flex flex-col gap-2">
                    <Label required>Colors</Label>
                    <Controller
                      name="colors"
                      control={control}
                      render={({ field }) => (
                        <MultipleSelector
                          value={field.value}
                          defaultOptions={colorOptions}
                          onChange={field.onChange}
                          placeholder="Select colors"
                          creatable
                          triggerSearchOnFocus
                          hidePlaceholderWhenSelected
                          emptyIndicator={
                            <p className="text-center text-sm text-gray-500">
                              No colors found
                            </p>
                          }
                        />
                      )}
                    />
                    {errors.colors && (
                      <p className="text-sm text-red-700">
                        {errors.colors.message}
                      </p>
                    )}
                  </div>

                  {/* Image Upload */}
                  <div className="flex flex-col gap-3">
                    <Label>Product Images (Max {MAX_PRODUCT_IMAGES})</Label>

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {imagePreviews.map((preview, index) => (
                          <div
                            key={index}
                            className="relative size-20 rounded-lg overflow-hidden border border-gray-200"
                          >
                            <Image
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 size-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                            >
                              <IconX className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Images Button */}
                    {existingImages.length + images.length <
                      MAX_PRODUCT_IMAGES && (
                      <label
                        htmlFor="product-images"
                        className="flex flex-col items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <IconPhoto className="size-8 text-gray-500" />
                        <span className="text-sm text-gray-700">
                          Add images
                        </span>
                        <span className="text-xs text-gray-500">
                          JPEG, PNG, WEBP · Upto 6 files · 2MB each
                        </span>
                        <input
                          id="product-images"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageSelect}
                          className="sr-only"
                          multiple
                        />
                      </label>
                    )}

                    {imageError && (
                      <p className="text-sm text-red-700">{imageError}</p>
                    )}
                  </div>

                  {/* Tags */}
                  <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                      <MultipleSelector
                        value={field.value}
                        defaultOptions={tagOptions}
                        onChange={field.onChange}
                        placeholder="Tags"
                        creatable
                        triggerSearchOnFocus
                        hidePlaceholderWhenSelected
                        emptyIndicator={
                          <p className="text-center text-sm text-gray-500">
                            No tags found
                          </p>
                        }
                      />
                    )}
                  />

                  {/* GSM & Thread Count */}
                  <div className="flex gap-4">
                    <InputWrapper
                      type="number"
                      placeholder="GSM"
                      icon={<IconGSM />}
                      {...register("gsm")}
                      step="1"
                      min="50"
                      max="500"
                      className="flex-1"
                      isError={!!errors.gsm}
                      errorText={errors.gsm?.message}
                    />
                    <InputWrapper
                      type="number"
                      placeholder="Thread count"
                      icon={<IconThreadCount />}
                      {...register("threadCount")}
                      step="1"
                      min="1"
                      className="flex-1"
                      isError={!!errors.threadCount}
                      errorText={errors.threadCount?.message}
                    />
                  </div>

                  {/* Show on Catalog */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col">
                      <Label>Show on catalog</Label>
                      <span className="text-xs font-light text-gray-500 mt-1">
                        Display this product on your public sales catalog
                      </span>
                    </div>
                    <Controller
                      name="showOnCatalog"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-2"
                        />
                      )}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Pricing & Tax Section */}
            <Collapsible
              open={showPricingTax}
              onOpenChange={setShowPricingTax}
              className="border-t border-gray-200 px-4 py-5"
            >
              <CollapsibleTrigger
                className={`flex items-center justify-between w-full ${showPricingTax ? "mb-5" : "mb-0"}`}
              >
                <h3 className="text-lg font-medium text-gray-900">
                  Pricing & Tax
                </h3>
                <IconChevronDown
                  className={`size-6 text-gray-500 transition-transform ${showPricingTax ? "rotate-180" : "rotate-0"}`}
                />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="flex flex-col gap-6">
                  {/* Purchase & Sale Price */}
                  <div className="flex gap-4">
                    <InputWrapper
                      type="number"
                      placeholder="Purchase price"
                      icon={<IconCurrencyRupee />}
                      {...register("costPrice")}
                      className="flex-1"
                      step="0.01"
                      min="0"
                      isError={!!errors.costPrice}
                      errorText={errors.costPrice?.message}
                    />
                    <InputWrapper
                      type="number"
                      placeholder="Sale price"
                      icon={<IconCurrencyRupee />}
                      {...register("sellingPrice")}
                      className="flex-1"
                      step="0.01"
                      min="0"
                      isError={!!errors.sellingPrice}
                      errorText={errors.sellingPrice?.message}
                    />
                  </div>

                  {/* HSN Code */}
                  <InputWrapper
                    placeholder="HSN code"
                    {...register("hsnCode")}
                    isError={!!errors.hsnCode}
                    errorText={errors.hsnCode?.message}
                  />

                  {/* Tax Type */}
                  <div className="flex flex-col gap-2">
                    <Label>Tax Type</Label>
                    <Controller
                      name="taxType"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup
                          value={field.value as string}
                          onValueChange={(value) => {
                            const taxType = value as TaxType;
                            field.onChange(taxType);
                            // Reset GST rate if switching to no_tax
                            if (taxType === "no_tax") {
                              setValue("gstRate", null);
                            } else if (taxType === "gst" && !taxType) {
                              // Set default GST rate when switching to GST
                              setValue("gstRate", 5);
                            }
                          }}
                          name="tax-type"
                        >
                          <RadioGroupItem value="no_tax">No Tax</RadioGroupItem>
                          <RadioGroupItem value="gst">GST</RadioGroupItem>
                        </RadioGroup>
                      )}
                    />
                    {errors.taxType && (
                      <p className="text-sm text-red-700">
                        {errors.taxType.message}
                      </p>
                    )}
                  </div>

                  {/* GST Rate - Only show when tax type is GST */}
                  {taxType === "gst" && (
                    <div className="flex flex-col gap-2">
                      <Label required>GST Rate</Label>
                      <Controller
                        name="gstRate"
                        control={control}
                        render={({ field }) => (
                          <RadioGroup
                            value={field.value?.toString() || ""}
                            onValueChange={(value) =>
                              field.onChange(parseFloat(value))
                            }
                            name="gst-rate"
                          >
                            {GST_RATES.map((rate) => (
                              <RadioGroupItem
                                key={rate}
                                value={rate.toString()}
                              >
                                {rate}%
                              </RadioGroupItem>
                            ))}
                          </RadioGroup>
                        )}
                      />
                      {errors.gstRate && (
                        <p className="text-sm text-red-700">
                          {errors.gstRate.message}
                        </p>
                      )}
                    </div>
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
                <div className="flex flex-col gap-6">
                  {/* Notes */}
                  <div className="flex flex-col gap-2">
                    <Textarea
                      placeholder="Enter a note..."
                      {...register("notes")}
                      className="min-h-32"
                    />
                    {errors.notes && (
                      <p className="text-sm text-red-700">
                        {errors.notes.message}
                      </p>
                    )}
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
              <Button
                type="submit"
                disabled={
                  saving ||
                  !stockType ||
                  (stockType === "roll" && !measuringUnit)
                }
                className="flex-1"
              >
                {saving
                  ? productToEdit
                    ? "Updating..."
                    : "Saving..."
                  : productToEdit
                    ? "Update"
                    : "Save"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>

      {/* Product Code Scanner */}
      <ProductCodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onCodeScanned={handleCodeScanned}
      />
    </Sheet>
  );
}
