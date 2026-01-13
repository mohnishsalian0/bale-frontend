"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconPlus, IconMinus } from "@tabler/icons-react";
import { useDebounce } from "@/hooks/use-debounce";
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
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import type { ProductListView } from "@/types/products.types";
import { pluralizeStockType } from "@/lib/utils/pluralize";
import type { StockType, MeasuringUnit } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import {
  useInfiniteProducts,
  useProductAttributes,
  useProductsByIds,
} from "@/lib/query/hooks/products";

export interface StockUnitSpec {
  id: string; // temp ID for UI
  quantity: number;
  grade?: string;
  supplier_number?: string;
  manufactured_on?: Date;
  location?: string;
  notes?: string;
  count: number; // for duplicate specs
}

export interface ProductWithUnits extends ProductListView {
  units: StockUnitSpec[];
  requested_quantity?: number; // From order (purchase/sales), null for manual
}

interface ProductSelectionStepProps {
  productUnits: Record<string, StockUnitSpec[]>;
  orderProducts?: Record<string, number>; // productId -> pending_quantity from order
  onOpenUnitSheet: (
    product: ProductListView,
    hasExistingUnits: boolean,
  ) => void;
  onAddNewProduct: () => void;
  showAllProducts: boolean; // true = infinite scroll all products, false = only show productUnits keys
}

export function ProductSelectionStep({
  productUnits,
  orderProducts = {},
  onOpenUnitSheet,
  onAddNewProduct,
  showAllProducts,
}: ProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");

  // Combine all product IDs that need to be fetched
  const allIdsToFetch = useMemo(
    () => [
      ...new Set([...Object.keys(productUnits), ...Object.keys(orderProducts)]),
    ],
    [productUnits, orderProducts],
  );

  // Fetch products by IDs using TanStack Query
  const { data: fetchedProductsById, isLoading: fetchingByIds } =
    useProductsByIds(allIdsToFetch);

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

  // Fetch products and attributes
  const {
    data: productsData,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts(
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

  // Flatten infinite query pages and combine with units state
  const flatProducts = productsData?.pages.flatMap((page) => page.data) || [];

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading || fetchingByIds;

  // Combine fetched products and infinite scroll products with units and requested quantities
  const products: ProductWithUnits[] = useMemo(() => {
    const result: ProductWithUnits[] = [];
    const seenIds = new Set<string>();

    // First: Add all fetched products (from orders + productUnits) with their data
    fetchedProductsById.forEach((product) => {
      seenIds.add(product.id);
      result.push({
        ...product,
        units: productUnits[product.id] || [],
        requested_quantity: orderProducts[product.id],
      });
    });

    // Second: Add infinite scroll products if showAllProducts (skip duplicates)
    if (showAllProducts) {
      flatProducts.forEach((product) => {
        if (!seenIds.has(product.id)) {
          seenIds.add(product.id);
          result.push({
            ...product,
            units: productUnits[product.id] || [],
            requested_quantity: undefined,
          });
        }
      });
    }

    return result;
  }, [
    fetchedProductsById,
    flatProducts,
    productUnits,
    orderProducts,
    showAllProducts,
  ]);

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger fetch when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Sort products: products with units first
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aHasUnits = a.units.length > 0;
      const bHasUnits = b.units.length > 0;
      if (aHasUnits && !bHasUnits) return -1;
      if (!aHasUnits && bHasUnits) return 1;
      return 0;
    });
  }, [products]);

  return (
    <>
      {/* Filters Section */}
      <div className="flex flex-col gap-3 px-4 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Select products
          </h3>
          <Button variant="ghost" onClick={onAddNewProduct}>
            <IconPlus className="size-4" />
            New product
          </Button>
        </div>

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
          <div className="flex gap-3 overflow-x-auto p-1">
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
        )}
      </div>

      {/* Product List - Scrollable */}
      <div className="flex-1" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading products...</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No products found</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {sortedProducts.map((product) => {
                const imageUrl = product.product_images?.[0];

                const hasUnits = product.units.length > 0;

                // For piece type: show total quantity (pieces), for others: show count of units
                const totalUnits =
                  product.stock_type === "piece"
                    ? product.units.reduce(
                        (sum, unit) => sum + unit.quantity,
                        0,
                      )
                    : product.units.reduce((sum, unit) => sum + unit.count, 0);

                const productInfoText = getProductInfo(product);

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-4 border-t border-gray-200"
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

                    {/* Add/Count Button with Requested Quantity */}
                    <div className="flex flex-col items-end gap-2">
                      {hasUnits ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onOpenUnitSheet(product, hasUnits)}
                        >
                          <IconMinus />
                          {pluralizeStockType(
                            totalUnits,
                            product.stock_type as StockType,
                          )}
                          <IconPlus />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={product.requested_quantity === 0}
                          onClick={() => onOpenUnitSheet(product, hasUnits)}
                        >
                          <IconPlus />
                          Add {product.stock_type}
                        </Button>
                      )}
                      {/* Display requested quantity if product is from an order */}
                      {product.requested_quantity !== undefined && (
                        <p className="text-xs text-gray-500">
                          Pending request: {product.requested_quantity}{" "}
                          {getMeasuringUnitAbbreviation(
                            product.measuring_unit as MeasuringUnit,
                          )}
                        </p>
                      )}
                    </div>
                  </div>
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
    </>
  );
}
