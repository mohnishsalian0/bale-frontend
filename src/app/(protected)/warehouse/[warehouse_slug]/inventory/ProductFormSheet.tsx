"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { IconChevronDown, IconX, IconPhoto } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import MultipleSelector, {
  type Option,
} from "@/components/ui/multiple-selector";
import { validateImageFile, MAX_PRODUCT_IMAGES } from "@/lib/storage";
import { getProductAttributeLists } from "@/lib/queries/products";
import type {
  ProductDetailView,
  ProductUpsertData,
} from "@/types/products.types";
import type { StockType, MeasuringUnit } from "@/types/database/enums";
import { useSession } from "@/contexts/session-context";
import {
  useProductMutations,
  useCreateProductMaterial,
  useCreateProductColor,
  useCreateProductTag,
  useProductImageMutations,
} from "@/lib/query/hooks/products";

interface ProductFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productToEdit?: ProductDetailView;
}

interface ProductFormData {
  name: string;
  productNumber: string;
  showOnCatalog: boolean;
  materials: Option[];
  colors: Option[];
  gsm: string;
  threadCount: string;
  tags: Option[];
  stockType: StockType | "";
  measuringUnit: MeasuringUnit | "";
  costPrice: string;
  sellingPrice: string;
  minStockAlert: boolean;
  minStockThreshold: string;
  hsnCode: string;
  notes: string;
  images: File[];
}

