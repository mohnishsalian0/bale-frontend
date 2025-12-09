"use client";

import { useState } from "react";
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
import type { ProductListView } from "@/types/products.types";
import type { StockType } from "@/types/database/enums";
import {
  useInfiniteProducts,
  useProductAttributes,
} from "@/lib/query/hooks/products";

interface QRProductSelectionStepProps {
  onProductSelect: (product: ProductListView) => void;
}

export function QRProductSelectionStep({
  onProductSelect,
}: QRProductSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagsFilter, setTagsFilter] = useState<string>("all");

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
  } = useInfiniteProducts({
    is_active: true,
    search_term: debouncedSearchQuery || undefined,
    attributes: attributeFilters.length > 0 ? attributeFilters : undefined,
  });

  const { data: attributesData, isLoading: attributesLoading } =
    useProductAttributes();

  // Flatten infinite query pages data
  const products = productsData?.pages.flatMap((page) => page.data) || [];

  const materials = attributesData?.materials || [];
  const colors = attributesData?.colors || [];
  const tags = attributesData?.tags || [];
  const loading = productsLoading || attributesLoading;

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger fetch when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  // Products are now filtered server-side, no need for client-side filtering
  const filteredProducts = products;

  return (
    <>
      {/* Filters Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0">
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
      <div
        className="flex flex-col flex-1 overflow-y-auto"
        onScroll={handleScroll}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading products...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No products available</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {filteredProducts.map((product) => {
                const imageUrl = product.product_images?.[0];

                const productInfoText = getProductInfo(product);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onProductSelect(product)}
                    className="flex items-center gap-3 p-4 border-t border-gray-200 hover:bg-gray-100 transition-colors text-left"
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

                    {/* Right Chevron */}
                    <IconChevronRight className="size-5 text-gray-400 shrink-0" />
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
