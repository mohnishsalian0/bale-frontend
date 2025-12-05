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
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import {
  formatMeasuringUnitQuantities,
  getMeasuringUnit,
  getMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { Toggle } from "@/components/ui/toggle";
import { GlowIndicator } from "@/components/ui/glow-indicator";

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [showCreateProduct, setShowCreateProduct] = useState(false);

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Fetch products with inventory using TanStack Query with pagination
  const {
    data: productsResponse,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useProductsWithInventory(
    warehouse.id,
    { is_active: true },
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

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/inventory?page=1`);
    }
  }, [searchQuery, lowStockFilter, materialFilter, colorFilter, tagFilter]);

  // Client-side filtering for current page only
  const filteredProducts = productsData.filter((product) => {
    // Search filter
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sequence_number.toString().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (
      lowStockFilter &&
      (!product.min_stock_alert ||
        (product.min_stock_threshold ?? 0) <
          (product.inventory.in_stock_quantity ?? 0))
    ) {
      return false;
    }

    // Material filter
    if (
      materialFilter !== "all" &&
      !product.materials?.some((m) => m.id === materialFilter)
    ) {
      return false;
    }

    // Color filter
    if (
      colorFilter !== "all" &&
      !product.colors?.some((c) => c.id === colorFilter)
    ) {
      return false;
    }

    // Tag filter
    if (tagFilter !== "all" && !product.tags?.some((t) => t.id === tagFilter)) {
      return false;
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

    const lowStockProducts = filteredProducts.filter(
      (p) =>
        p.min_stock_alert &&
        (p.min_stock_threshold ?? 0) >= (p.inventory?.in_stock_quantity ?? 0),
    ).length;

    // Aggregate quantities by measuring unit
    const unitMap = new Map<MeasuringUnit, number>();
    filteredProducts.forEach((product) => {
      const unit = getMeasuringUnit(product);
      const quantity = product.inventory?.in_stock_quantity ?? 0;
      unitMap.set(unit, (unitMap.get(unit) || 0) + quantity);
    });

    const quantitiesByUnit = formatMeasuringUnitQuantities(unitMap);

    return {
      availableProducts,
      liveProducts,
      lowStockProducts,
      quantitiesByUnit,
    };
  }, [filteredProducts]);

  // Handle page change
  const handlePageChange = (page: number) => {
    router.push(`/warehouse/${warehouse.slug}/inventory?page=${page}`);
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading inventory..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load inventory"
        message="Unable to fetch inventory"
        onRetry={() => {
          refetchProducts();
        }}
      />
    );
  }

  return (
    <div className="relative flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 p-4 pb-0">
        <div className="flex-1">
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm font-medium text-gray-500 mt-2">
              <span>{stats.availableProducts} available products</span>
              <span> • </span>
              <span className="text-teal-700">
                {stats.liveProducts} live products
              </span>
              <span> • </span>
              <span className="text-yellow-700">
                {stats.lowStockProducts} low stock
              </span>
            </p>
            <p className="text-sm font-medium text-gray-500 mt-1">
              {stats.quantitiesByUnit} in stock
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search for product"
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
            alt="Inventory"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-6 overflow-x-auto shrink-0">
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
            <p className="text-gray-600 mb-2">No products found</p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search"
                : "Add your first product"}
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const totalQuantity = product.inventory?.in_stock_quantity || 0;
            const imageUrl = product.product_images?.[0];
            const productInfoText = getProductInfo(product);
            const unitAbbreviation = getMeasuringUnitAbbreviation(
              product.measuring_unit as MeasuringUnit | null,
            );
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
                    `/warehouse/${warehouse.slug}/inventory/${product.sequence_number}`,
                  )
                }
              >
                <CardContent className="p-4 flex gap-4 items-center">
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
                    <p className="text-base font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {productInfoText}
                    </p>
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-inline gap-1 items-center">
                    {lowStock && (
                      <IconAlertTriangle className="size-4 text-yellow-700" />
                    )}
                    <p
                      className={`text-sm font-bold ${lowStock ? "text-yellow-700" : "text-gray-900"}`}
                    >
                      {totalQuantity} {unitAbbreviation}
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
