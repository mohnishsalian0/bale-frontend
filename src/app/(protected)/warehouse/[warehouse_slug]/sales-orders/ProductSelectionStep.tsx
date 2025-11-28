"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import {
  getAvailableStockText,
  getProductIcon,
  getProductInfo,
} from "@/lib/utils/product";
import type {
  ProductWithInventory,
  ProductMaterial,
  ProductColor,
  ProductTag,
} from "@/lib/queries/products";
import { MeasuringUnit, StockType } from "@/types/database/enums";

interface ProductWithSelection extends ProductWithInventory {
  selected: boolean;
  quantity: number;
}

interface ProductSelectionStepProps {
  products: ProductWithSelection[];
  materials: ProductMaterial[];
  colors: ProductColor[];
  tags: ProductTag[];
  loading: boolean;
  onOpenQuantitySheet: (product: ProductWithInventory) => void;
  onAddNewProduct: () => void;
  onRemoveProduct: (productId: string) => void;
}

export function ProductSelectionStep({
  products,
  materials,
  colors,
  tags,
  loading,
  onOpenQuantitySheet,
  onAddNewProduct,
  onRemoveProduct,
}: ProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");

  // Filter and sort products using useMemo
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter products
    let filtered = products.filter((product) => {
      // Search filter (case-insensitive)
      if (
        query &&
        !(
          product.name.toLowerCase().includes(query) ||
          product.materials?.some((m) =>
            m.name.toLowerCase().includes(query),
          ) ||
          product.colors?.some((c) => c.name.toLowerCase().includes(query))
        )
      )
        return false;

      // Material filter (exact match by ID)
      if (
        materialFilter !== "all" &&
        !product.materials?.some((m) => m.id === materialFilter)
      )
        return false;

      // Color filter (exact match by ID)
      if (
        colorFilter !== "all" &&
        !product.colors?.some((c) => c.id === colorFilter)
      )
        return false;

      // Tags filter (exact match by ID)
      if (
        tagsFilter !== "all" &&
        !product.tags?.some((t) => t.id === tagsFilter)
      )
        return false;

      return true;
    });

    // Sort: selected products first
    filtered.sort((a, b) => {
      if (a.selected && !b.selected) return -1;
      if (!a.selected && b.selected) return 1;
      return 0;
    });

    return filtered;
  }, [products, searchQuery, materialFilter, colorFilter, tagsFilter]);

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Select products
          </h3>
          <Button variant="ghost" onClick={onAddNewProduct}>
            <IconPlus className="size-4" />
            New product
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search for product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex gap-3 p-1 overflow-x-auto shrink-0">
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="flex-1 h-10 min-w-34">
              <SelectValue placeholder="Material" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All materials</SelectItem>
              {materials.map((material) => (
                <SelectItem key={material.id} value={material.id}>
                  {material.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={colorFilter} onValueChange={setColorFilter}>
            <SelectTrigger className="flex-1 h-10 min-w-34">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All colors</SelectItem>
              {colors.map((color) => (
                <SelectItem key={color.id} value={color.id}>
                  {color.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tagsFilter} onValueChange={setTagsFilter}>
            <SelectTrigger className="flex-1 h-10 min-w-34">
              <SelectValue placeholder="Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No products found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredProducts.map((product) => {
              const imageUrl = product.product_images?.[0];

              const productInfoText = getProductInfo(product);

              const unitAbbreviation = getMeasuringUnitAbbreviation(
                product.measuring_unit as MeasuringUnit | null,
              );

              return (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-4 border-b border-gray-200"
                >
                  {/* Product Image */}
                  <ImageWrapper
                    size="md"
                    shape="square"
                    imageUrl={imageUrl}
                    alt={product.name}
                    placeholderIcon={getProductIcon(
                      product.stock_type as StockType,
                    )}
                  />

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={product.name}
                      className="text-base font-medium text-gray-700 truncate"
                    >
                      {product.name}
                    </p>
                    <p
                      title={productInfoText}
                      className="text-xs text-gray-500 truncate"
                    >
                      {productInfoText}
                    </p>
                  </div>

                  {/* Add/Quantity Button */}
                  <div className="flex flex-col items-end gap-2">
                    {product.selected && product.quantity > 0 ? (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenQuantitySheet(product)}
                        >
                          {product.quantity} {unitAbbreviation}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => onRemoveProduct(product.id)}
                        >
                          <IconTrash />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenQuantitySheet(product)}
                      >
                        <IconPlus />
                        Add {product.stock_type}
                      </Button>
                    )}
                    <p className="text-xs text-gray-500">
                      {getAvailableStockText(product)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
