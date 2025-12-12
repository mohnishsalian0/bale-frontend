"use client";

import { use, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { StockUnitDetailsModal } from "@/components/layouts/stock-unit-modal";
import { formatAbsoluteDate, formatRelativeDate } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatStockUnitNumber } from "@/lib/utils/product";
import { useSession } from "@/contexts/session-context";
import { useProductWithInventoryByNumber } from "@/lib/query/hooks/products";
import {
  useStockUnitsWithInward,
  useStockUnitWithProductDetail,
} from "@/lib/query/hooks/stock-units";
import type {
  MeasuringUnit,
  StockType,
  StockUnitStatus,
} from "@/types/database/enums";
import type { StockUnitWithInwardListView } from "@/types/stock-units.types";
import type { InwardWithPartnerListView } from "@/types/stock-flow.types";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    product_number: string;
  }>;
}

type SortOption = "latest" | "oldest" | "quantity_high" | "quantity_low";

export default function StockUnitsPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { product_number, warehouse_slug } = use(params);
  const { warehouse } = useSession();

  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [qrPendingOnly, setQrPendingOnly] = useState(false);
  const [selectedStockUnitId, setSelectedStockUnitId] = useState<string | null>(
    null,
  );
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Fetch product (will use cached data from layout)
  const { data: product, isLoading: productLoading } =
    useProductWithInventoryByNumber(product_number, warehouse.id);

  // Fetch stock units with pagination
  const {
    data: stockUnitsResponse,
    isLoading: stockUnitsLoading,
    isError: stockUnitsError,
    refetch: refetchStockUnits,
  } = useStockUnitsWithInward(
    warehouse.id,
    { product_id: product?.id, status: ["full", "partial"] },
    currentPage,
    PAGE_SIZE,
  );

  // Fetch stock unit detail when selected
  const { data: stockUnitDetail } =
    useStockUnitWithProductDetail(selectedStockUnitId);

  const loading = productLoading || stockUnitsLoading;
  const error = stockUnitsError;

  const stockUnits = stockUnitsResponse?.data || [];
  const totalCount = stockUnitsResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleStockUnitClick = (stockUnitId: string) => {
    setSelectedStockUnitId(stockUnitId);
    setShowDetailsModal(true);
  };

  const handleModalClose = () => {
    setShowDetailsModal(false);
    setSelectedStockUnitId(null);
  };

  const handlePageChange = (page: number) => {
    router.push(
      `/warehouse/${warehouse_slug}/inventory/${product_number}/stock-units?page=${page}`,
    );
  };

  const unitAbbr = product
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "";

  // Filter and sort stock units (client-side for current page)
  const filteredAndSortedUnits = useMemo(() => {
    let units = [...stockUnits];

    // Filter by QR pending
    if (qrPendingOnly) {
      units = units.filter((unit) => !unit.qr_generated_at);
    }

    // Sort
    units.sort((a, b) => {
      switch (sortBy) {
        case "latest":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "oldest":
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        case "quantity_high":
          return (b.remaining_quantity || 0) - (a.remaining_quantity || 0);
        case "quantity_low":
          return (a.remaining_quantity || 0) - (b.remaining_quantity || 0);
        default:
          return 0;
      }
    });

    return units;
  }, [stockUnits, sortBy, qrPendingOnly]);

  // Group by goods inward
  const groupedUnits = useMemo(() => {
    const groups: Map<
      string,
      {
        inward: InwardWithPartnerListView;
        units: StockUnitWithInwardListView[];
      }
    > = new Map();

    filteredAndSortedUnits.forEach((unit) => {
      if (!unit.goods_inward) return;

      const key = unit.created_from_inward_id || "unknown";
      if (!groups.has(key)) {
        groups.set(key, {
          inward: unit.goods_inward,
          units: [],
        });
      }
      groups.get(key)!.units.push(unit);
    });

    return Array.from(groups.values());
  }, [filteredAndSortedUnits]);

  if (loading) {
    return <LoadingState message="Loading stock units..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load stock units"
        message="Unable to fetch stock units"
        onRetry={() => refetchStockUnits()}
      />
    );
  }

  if (stockUnits.length === 0 && currentPage === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <IconBox className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No stock units
        </h3>
        <p className="text-sm text-gray-500 text-center">
          No stock units found for this product in the warehouse
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <Select
          value={sortBy}
          onValueChange={(value) => setSortBy(value as SortOption)}
        >
          <SelectTrigger className="max-w-34">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="quantity_high">
              Quantity (high to low)
            </SelectItem>
            <SelectItem value="quantity_low">Quantity (low to high)</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Switch
            id="qr-pending"
            checked={qrPendingOnly}
            onCheckedChange={setQrPendingOnly}
          />
          <Label
            htmlFor="qr-pending"
            className="text-sm text-gray-700 cursor-pointer"
          >
            QR pending
          </Label>
        </div>
      </div>

      {/* Grouped List */}
      <div className="flex-1 overflow-y-auto">
        {filteredAndSortedUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <IconBox className="size-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              No stock units found
            </h3>
            <p className="text-sm text-gray-500 text-center">
              {qrPendingOnly
                ? "All stock units have QR codes generated"
                : "Try changing your filters"}
            </p>
          </div>
        ) : (
          groupedUnits.map((group) => (
            <div key={group.inward.id} className="border-t border-gray-200">
              {/* Inward Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-100">
                <span className="text-sm font-semibold text-gray-700">
                  GI-{group.inward.sequence_number}
                </span>
                <span className="text-xs text-gray-500">
                  {formatAbsoluteDate(group.inward.inward_date)}
                </span>
              </div>

              {/* Stock Units */}
              {group.units.map((unit) => {
                const subtitleParts: string[] = [];
                if (unit.warehouse_location)
                  subtitleParts.push(unit.warehouse_location);
                if (unit.quality_grade) subtitleParts.push(unit.quality_grade);
                if (unit.supplier_number)
                  subtitleParts.push(unit.supplier_number);

                return (
                  <button
                    key={unit.id}
                    onClick={() => handleStockUnitClick(unit.id)}
                    className="flex items-start justify-between gap-4 px-4 py-4 border-t border-dashed border-gray-200 hover:bg-gray-50 transition-colors w-full text-left cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-base font-medium text-gray-700">
                        <span>
                          {formatStockUnitNumber(
                            unit.sequence_number,
                            product!.stock_type as StockType,
                          )}
                        </span>
                        <span>
                          <StockStatusBadge
                            status={unit.status as StockUnitStatus}
                          />
                        </span>
                      </div>

                      {/* QR Status */}
                      <p
                        className={`text-sm mt-1 ${
                          unit.qr_generated_at
                            ? "text-gray-500"
                            : "text-green-700"
                        }`}
                        title={
                          unit.qr_generated_at
                            ? formatAbsoluteDate(unit.qr_generated_at)
                            : ""
                        }
                      >
                        {unit.qr_generated_at
                          ? `QR generated ${formatRelativeDate(unit.qr_generated_at)}`
                          : "QR pending"}
                      </p>

                      {/* Additional Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        {unit.quality_grade && (
                          <span>Grade: {unit.quality_grade}</span>
                        )}
                        {unit.supplier_number && (
                          <span>Supplier #: {unit.supplier_number}</span>
                        )}
                        {unit.warehouse_location && (
                          <span>Location: {unit.warehouse_location}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-gray-700">
                        {unit.remaining_quantity} {unitAbbr}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationWrapper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Stock Unit Details Modal */}
      <StockUnitDetailsModal
        open={showDetailsModal}
        onOpenChange={handleModalClose}
        stockUnit={stockUnitDetail || null}
      />
    </div>
  );
}
