"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/contexts/session-context";
import {
  QuickActionButton,
  type QuickAction,
} from "@/components/ui/quick-action-button";
import {
  IconShirt,
  IconQrcode,
  IconSearch,
  IconAlertTriangle,
} from "@tabler/icons-react";
import IconGoodsInward from "@/components/icons/IconGoodsInward";
import IconGoodsOutward from "@/components/icons/IconGoodsOutward";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Toggle } from "@/components/ui/toggle";
import { GlowIndicator } from "@/components/ui/glow-indicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useInventoryAggregates } from "@/lib/query/hooks/aggregates";
import {
  formatMeasuringUnitQuantities,
  getMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import {
  useProductsWithInventoryAndOrders,
  useProductAttributes,
} from "@/lib/query/hooks/products";
import {
  getAvailableStockText,
  getProductIcon,
  getProductInfo,
} from "@/lib/utils/product";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { Badge } from "@/components/ui/badge";

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(
    searchParams.get("low_stock") === "true",
  );
  const [pendingQrFilter, setPendingQrFilter] = useState<boolean>(
    searchParams.get("pending_qr") === "true",
  );
  const [sortOption, setSortOption] = useState<string>("newest");
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Fetch inventory aggregates
  const { data: inventoryStats } = useInventoryAggregates({
    warehouseId: warehouse.id,
  });

  const totalProducts = inventoryStats?.product_count || 0;
  const inStockQuantity = formatMeasuringUnitQuantities(
    inventoryStats?.total_quantities_by_unit ||
      new Map<MeasuringUnit, number>(),
  );

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

  // Fetch products with inventory and orders (ONLY products with stock > 0)
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
      has_inventory: true, // FILTER TO ONLY PRODUCTS WITH STOCK > 0
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
      router.push(`/warehouse/${warehouse.slug}/inventory?page=1`);
    }
  }, [
    debouncedSearchQuery,
    lowStockFilter,
    pendingQrFilter,
    materialFilter,
    colorFilter,
    tagFilter,
    sortOption,
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
    if (pendingQrFilter && (product.inventory.pending_qr_units ?? 0) <= 0) {
      return false;
    }

    return true;
  });

  // Handle page change
  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/warehouse/${warehouse.slug}/inventory?${params.toString()}`);
  };

  // Quick actions array
  const quickActions: QuickAction[] = [
    {
      icon: IconShirt,
      label: "Create product",
      href: `/warehouse/${warehouse.slug}/products`,
    },
    {
      icon: IconGoodsInward,
      label: "Goods inward",
      href: `/warehouse/${warehouse.slug}/goods-inward/create`,
    },
    {
      icon: IconGoodsOutward,
      label: "Goods outward",
      href: `/warehouse/${warehouse.slug}/goods-outward/create`,
    },
    {
      icon: IconQrcode,
      label: "QR code batch",
      href: `/warehouse/${warehouse.slug}/qr-codes/create`,
    },
  ];

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-teal-700 font-medium">{totalProducts}</span>
              <span> products</span>
              <span> • </span>
              <span className="text-teal-700 font-medium">
                {inStockQuantity}
              </span>
              <span className="text-gray-500"> in stock</span>
            </p>
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
            priority
            quality={85}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 md:grid-cols-6 px-2 mt-6">
        {quickActions.map((action) => (
          <QuickActionButton
            key={action.label}
            action={action}
            onClick={() => {
              if (action.onClick) {
                action.onClick();
              } else if (action.href) {
                router.push(action.href);
              }
            }}
          />
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-2 gap-y-3 px-4 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/products`)}
        >
          All products
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/stock-flow`)}
        >
          All goods movement
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/qr-codes`)}
        >
          All QR batches
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="px-4 mt-10">
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Products in inventory
          </h2>
          <div className="relative flex-1 max-w-sm">
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

        {/* Filters */}
        <div className="flex gap-3 overflow-x-auto scrollbar-hide shrink-0">
          <Toggle
            aria-label="Low stock filter"
            variant="outline"
            pressed={lowStockFilter}
            onPressedChange={setLowStockFilter}
            title="Low stock"
          >
            <IconAlertTriangle className="size-5" />
          </Toggle>
          <Toggle
            aria-label="Pending QR filter"
            variant="outline"
            pressed={pendingQrFilter}
            onPressedChange={setPendingQrFilter}
            title="Pending QR"
          >
            <IconQrcode className="size-5" />
          </Toggle>
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
      </div>

      {/* Product List */}
      {loading ? (
        <LoadingState message="Loading inventory..." />
      ) : error ? (
        <ErrorState
          title="Failed to load inventory"
          message="Unable to fetch products"
          onRetry={() => {
            refetchProducts();
          }}
        />
      ) : (
        <div className="flex-1 mt-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-gray-700 mb-2">No products in stock</p>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? "Try adjusting your search or filters"
                  : "Add products via goods inward"}
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
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <PaginationWrapper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
