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
import type { StockType } from "@/types/database/enums";
import {
  useInfiniteProducts,
  useProductAttributes,
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
}

interface ProductSelectionStepProps {
  productUnits: Record<string, StockUnitSpec[]>;
  onOpenUnitSheet: (
    product: ProductListView,
    hasExistingUnits: boolean,
  ) => void;
  onAddNewProduct: () => void;
}

export function ProductSelectionStep({
  productUnits,
  onOpenUnitSheet,
  onAddNewProduct,
}: ProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");

  // Fetch products and attributes
  const {
    data: productsData,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts({
    is_active: true,
    order_by: "sequence_number",
    order_direction: "desc",
    search_term: debouncedSearchQuery || undefined,
  });

  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();

  // Flatten infinite query pages and combine with units state
  const flatProducts = productsData?.pages.flatMap((page) => page.data) || [];

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading;

  // Combine products data with units state
  const products: ProductWithUnits[] = useMemo(
    () =>
      flatProducts.map((product) => ({
        ...product,
        units: productUnits[product.id] || [],
      })),
    [flatProducts, productUnits],
  );

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger fetch when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Filter and sort products using useMemo (client-side filtering for material/color/tag only)
  const filteredProducts = useMemo(() => {
    // Filter products (search is now handled server-side)
    let filtered = products.filter((product) => {
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

    // Sort: products with units first
    filtered.sort((a, b) => {
      const aHasUnits = a.units.length > 0;
      const bHasUnits = b.units.length > 0;
      if (aHasUnits && !bHasUnits) return -1;
      if (!aHasUnits && bHasUnits) return 1;
      return 0;
    });

    return filtered;
  }, [products, materialFilter, colorFilter, tagsFilter]);

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
      </div>

      {/* Product List - Scrollable */}
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No products found</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {filteredProducts.map((product) => {
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
                        className="text-xs text-gray-500 truncate mt-1"
                      >
                        {productInfoText}
                      </p>
                    </div>

                    {/* Add/Count Button */}
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
                        onClick={() => onOpenUnitSheet(product, hasUnits)}
                      >
                        <IconPlus />
                        Add {product.stock_type}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 border-t border-border">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 ml-3">Loading more...</p>
              </div>
            )}

            {/* End of list indicator */}
            {!hasNextPage && products.length > 0 && (
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
