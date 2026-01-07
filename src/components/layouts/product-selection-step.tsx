"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconPlus, IconTrash } from "@tabler/icons-react";
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
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import {
  getAvailableStockText,
  getProductIcon,
  getProductInfo,
} from "@/lib/utils/product";
import type { ProductWithInventoryListView } from "@/types/products.types";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import {
  useInfiniteProductsWithInventory,
  useProductAttributes,
  useProductsWithInventoryByIds,
} from "@/lib/query/hooks/products";
import { ProductQuantitySheet } from "@/components/layouts/product-quantity-sheet";
import { ProductFormSheet } from "@/app/(protected)/warehouse/[warehouse_slug]/products/ProductFormSheet";

interface ProductWithSelection extends ProductWithInventoryListView {
  selected: boolean;
  quantity: number;
}

interface ProductSelectionStepProps {
  warehouseId: string;
  contextType: "sales" | "purchase";
  productSelections: Record<
    string,
    { selected: boolean; quantity: number; rate: number }
  >;
  onQuantityChange: (productId: string, quantity: number, rate: number) => void;
  onRemoveProduct: (productId: string) => void;
}

export function ProductSelectionStep({
  warehouseId,
  contextType,
  productSelections,
  onQuantityChange,
  onRemoveProduct,
}: ProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");

  // Internal state for sheets
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithInventoryListView | null>(null);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  // Get selected product IDs
  const selectedProductIds = useMemo(
    () =>
      Object.entries(productSelections)
        .filter(([, selection]) => selection.selected && selection.quantity > 0)
        .map(([productId]) => productId),
    [productSelections],
  );

  // Fetch selected products with inventory by IDs using TanStack Query
  const { data: fetchedProductsById, isLoading: fetchingByIds } =
    useProductsWithInventoryByIds(selectedProductIds, warehouseId);

  // Handlers for internal sheets
  const handleOpenQuantitySheet = (product: ProductWithInventoryListView) => {
    setSelectedProduct(product);
    setShowQuantitySheet(true);
  };

  const handleQuantityConfirm = (data: { quantity: number; rate: number }) => {
    if (selectedProduct) {
      onQuantityChange(selectedProduct.id, data.quantity, data.rate);
    }
  };

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
  } = useInfiniteProductsWithInventory(warehouseId, {
    is_active: true,
    search_term: debouncedSearchQuery || undefined,
    attributes: attributeFilters.length > 0 ? attributeFilters : undefined,
  });

  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();

  // Flatten infinite query pages data
  const flatProducts = productsData?.pages.flatMap((page) => page.data) || [];

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading || fetchingByIds;

  // Combine fetched and infinite scroll products with selection data in single pass
  const products: ProductWithSelection[] = useMemo(() => {
    const result: ProductWithSelection[] = [];
    const seenIds = new Set<string>();

    // First: Add all fetched products with selection data
    fetchedProductsById.forEach((product) => {
      seenIds.add(product.id);
      result.push({
        ...product,
        selected: productSelections[product.id]?.selected || false,
        quantity: productSelections[product.id]?.quantity || 0,
      });
    });

    // Second: Add infinite scroll products (skip duplicates)
    flatProducts.forEach((product) => {
      if (!seenIds.has(product.id)) {
        seenIds.add(product.id);
        result.push({
          ...product,
          selected: productSelections[product.id]?.selected || false,
          quantity: productSelections[product.id]?.quantity || 0,
        });
      }
    });

    return result;
  }, [fetchedProductsById, flatProducts, productSelections]);

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger fetch when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Sort products: selected products first
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (a.selected && !b.selected) return -1;
      if (!a.selected && b.selected) return 1;
      return 0;
    });
  }, [products]);

  const rateForSheet = useMemo(() => {
    if (!selectedProduct) return 0;

    const existingSelection = productSelections[selectedProduct.id];

    // If an existing selection for this product has a rate, use it.
    if (existingSelection) {
      return existingSelection.rate;
    }

    // Otherwise, set a default rate based on contextType
    if (contextType === "sales") {
      return selectedProduct.selling_price_per_unit || 0;
    }

    if (contextType === "purchase") {
      return selectedProduct.cost_price_per_unit || 0;
    }

    return 0; // Fallback
  }, [selectedProduct, productSelections, contextType]);

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Select products
          </h3>
          <Button variant="ghost" onClick={() => setShowCreateProduct(true)}>
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
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
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

                const productInfoText = getProductInfo(product);

                const unitAbbreviation = getMeasuringUnitAbbreviation(
                  product.measuring_unit as MeasuringUnit | null,
                );

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

                    {/* Add/Quantity Button */}
                    <div className="flex flex-col items-end gap-2">
                      {product.selected && product.quantity > 0 ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenQuantitySheet(product)}
                          >
                            {product.quantity} {unitAbbreviation}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
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
                          onClick={() => handleOpenQuantitySheet(product)}
                        >
                          <IconPlus />
                          Add {product.stock_type}
                        </Button>
                      )}
                      <p className="text-xs text-gray-500">
                        {getAvailableStockText(product)} avail.
                      </p>
                    </div>
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

      {/* Product Quantity Sheet */}
      {selectedProduct && (
        <ProductQuantitySheet
          key={selectedProduct.id}
          open={showQuantitySheet}
          onOpenChange={setShowQuantitySheet}
          product={selectedProduct}
          initialQuantity={productSelections[selectedProduct.id]?.quantity || 0}
          initialRate={rateForSheet}
          onConfirm={handleQuantityConfirm}
        />
      )}

      {/* Add Product Sheet */}
      <ProductFormSheet
        key="new"
        open={showCreateProduct}
        onOpenChange={setShowCreateProduct}
      />
    </>
  );
}
