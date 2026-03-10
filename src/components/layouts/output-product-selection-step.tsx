"use client";

import { useState, useMemo } from "react";
import { IconSearch, IconPlus, IconCheck } from "@tabler/icons-react";
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
import { useDebounce } from "@/hooks/use-debounce";
import {
  useInfiniteProducts,
  useProductAttributes,
} from "@/lib/query/hooks/products";
import type { StockType } from "@/types/database/enums";
import { ProductFormSheet } from "@/app/(protected)/warehouse/[warehouse_slug]/products/ProductFormSheet";

interface OutputProductSelectionStepProps {
  selectedProductId: string | null;
  onSelectProduct: (productId: string) => void;
  disableProductChange?: boolean;
}

export function OutputProductSelectionStep({
  selectedProductId,
  onSelectProduct,
  disableProductChange = false,
}: OutputProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  // Build attribute filters
  const attributeFilters = [];
  if (materialFilter !== "all") {
    attributeFilters.push({ group: "material" as const, id: materialFilter });
  }
  if (colorFilter !== "all") {
    attributeFilters.push({ group: "color" as const, id: colorFilter });
  }
  if (tagsFilter !== "all") {
    attributeFilters.push({ group: "product_tag" as const, id: tagsFilter });
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
    true, // Enable infinite scroll
  );

  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();

  // Flatten infinite query pages
  const flatProducts = productsData?.pages.flatMap((page) => page.data) || [];

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading;

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = [...flatProducts];

    // Sort: selected product first, then alphabetically
    filtered.sort((a, b) => {
      if (a.id === selectedProductId) return -1;
      if (b.id === selectedProductId) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return filtered;
  }, [flatProducts, selectedProductId]);

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger fetch when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="relative flex flex-col flex-1 overflow-hidden">
      {/* Disable Overlay */}
      {disableProductChange && (
        <div className="absolute inset-0 bg-white/50 z-10 cursor-not-allowed" />
      )}

      <div
        className="flex-1 flex flex-col overflow-y-auto"
        onScroll={handleScroll}
      >
        {/* Header Section */}
        <div className="flex flex-col gap-3 p-4 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Select output product
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
        <div className="flex-1">
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
                  const isSelected = product.id === selectedProductId;
                  const productInfo = getProductInfo(product);
                  const imageUrl = product.product_images?.[0];

                  return (
                    <button
                      key={product.id}
                      onClick={() => onSelectProduct(product.id)}
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
                          title={productInfo}
                          className="text-sm text-gray-500 truncate"
                        >
                          {productInfo}
                        </p>
                      </div>

                      {/* Selection Checkmark */}
                      {isSelected && (
                        <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                          <IconCheck className="size-4 text-white" />
                        </div>
                      )}
                    </button>
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
              {!hasNextPage && filteredProducts.length > 0 && (
                <div className="flex items-center justify-center py-4 border-t border-border">
                  <p className="text-sm text-gray-500">
                    All products loaded ({filteredProducts.length})
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Add Product Sheet */}
        <ProductFormSheet
          open={showCreateProduct}
          onOpenChange={setShowCreateProduct}
        />
      </div>
    </div>
  );
}
