"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconChevronRight } from "@tabler/icons-react";
import { useDebounce } from "@/hooks/use-debounce";
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
import type { ProductWithInventoryListView } from "@/types/products.types";
import type { StockType, MeasuringUnit } from "@/types/database/enums";
import type { ScannedStockUnit } from "./QRScannerStep";
import {
  useInfiniteProductsWithInventoryAndOrders,
  useProductAttributes,
  useProductsWithInventoryByIds,
} from "@/lib/query/hooks/products";

interface InventoryProductListStepProps {
  warehouseId: string;
  scannedUnits: ScannedStockUnit[];
  orderProducts?: Record<string, number>; // productId -> requested_quantity
  onProductSelect: (product: ProductWithInventoryListView) => void;
}

export function InventoryProductListStep({
  warehouseId,
  scannedUnits,
  orderProducts = {},
  onProductSelect,
}: InventoryProductListStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");

  // Determine if we should show all products or only order products
  const showAllProducts = Object.keys(orderProducts).length === 0;

  // Get all product IDs that need to be fetched
  const orderProductIds = useMemo(
    () => Object.keys(orderProducts),
    [orderProducts],
  );

  // Fetch products with inventory by IDs using TanStack Query
  const { data: fetchedProductsById, isLoading: fetchingByIds } =
    useProductsWithInventoryByIds(orderProductIds, warehouseId);

  // Build attribute filters
  const attributeFilters = [];
  if (materialFilter !== "all") {
    attributeFilters.push({ group: "material" as const, id: materialFilter });
  }
  if (colorFilter !== "all") {
    attributeFilters.push({ group: "color" as const, id: colorFilter });
  }
  if (tagsFilter !== "all") {
    attributeFilters.push({ group: "tag" as const, id: tagsFilter });
  }

  // Fetch products with inventory and infinite scroll
  const {
    data: productsData,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProductsWithInventoryAndOrders(
    warehouseId,
    {
      is_active: true,
      order_by: "sequence_number",
      order_direction: "desc",
      search_term: debouncedSearchQuery || undefined,
      attributes: attributeFilters.length > 0 ? attributeFilters : undefined,
    },
    30,
    showAllProducts,
  );

  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();

  // Flatten infinite query pages
  const flatProducts = productsData?.pages.flatMap((page) => page.data) || [];

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading || fetchingByIds;

  // Combine fetched products and infinite scroll products
  const products: ProductWithInventoryListView[] = useMemo(() => {
    const result: ProductWithInventoryListView[] = [];
    const seenIds = new Set<string>();

    // First: Add all fetched products (from orders) with their data
    fetchedProductsById.forEach((product) => {
      seenIds.add(product.id);
      result.push(product);
    });

    // Second: Add infinite scroll products if showAllProducts (skip duplicates)
    if (showAllProducts) {
      flatProducts.forEach((product) => {
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          result.push(product);
        }
      });
    }

    return result;
  }, [fetchedProductsById, flatProducts, showAllProducts]);

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger fetch when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Calculate total quantity for a product
  const getTotalQuantity = (productId: string): number => {
    return scannedUnits
      .filter((unit) => unit.stockUnit.product?.id === productId)
      .reduce((total, unit) => total + unit.quantity, 0);
  };

  // Format quantity display with unit
  const formatQuantityDisplay = (
    product: ProductWithInventoryListView,
  ): string | null => {
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
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Filters Section */}
      <div className="flex flex-col gap-3 px-4 py-4 shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">Select product</h3>

        {/* Search - Only show if showAllProducts is true */}
        {showAllProducts && (
          <div className="relative">
            <Input
              placeholder="Search for product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
          </div>
        )}

        {/* Filter Dropdowns - Only show if showAllProducts is true */}
        {showAllProducts && (
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
        )}
      </div>

      {/* Product List - Scrollable */}
      <div className="flex-1" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No products available</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col border-b border-border">
              {products.map((product) => {
                const imageUrl = product.product_images?.[0];
                const productInfoText = getProductInfo(product);
                const quantityDisplay = formatQuantityDisplay(product);
                const requestedQuantity = orderProducts[product.id];
                const availableQuantity =
                  product.inventory.in_stock_quantity ?? 0;

                const unitAbbr = getMeasuringUnitAbbreviation(
                  product.measuring_unit as MeasuringUnit,
                );

                // Determine if available is below requested
                const isBelowRequested =
                  requestedQuantity !== undefined &&
                  availableQuantity < requestedQuantity;

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onProductSelect(product)}
                    disabled={orderProducts[product.id] == 0}
                    className="flex items-center gap-3 p-4 border-t border-gray-200 hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
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
                      {/* Show requested quantity if product is from an order */}
                      {requestedQuantity !== undefined && (
                        <p
                          className={`text-xs mt-1 ${
                            isBelowRequested ? "text-red-700" : "text-gray-500"
                          }`}
                        >
                          Pending request: {requestedQuantity} {unitAbbr} |
                          Available: {availableQuantity} {unitAbbr}
                        </p>
                      )}
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

            {/* Loading more indicator - Only show if showAllProducts */}
            {showAllProducts && isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 border-t border-border">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 ml-3">Loading more...</p>
              </div>
            )}

            {/* End of list indicator - Only show if showAllProducts */}
            {showAllProducts && !hasNextPage && products.length > 0 && (
              <div className="flex items-center justify-center py-4 border-t border-border">
                <p className="text-sm text-gray-500">
                  All products loaded ({products.length})
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