export function ProductFormSheet({
  open,
  onOpenChange,
  productToEdit,
}: ProductFormSheetProps) {
  const { user } = useSession();
  const { create, update } = useProductMutations();
  const createMaterial = useCreateProductMaterial();
  const createColor = useCreateProductColor();
  const createTag = useCreateProductTag();
  const { upload, deleteImages, updateField } = useProductImageMutations();

  const [formData, setFormData] = useState<ProductFormData>({
    name: productToEdit?.name || "",
    productNumber: "", // Not used in edit mode
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
    stockType: productToEdit?.stock_type as StockType,
    measuringUnit: (productToEdit?.measuring_unit as MeasuringUnit) || "",
    costPrice: productToEdit?.cost_price_per_unit?.toString() || "",
    sellingPrice: productToEdit?.selling_price_per_unit?.toString() || "",
    minStockAlert: productToEdit?.min_stock_alert ?? false,
    minStockThreshold: productToEdit?.min_stock_threshold?.toString() || "",
    hsnCode: productToEdit?.hsn_code || "",
    notes: productToEdit?.notes || "",
    images: [],
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showFeaturesImages, setShowFeaturesImages] = useState(false);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]); // Track original images to detect removals

  // Compute saving state from mutations
  const saving =
    create.isPending ||
    update.isPending ||
    createMaterial.isPending ||
    createColor.isPending ||
    createTag.isPending ||
    upload.isPending ||
    deleteImages.isPending ||
    updateField.isPending;

  // Attribute options for MultipleSelector
  const [materialOptions, setMaterialOptions] = useState<Option[]>([]);
  const [colorOptions, setColorOptions] = useState<Option[]>([]);
  const [tagOptions, setTagOptions] = useState<Option[]>([]);

  // Fetch attribute lists on mount
  useEffect(() => {
    const fetchAttributes = async () => {
      const attributes = await getProductAttributeLists();
      setMaterialOptions(
        attributes.materials.map((m) => ({ value: m.id, label: m.name })),
      );
      setColorOptions(
        attributes.colors.map((c) => ({ value: c.id, label: c.name })),
      );
      setTagOptions(
        attributes.tags.map((t) => ({ value: t.id, label: t.name })),
      );
    };
    fetchAttributes();
  }, []);

  // Simple handlers - new items are identified by value === label
  // They will be inserted to DB on form submit
  const handleMaterialsChange = (options: Option[]) => {
    setFormData((prev) => ({ ...prev, materials: options }));
  };

  const handleColorsChange = (options: Option[]) => {
    setFormData((prev) => ({ ...prev, colors: options }));
  };

  const handleTagsChange = (options: Option[]) => {
    setFormData((prev) => ({ ...prev, tags: options }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check if adding these files would exceed the limit (existing + new uploads + incoming files)
    const totalImages =
      existingImages.length + formData.images.length + files.length;
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

    // Add files to form data
    const newImages = [...formData.images, ...files];
    setFormData((prev) => ({ ...prev, images: newImages }));

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
      const newImages = formData.images.filter((_, i) => i !== adjustedIndex);
      setFormData((prev) => ({ ...prev, images: newImages }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Step 1: Resolve attribute IDs (create new ones if needed)
      const materialIds: string[] = [];
      for (const opt of formData.materials) {
        if (opt.value === opt.label) {
          // New material, create it
          const id = await createMaterial.mutateAsync(opt.label);
          materialIds.push(id);
        } else {
          materialIds.push(opt.value);
        }
      }

      const colorIds: string[] = [];
      for (const opt of formData.colors) {
        if (opt.value === opt.label) {
          // New color, create it
          const id = await createColor.mutateAsync(opt.label);
          colorIds.push(id);
        } else {
          colorIds.push(opt.value);
        }
      }

      const tagIds: string[] = [];
      for (const opt of formData.tags) {
        if (opt.value === opt.label) {
          // New tag, create it
          const id = await createTag.mutateAsync(opt.label);
          tagIds.push(id);
        } else {
          tagIds.push(opt.value);
        }
      }

      // Step 2: Prepare product data
      const productData: ProductUpsertData = {
        name: formData.name,
        show_on_catalog: formData.showOnCatalog,
        gsm: formData.gsm ? parseInt(formData.gsm) : null,
        thread_count_cm: formData.threadCount
          ? parseInt(formData.threadCount)
          : null,
        stock_type: formData.stockType as StockType,
        measuring_unit: formData.measuringUnit || null,
        cost_price_per_unit: formData.costPrice
          ? parseFloat(formData.costPrice)
          : null,
        selling_price_per_unit: formData.sellingPrice
          ? parseFloat(formData.sellingPrice)
          : null,
        min_stock_alert: formData.minStockAlert,
        min_stock_threshold: formData.minStockThreshold
          ? parseInt(formData.minStockThreshold)
          : null,
        hsn_code: formData.hsnCode || null,
        notes: formData.notes || null,
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
        if (formData.images.length > 0) {
          const newImageUrls = await upload.mutateAsync({
            companyId: user.company_id,
            productId,
            images: formData.images,
            offset: existingImages.length,
          });
          imageUrls.push(...newImageUrls);
        }

        // Update product images field if there are changes
        if (
          formData.images.length > 0 ||
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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save product";
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      name: "",
      productNumber: "PROD-001",
      showOnCatalog: true,
      materials: [],
      colors: [],
      gsm: "",
      threadCount: "",
      tags: [],
      stockType: "",
      measuringUnit: "",
      costPrice: "",
      sellingPrice: "",
      minStockAlert: false,
      minStockThreshold: "",
      hsnCode: "",
      notes: "",
      images: [],
    });
    setImagePreviews([]);
    setImageError(null);
    setExistingImages([]);
    setOriginalImages([]);
    onOpenChange(false);
  };

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
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto">
            {/* Basic Info */}
            <div className="flex flex-col gap-6 px-4 py-5">
              {/* Product Name */}
              <Input
                placeholder="Product name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />

              {/* Stock Type */}
              <div className="flex flex-col gap-2">
                <Label required>Stock Type</Label>
                <RadioGroup
                  value={formData.stockType}
                  onValueChange={(value) => {
                    const stockType = value as StockType;
                    let measuringUnit: MeasuringUnit | "" = "";

                    // Auto-set measuring unit based on stock type
                    if (stockType === "batch") {
                      measuringUnit = "unit";
                    }

                    setFormData((prev) => ({
                      ...prev,
                      stockType,
                      measuringUnit,
                    }));
                  }}
                  name="stock-type"
                  disabled={!!productToEdit}
                >
                  <RadioGroupItem value="roll">Roll</RadioGroupItem>
                  <RadioGroupItem value="batch">Batch</RadioGroupItem>
                  <RadioGroupItem value="piece">Piece</RadioGroupItem>
                </RadioGroup>
              </div>

              {/* Measuring Unit - Only show for roll type */}
              {formData.stockType === "roll" && (
                <div className="flex flex-col gap-2">
                  <Label required>Measuring Unit</Label>
                  <RadioGroup
                    value={formData.measuringUnit}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        measuringUnit: value as MeasuringUnit,
                      }))
                    }
                    name="measuring-unit"
                    disabled={!!productToEdit}
                  >
                    <RadioGroupItem value="metre">Metre</RadioGroupItem>
                    <RadioGroupItem value="kilogram">Kilogram</RadioGroupItem>
                    <RadioGroupItem value="yard">Yard</RadioGroupItem>
                  </RadioGroup>
                </div>
              )}

              {/* Purchase & Sale Price */}
              <div className="flex gap-4">
                <Input
                  type="number"
                  placeholder="Purchase price"
                  value={formData.costPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      costPrice: e.target.value,
                    }))
                  }
                  className="flex-1"
                  step="0.01"
                />
                <Input
                  type="number"
                  placeholder="Sale price"
                  value={formData.sellingPrice}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sellingPrice: e.target.value,
                    }))
                  }
                  className="flex-1"
                  step="0.01"
                />
              </div>

              {/* Minimum Stock Alert */}
              <div className="flex items-center justify-between">
                <Label>Minimum stock alert</Label>
                <Switch
                  checked={formData.minStockAlert}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, minStockAlert: checked }))
                  }
                />
              </div>

              {/* Minimum Stock Threshold */}
              {formData.minStockAlert && (
                <Input
                  type="number"
                  placeholder="Minimum stock threshold"
                  value={formData.minStockThreshold}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      minStockThreshold: e.target.value,
                    }))
                  }
                  step="1"
                  min="0"
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
                  <MultipleSelector
                    value={formData.materials}
                    defaultOptions={materialOptions}
                    onChange={handleMaterialsChange}
                    placeholder="Materials"
                    creatable
                    triggerSearchOnFocus
                    hidePlaceholderWhenSelected
                    emptyIndicator={
                      <p className="text-center text-sm text-gray-500">
                        No materials found
                      </p>
                    }
                  />

                  {/* Colors */}
                  <MultipleSelector
                    value={formData.colors}
                    defaultOptions={colorOptions}
                    onChange={handleColorsChange}
                    placeholder="Colors"
                    creatable
                    triggerSearchOnFocus
                    hidePlaceholderWhenSelected
                    emptyIndicator={
                      <p className="text-center text-sm text-gray-500">
                        No colors found
                      </p>
                    }
                  />

                  {/* GSM & Thread Count */}
                  <div className="flex gap-4">
                    <Input
                      type="number"
                      placeholder="GSM"
                      value={formData.gsm}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          gsm: e.target.value,
                        }))
                      }
                      className="flex-1"
                      step="1"
                      min="50"
                      max="500"
                    />
                    <Input
                      type="number"
                      placeholder="Thread count"
                      value={formData.threadCount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          threadCount: e.target.value,
                        }))
                      }
                      className="flex-1"
                      step="1"
                      min="1"
                    />
                  </div>

                  {/* Tags */}
                  <MultipleSelector
                    value={formData.tags}
                    defaultOptions={tagOptions}
                    onChange={handleTagsChange}
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
                    {existingImages.length + formData.images.length <
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
                      <p className="text-sm text-red-600">{imageError}</p>
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
                <div className="flex flex-col gap-6">
                  {/* Show on Catalog */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <Label>Show on catalog</Label>
                      <span className="text-sm font-light text-gray-500">
                        Display this product on your public sales catalog
                      </span>
                    </div>
                    <Switch
                      checked={formData.showOnCatalog}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          showOnCatalog: checked,
                        }))
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* HSN Code */}
                  <Input
                    placeholder="HSN code"
                    value={formData.hsnCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hsnCode: e.target.value,
                      }))
                    }
                  />

                  {/* Notes */}
                  <Textarea
                    placeholder="Enter a note..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="min-h-32"
                  />
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
                  !formData.stockType ||
                  (formData.stockType === "roll" && !formData.measuringUnit)
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
    </Sheet>
  );
}
