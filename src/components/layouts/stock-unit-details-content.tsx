"use client";

import { useState } from "react";
import { IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import {
  formatStockUnitNumber,
  getProductIcon,
  getProductInfo,
} from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { Tables } from "@/types/database/supabase";
import type { ProductListView } from "@/types/products.types";
import type {
  MeasuringUnit,
  StockType,
  StockUnitStatus,
} from "@/types/database/enums";
import {
  useStockUnitAdjustments,
  useStockUnitAdjustmentMutations,
} from "@/lib/query/hooks/stock-unit-adjustments";
import {
  useStockUnitActivity,
  useStockUnitWithProductDetail,
  useStockUnitMutations,
} from "@/lib/query/hooks/stock-units";
import { toast } from "sonner";
import { StockUnitEditForm } from "./StockUnitEditForm";
import { StockUnitAdjustmentForm } from "./StockUnitAdjustmentForm";
import { StockUnitDeleteConfirmation } from "./StockUnitDeleteConfirmation";
import type { StockUnitUpdateFormData } from "@/lib/validations/stock-unit";
import type { StockUnitAdjustmentFormData } from "@/lib/validations/stock-unit-adjustment";
import { useParams } from "next/navigation";
import { useSession } from "@/contexts/session-context";
import { StockStatusBadge } from "../ui/stock-status-badge";

type StockUnit = Tables<"stock_units">;

export interface StockUnitWithProduct extends StockUnit {
  product: ProductListView | null;
}

type ModalMode = "view" | "edit" | "adjustment" | "delete";

interface StockUnitDetailsContentProps {
  /**
   * The ID of the stock unit to display
   */
  stockUnitId: string;
  /**
   * Callback when the stock unit is successfully deleted
   */
  onDeleted?: () => void;
}

export function StockUnitDetailsContent({
  stockUnitId,
  onDeleted,
}: StockUnitDetailsContentProps) {
  const params = useParams();
  const warehouseSlug = params.warehouse_slug as string;
  const { warehouse } = useSession();

  const [mode, setMode] = useState<ModalMode>("view");

  // Fetch stock unit with product details
  const { data: stockUnit, isLoading: stockUnitLoading } =
    useStockUnitWithProductDetail(stockUnitId);

  // Fetch adjustments for this stock unit
  const { data: adjustments = [], isLoading: adjustmentsLoading } =
    useStockUnitAdjustments(stockUnitId);

  // Fetch activity history for this stock unit
  const { data: activities = [], isLoading: activitiesLoading } =
    useStockUnitActivity(stockUnitId);

  // Mutations
  const { update, delete: deleteMutation } =
    useStockUnitMutations(warehouseSlug);
  const { delete: deleteAdjustment, create: createAdjustment } =
    useStockUnitAdjustmentMutations();

  // Notify parent of mode changes
  const handleModeChange = (newMode: ModalMode) => {
    setMode(newMode);
  };

  const product = stockUnit?.product;
  const unitAbbr = product?.measuring_unit
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "units";
  const productInfoText = product ? getProductInfo(product) : "";

  // Check if stock unit belongs to current warehouse
  const isInCurrentWarehouse = stockUnit?.current_warehouse_id === warehouse.id;

  const handleEdit = () => {
    handleModeChange("edit");
  };

  const handleAdjustment = () => {
    handleModeChange("adjustment");
  };

  const handleDelete = () => {
    if (stockUnit?.has_outward) {
      toast.error("Cannot delete stock unit with outward history");
      return;
    }
    handleModeChange("delete");
  };

  const handleCancel = () => {
    handleModeChange("view");
  };

  const handleSaveEdit = (data: StockUnitUpdateFormData) => {
    if (!stockUnit) return;

    update.mutate(
      {
        id: stockUnit.id,
        data: {
          supplier_number: data.supplier_number || null,
          quality_grade: data.grade || null,
          manufacturing_date: data.manufactured_on
            ? data.manufactured_on.toISOString().split("T")[0]
            : null,
          warehouse_location: data.location || null,
          notes: data.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Stock unit updated successfully");
          handleModeChange("view");
        },
        onError: (error) => {
          console.error("Error updating stock unit:", error);
          toast.error(error.message || "Failed to update stock unit");
        },
      },
    );
  };

  const handleSaveAdjustment = (data: StockUnitAdjustmentFormData) => {
    if (!stockUnit) return;

    createAdjustment.mutate(
      {
        stock_unit_id: stockUnit.id,
        quantity_adjusted: data.quantity_adjusted,
        adjustment_date: data.adjustment_date.toISOString().split("T")[0],
        reason: data.reason,
      },
      {
        onSuccess: () => {
          toast.success("Adjustment recorded successfully");
          handleModeChange("view");
        },
        onError: (error) => {
          console.error("Error creating adjustment:", error);
          toast.error(error.message || "Failed to record adjustment");
        },
      },
    );
  };

  const confirmDelete = () => {
    if (!stockUnit) return;

    deleteMutation.mutate(stockUnit.id, {
      onSuccess: () => {
        toast.success("Stock unit deleted successfully");
        handleModeChange("view");
        onDeleted?.();
      },
      onError: (error) => {
        console.error("Error deleting stock unit:", error);
        toast.error(error.message || "Failed to delete stock unit");
      },
    });
  };

  const handleDeleteAdjustment = (adjustmentId: string) => {
    deleteAdjustment.mutate(adjustmentId, {
      onSuccess: () => {
        toast.success("Adjustment deleted successfully");
      },
      onError: (error) => {
        console.error("Error deleting adjustment:", error);
        toast.error("Failed to delete adjustment");
      },
    });
  };

  // Loading state
  if (stockUnitLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Loading stock unit...</p>
      </div>
    );
  }

  // Error state
  if (!stockUnit) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Stock unit not found</p>
      </div>
    );
  }

  // Show edit form
  if (mode === "edit") {
    return (
      <StockUnitEditForm
        stockUnit={stockUnit}
        onCancel={handleCancel}
        onSave={handleSaveEdit}
      />
    );
  }

  // Show adjustment form
  if (mode === "adjustment") {
    return (
      <StockUnitAdjustmentForm
        stockUnit={stockUnit}
        onCancel={handleCancel}
        onSave={handleSaveAdjustment}
      />
    );
  }

  // Show delete confirmation
  if (mode === "delete") {
    return (
      <StockUnitDeleteConfirmation
        onCancel={handleCancel}
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    );
  }

  // Show view mode (default)
  return (
    <>
      {/* Content */}
      <div className="flex flex-col gap-6 overflow-y-auto">
        {/* Stock unit number & Status */}
        <h2 className="flex gap-2 items-center text-lg leading-none font-semibold">
          {formatStockUnitNumber(
            stockUnit.sequence_number,
            stockUnit.product?.stock_type as StockType,
          )}
          <StockStatusBadge status={stockUnit.status as StockUnitStatus} />
        </h2>

        {/* Product Header */}
        {product && (
          <div className="flex items-center gap-3">
            <ImageWrapper
              size="md"
              shape="square"
              imageUrl={product.product_images?.[0]}
              alt={product.name}
              placeholderIcon={getProductIcon(product.stock_type as StockType)}
            />
            <div className="flex-1 min-w-0">
              <p
                title={product.name}
                className="text-base font-medium text-gray-700 truncate"
              >
                {product.name}
              </p>
              <p
                title={productInfoText}
                className="text-sm text-gray-500 truncate mt-1"
              >
                {productInfoText}
              </p>
            </div>
          </div>
        )}

        {/* Quantity & Status Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">
            Quantity & Status
          </h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Remaining quantity</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.remaining_quantity} {unitAbbr}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Initial quantity</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.initial_quantity} {unitAbbr}
            </span>
          </div>
        </div>

        {/* Stock Details Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Stock Details</h3>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Current warehouse</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.warehouse.name}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Quality grade</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.quality_grade || "-"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Supplier number</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.supplier_number || "-"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Warehouse location</span>
            <span className="font-semibold text-gray-700">
              {stockUnit.warehouse_location || "-"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Manufacturing date</span>
            {stockUnit.manufacturing_date ? (
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(stockUnit.manufacturing_date)}
              </span>
            ) : (
              <span className="font-semibold text-gray-700">-</span>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">QR on</span>
            {stockUnit.qr_generated_at ? (
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(stockUnit.qr_generated_at)}
              </span>
            ) : (
              <span className="font-semibold text-gray-700">-</span>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Notes</h3>
          <p className="text-sm text-gray-700">{stockUnit.notes || "-"}</p>
        </div>

        {/* Adjustments Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">Adjustments</h3>
          {adjustmentsLoading ? (
            <p className="text-sm text-gray-500">Loading adjustments...</p>
          ) : adjustments.length === 0 ? (
            <p className="text-sm text-gray-500">-</p>
          ) : (
            <div className="space-y-2">
              {adjustments.map((adjustment) => {
                const isAddition = adjustment.quantity_adjusted > 0;
                const iconColor = isAddition
                  ? "text-green-600"
                  : "text-red-600";

                return (
                  <div
                    key={adjustment.id}
                    className={`flex items-center gap-3 px-3 py-2 border border-gray-200 rounded-md`}
                  >
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2"></div>
                      <p
                        className="text-xs text-gray-500"
                        title={adjustment.reason}
                      >
                        <span className={`text-sm font-semibold ${iconColor}`}>
                          {isAddition ? "+" : ""}
                          {adjustment.quantity_adjusted} {unitAbbr}
                        </span>
                        {" • "}
                        <span>
                          {formatAbsoluteDate(adjustment.adjustment_date)}
                        </span>
                        {" • "}
                        {adjustment.reason}
                      </p>
                    </div>

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteAdjustment(adjustment.id)}
                      className="flex-shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-100"
                    >
                      <IconTrash className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activity History Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-500">
            Activity History
          </h3>
          {activitiesLoading ? (
            <p className="text-sm text-gray-500">Loading activity...</p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-gray-500">-</p>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => {
                // Determine event type label and color
                const eventTypeConfig = {
                  created: {
                    label: "Created",
                    color: "text-blue-600",
                    bgColor: "bg-blue-50",
                  },
                  transfer: {
                    label: "Transfer",
                    color: "text-purple-600",
                    bgColor: "bg-purple-50",
                  },
                  dispatched: {
                    label: "Dispatched",
                    color: "text-orange-600",
                    bgColor: "bg-orange-50",
                  },
                  adjustment: {
                    label: "Adjustment",
                    color: "text-gray-600",
                    bgColor: "bg-gray-50",
                  },
                };

                const config =
                  eventTypeConfig[
                    activity.event_type as keyof typeof eventTypeConfig
                  ];
                const quantityColor =
                  activity.quantity_change > 0
                    ? "text-green-600"
                    : "text-red-600";

                return (
                  <div
                    key={`${activity.event_type}-${activity.event_id}`}
                    className="px-3 py-2 border border-gray-200 rounded-md"
                  >
                    <div className="space-y-1">
                      {/* Event Type and Number */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${config.color}`}
                        >
                          {config.label}
                        </span>
                        {activity.event_number && (
                          <span className="text-xs text-gray-500">
                            {activity.event_number}
                          </span>
                        )}
                        {activity.status !== "completed" && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              activity.status === "in_transit"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {activity.status}
                          </span>
                        )}
                      </div>

                      {/* From/To Information */}
                      {(activity.from_name || activity.to_name) && (
                        <p className="text-xs text-gray-600">
                          {activity.from_name && (
                            <span title={activity.from_name}>
                              From: {activity.from_name}
                            </span>
                          )}
                          {activity.from_name && activity.to_name && (
                            <span className="mx-1">→</span>
                          )}
                          {activity.to_name && (
                            <span title={activity.to_name}>
                              To: {activity.to_name}
                            </span>
                          )}
                        </p>
                      )}

                      {/* Quantity, Date, and Notes */}
                      <p className="text-xs text-gray-500">
                        <span className={`font-semibold ${quantityColor}`}>
                          {activity.quantity_change > 0 ? "+" : ""}
                          {activity.quantity_change} {unitAbbr}
                        </span>
                        {" • "}
                        <span>{formatAbsoluteDate(activity.event_date)}</span>
                        {activity.notes && (
                          <>
                            {" • "}
                            <span title={activity.notes}>{activity.notes}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {isInCurrentWarehouse && (
        <div className="flex gap-3 w-full py-4 md:pb-0">
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleDelete}
          >
            <IconTrash />
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleEdit}
            className="flex-1"
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAdjustment}
            className="flex-2"
          >
            Adjust quantity
          </Button>
        </div>
      )}
    </>
  );
}
