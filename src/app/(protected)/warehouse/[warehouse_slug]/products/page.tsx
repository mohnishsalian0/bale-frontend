"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Fab } from "@/components/ui/fab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import ImageWrapper from "@/components/ui/image-wrapper";
import { ProductFormSheet } from "./ProductFormSheet";
import {
  useProductsWithInventoryAndOrders,
  useProductAttributes,
} from "@/lib/query/hooks/products";
import { useProductAggregates } from "@/lib/query/hooks/aggregates";
import { useSession } from "@/contexts/session-context";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { GlowIndicator } from "@/components/ui/glow-indicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { Badge } from "@/components/ui/badge";

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [sortOption, setSortOption] = useState<string>("newest");

  // Determine order_by and order_direction for server-side sorting
  const { order_by, order_direction } = useMemo(() => {
    switch (sortOption) {
      case "oldest":
        return {
          order_by: "created_at" as const,
          order_direction: "asc" as const,
        };
      case "newest":
      default:
        return {
          order_by: "created_at" as const,
          order_direction: "desc" as const,
        };
    }
  }, [sortOption]);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Build attribute filters
  const attributeFilters = [];
  if (materialFilter !== "all") {
    attributeFilters.push({ group: "material" as const, id: materialFilter });
  }
  if (colorFilter !== "all") {
    attributeFilters.push({ group: "color" as const, id: colorFilter });
  }
  if (tagFilter !== "all") {
    attributeFilters.push({ group: "tag" as const, id: tagFilter });
  }

  // Fetch products with inventory and orders using TanStack Query with pagination and debounced search
  const {
    data: productsResponse,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useProductsWithInventoryAndOrders(
    warehouse.id,
    {
      is_active: true,
      search_term: debouncedSearchQuery || undefined,
      attributes: attributeFilters.length > 0 ? attributeFilters : undefined,
      order_by,
      order_direction,
    },
    currentPage,
    PAGE_SIZE,
  );
  const {
    data: attributeLists,
    isLoading: attributesLoading,
    isError: attributesError,
  } = useProductAttributes();
  const {
    data: aggregates,
    isLoading: aggregatesLoading,
    isError: aggregatesError,
  } = useProductAggregates();

  const loading = productsLoading || attributesLoading || aggregatesLoading;
  const error = productsError || attributesError || aggregatesError;

  const materials = attributeLists?.materials || [];
  const colors = attributeLists?.colors || [];
  const tags = attributeLists?.tags || [];

  const productsData = productsResponse?.data || [];
  const totalCount = productsResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when server-side filters change (use debounced search to avoid excessive resets)
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/products?page=1`);
    }
  }, [
    debouncedSearchQuery,
    materialFilter,
    colorFilter,
    tagFilter,
    sortOption,
  ]);

  // No client-side filtering needed - all products are shown
  const filteredProducts = productsData;

  // Handle page change
  const handlePageChange = (page: number) => {
    // Preserve query params when changing pages
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/warehouse/${warehouse.slug}/products?${params.toString()}`);
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading products..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load products"
        message="Unable to fetch products"
        onRetry={() => {
          refetchProducts();
        }}
      />
    );
  }

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-sm font-medium text-gray-500 mt-2">
              <span className="text-teal-700">
                {aggregates?.live_products || 0} live on catalog
              </span>
              <span> &nbsp;•&nbsp; </span>
              <span>{aggregates?.active_products || 0} active products</span>
              {aggregates?.stock_type_breakdown &&
                aggregates.stock_type_breakdown.length > 0 && (
                  <>
                    <span> &nbsp;•&nbsp; </span>
                    <span>
                      {aggregates.stock_type_breakdown
                        .map((item) => `${item.count} ${item.type}`)
                        .join(" • ")}
                    </span>
                  </>
                )}
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search products by name, code, type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/inventory-shelf.png"
            alt="Products"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="max-w-34 h-10 shrink-0">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
        <Select value={materialFilter} onValueChange={setMaterialFilter}>
          <SelectTrigger className="max-w-34 h-10 shrink-0">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {materials.map((material) => (
              <SelectItem key={material.id} value={material.id}>
                {material.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={colorFilter} onValueChange={setColorFilter}>
          <SelectTrigger className="max-w-34 h-10 shrink-0">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Colors</SelectItem>
            {colors.map((color) => (
              <SelectItem key={color.id} value={color.id}>
                {color.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tagFilter} onValueChange={setTagFilter}>
          <SelectTrigger className="max-w-34 h-10 shrink-0">
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product List */}
      <div className="flex-1">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-700 mb-2">No products found</p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search"
                : "Add your first product"}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const imageUrl = product.product_images?.[0];
            const productInfoText = getProductInfo(product);

            // Calculate order metrics
            const orderRequest =
              product.sales_orders?.active_pending_quantity || 0;
            const purchasePending =
              product.purchase_orders?.active_pending_quantity || 0;
            const unitAbbr = product.measuring_unit
              ? getMeasuringUnitAbbreviation(
                  product.measuring_unit as MeasuringUnit,
                )
              : "";

            return (
              <Card
                key={product.id}
                className="relative rounded-none border-x-0 border-b-0 shadow-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() =>
                  router.push(
                    `/warehouse/${warehouse.slug}/products/${product.sequence_number}`,
                  )
                }
              >
                <CardContent className="p-4 flex gap-4">
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
                  <div className="flex-1 flex flex-col items-start">
                    <p className="text-base font-medium text-gray-700">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {productInfoText}
                    </p>
                    {/* Order Info */}
                    {(orderRequest > 0 || purchasePending > 0) && (
                      <div className="text-sm text-gray-500 space-x-2 mt-1">
                        {orderRequest > 0 && (
                          <Badge color="blue">
                            Order {orderRequest} {unitAbbr}
                          </Badge>
                        )}
                        {purchasePending > 0 && (
                          <Badge color="green">
                            Purchase {purchasePending} {unitAbbr}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="absolute top-2 left-2">
                    <GlowIndicator
                      size="sm"
                      isActive={!!product.show_on_catalog}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <PaginationWrapper
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Floating Action Button */}
      <Fab
        onClick={() => setShowCreateProduct(true)}
        className="fixed bottom-20 right-4"
      />

      {/* Add Product Sheet */}
      {showCreateProduct && (
        <ProductFormSheet
          key="new"
          open={showCreateProduct}
          onOpenChange={setShowCreateProduct}
        />
      )}
    </div>
  );
}
