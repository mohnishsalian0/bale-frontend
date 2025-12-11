"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconChevronRight } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import {
  getMeasuringUnitAbbreviation,
  pluralizeMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import type { ProductListView, ProductAttribute } from "@/types/products.types";
import type { StockType, MeasuringUnit } from "@/types/database/enums";
import type { ScannedStockUnit } from "./QRScannerStep";

interface InventoryProductListStepProps {
  products: ProductListView[];
  materials: ProductAttribute[];
  colors: ProductAttribute[];
  tags: ProductAttribute[];
  loading: boolean;
  scannedUnits: ScannedStockUnit[];
  onProductSelect: (product: ProductListView) => void;
}

export function InventoryProductListStep({
  products,
  materials,
  colors,
  tags,
  loading,
  scannedUnits,
  onProductSelect,
}: InventoryProductListStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");

  // Filter products using useMemo
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Filter products
    return products.filter((product) => {
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
  }, [products, searchQuery, materialFilter, colorFilter, tagsFilter]);

  // Calculate total quantity for a product
  const getTotalQuantity = (productId: string): number => {
    return scannedUnits
      .filter((unit) => unit.stockUnit.product?.id === productId)
      .reduce((total, unit) => total + unit.quantity, 0);
  };

  // Format quantity display with unit
  const formatQuantityDisplay = (product: ProductListView): string | null => {
    const totalQuantity = getTotalQuantity(product.id);
    if (totalQuantity === 0) return null;

    const unitAbbr = getMeasuringUnitAbbreviation(
      product.measuring_unit as MeasuringUnit,
    );
    const pluralizedUnit = pluralizeMeasuringUnitAbbreviation(
      totalQuantity,
      unitAbbr,
    );

    return `${totalQuantity} ${pluralizedUnit} added`;
  };

  return (
    <>
      {/* Filters Section */}
      <div className="flex flex-col gap-3 px-4 py-4 shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">Select product</h3>

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
        <div className="flex gap-3">
          <Select value={materialFilter} onValueChange={setMaterialFilter}>
            <SelectTrigger className="flex-1 h-10">
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
            <SelectTrigger className="flex-1 h-10">
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
            <SelectTrigger className="flex-1 h-10">
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
            <p className="text-sm text-gray-500">No products available</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredProducts.map((product) => {
              const imageUrl = product.product_images?.[0];
              const productInfoText = getProductInfo(product);
              const quantityDisplay = formatQuantityDisplay(product);

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onProductSelect(product)}
                  className="flex items-center gap-3 p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors text-left"
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
                      className="text-sm text-gray-500 truncate"
                    >
                      {productInfoText}
                    </p>
                  </div>

                  {/* Quantity and Right Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {quantityDisplay && (
                      <span className="text-sm font-medium text-green-700">
                        {quantityDisplay}
                      </span>
                    )}
                    <IconChevronRight className="size-5 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
