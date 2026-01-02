"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch, IconAlertTriangle } from "@tabler/icons-react";
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
  useProductsWithInventory,
  useProductAttributes,
} from "@/lib/query/hooks/products";
import { useSession } from "@/contexts/session-context";
import type { StockType } from "@/types/database/enums";
import {
  getAvailableStockText,
  getProductIcon,
  getProductInfo,
} from "@/lib/utils/product";
import { Toggle } from "@/components/ui/toggle";
import { GlowIndicator } from "@/components/ui/glow-indicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(
    searchParams.get("low_stock") === "true",
  );
  const [pendingQrFilter] = useState<boolean>(
    searchParams.get("pending_qr") === "true",
  );
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

  // Fetch products with inventory using TanStack Query with pagination and debounced search
  const {
    data: productsResponse,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useProductsWithInventory(
    warehouse.id,
    {
      is_active: true,
      search_term: debouncedSearchQuery || undefined,
      attributes: attributeFilters.length > 0 ? attributeFilters : undefined,
    },
    currentPage,
    PAGE_SIZE,
  );
  const {
    data: attributeLists,
    isLoading: attributesLoading,
    isError: attributesError,
  } = useProductAttributes();

  const loading = productsLoading || attributesLoading;
  const error = productsError || attributesError;

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
    lowStockFilter,
    pendingQrFilter,
    materialFilter,
    colorFilter,
    tagFilter,
  ]);

  // Client-side filtering for low stock and pending QR
  const filteredProducts = productsData.filter((product) => {
    // Low stock filter
    if (
      lowStockFilter &&
      (!product.min_stock_alert ||
        (product.min_stock_threshold ?? 0) <
          (product.inventory.in_stock_quantity ?? 0))
    ) {
      return false;
    }

    // Pending QR filter
    // TODO: This filter is not yet functional because ProductWithInventoryListView
    // doesn't include pending_qr_count field. Need to either:
    // 1. Extend the type to include pending_qr_units from product_inventory_aggregates
    // 2. Or handle this filter server-side in the query
    if (pendingQrFilter) {
      // Placeholder - will need backend query support
      return true; // Show all products for now when filter is active
    }

    return true;
  });

  // Calculate stats from current page filtered products
  const stats = useMemo(() => {
    const availableProducts = filteredProducts.filter(
      (p) => (p.inventory?.in_stock_quantity ?? 0) > 0,
    ).length;

    const liveProducts = filteredProducts.filter(
      (p) => p.show_on_catalog,
    ).length;

    return {
      availableProducts,
      liveProducts,
    };
  }, [filteredProducts]);

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
              <span>{stats.availableProducts} products available</span>
              <span> &nbsp;•&nbsp; </span>
              <span className="text-teal-700">
                {stats.liveProducts} live products
              </span>
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
        <Toggle
          aria-label="Low stock filter"
          variant="outline"
          pressed={lowStockFilter}
          onPressedChange={setLowStockFilter}
        >
          <IconAlertTriangle className="size-5" />
        </Toggle>
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
            const lowStock =
              product.min_stock_alert &&
              (product.min_stock_threshold ?? 0) >=
                (product.inventory.in_stock_quantity ?? 0);

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
                  </div>

                  {/* Quantity */}
                  <div className="flex gap-1 items-center h-fit">
                    {lowStock && (
                      <IconAlertTriangle className="size-4 text-yellow-700" />
                    )}
                    <p
                      className={`text-sm font-semibold ${lowStock ? "text-yellow-700" : "text-gray-700"}`}
                    >
                      {getAvailableStockText(product)}
                    </p>
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
