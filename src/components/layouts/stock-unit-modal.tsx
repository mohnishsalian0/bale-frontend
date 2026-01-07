"use client";

import { useState } from "react";
import { toast } from "sonner";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { formatStockUnitNumber } from "@/lib/utils/product";
import {
  StockUnitDetailsContent,
  type StockUnitWithProduct,
} from "./stock-unit-details-content";
import { StockUnitEditForm } from "./StockUnitEditForm";
import { StockUnitAdjustmentForm } from "./StockUnitAdjustmentForm";
import { StockUnitDeleteConfirmation } from "./StockUnitDeleteConfirmation";
import type { StockType, StockUnitStatus } from "@/types/database/enums";
import { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import { ResponsiveDialog } from "../ui/responsive-dialog";
import { useStockUnitMutations } from "@/lib/query/hooks/stock-units";
import { useStockUnitAdjustmentMutations } from "@/lib/query/hooks/stock-unit-adjustments";
import type { StockUnitUpdateFormData } from "@/lib/validations/stock-unit";
import type { StockUnitAdjustmentFormData } from "@/lib/validations/stock-unit-adjustment";
import { useParams } from "next/navigation";

// Re-export for backward compatibility
export type { StockUnitWithProduct };

interface StockUnitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockUnit: StockUnitWithProductDetailView | null;
}

type ModalMode = "view" | "edit" | "adjustment" | "delete";

export function StockUnitDetailsModal({
  open,
  onOpenChange,
  stockUnit,
}: StockUnitDetailsModalProps) {
  const params = useParams();
  const warehouseSlug = params.warehouse_slug as string;

  const [mode, setMode] = useState<ModalMode>("view");

  const { update, delete: deleteMutation } =
    useStockUnitMutations(warehouseSlug);
  const { create: createAdjustment } = useStockUnitAdjustmentMutations();

  if (!stockUnit) return null;

  const product = stockUnit.product;

  const handleEdit = () => {
    setMode("edit");
  };

  const handleAdjustment = () => {
    setMode("adjustment");
  };

  const handleDelete = () => {
    if (stockUnit.has_outward) {
      toast.error("Cannot delete stock unit with outward history");
      return;
    }
    setMode("delete");
  };

  const confirmDelete = () => {
    deleteMutation.mutate(stockUnit.id, {
      onSuccess: () => {
        toast.success("Stock unit deleted successfully");
        onOpenChange(false);
        setMode("view");
      },
      onError: (error) => {
        console.error("Error deleting stock unit:", error);
        toast.error(error.message || "Failed to delete stock unit");
      },
    });
  };

  const handleSaveEdit = (data: StockUnitUpdateFormData) => {
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
          setMode("view");
        },
        onError: (error) => {
          console.error("Error updating stock unit:", error);
          toast.error(error.message || "Failed to update stock unit");
        },
      },
    );
  };

  const handleSaveAdjustment = (data: StockUnitAdjustmentFormData) => {
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
          setMode("view");
        },
        onError: (error) => {
          console.error("Error creating adjustment:", error);
          toast.error(error.message || "Failed to record adjustment");
        },
      },
    );
  };

  const handleCancel = () => {
    setMode("view");
  };

  const handleModalClose = (isOpen: boolean) => {
    if (!isOpen) {
      setMode("view");
    }
    onOpenChange(isOpen);
  };

  const getTitle = () => {
    if (mode === "edit") return "Edit stock unit";
    if (mode === "adjustment") return "Adjust quantity";
    if (mode === "delete") return "Delete stock unit";
    return (
      <>
        {formatStockUnitNumber(
          stockUnit.sequence_number,
          product?.stock_type as StockType,
        )}
        <StockStatusBadge status={stockUnit.status as StockUnitStatus} />
      </>
    );
  };

  const getDescription = () => {
    if (mode === "edit" || mode === "adjustment" || mode === "delete") {
      return product?.name;
    }
    return undefined;
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleModalClose}
      title={getTitle()}
      description={getDescription()}
    >
      {mode === "view" && (
        <StockUnitDetailsContent
          stockUnit={stockUnit}
          onEdit={handleEdit}
          onAdjustment={handleAdjustment}
          onDelete={handleDelete}
        />
      )}
      {mode === "edit" && (
        <StockUnitEditForm
          stockUnit={stockUnit}
          onCancel={handleCancel}
          onSave={handleSaveEdit}
        />
      )}
      {mode === "adjustment" && (
        <StockUnitAdjustmentForm
          stockUnit={stockUnit}
          onCancel={handleCancel}
          onSave={handleSaveAdjustment}
        />
      )}
      {mode === "delete" && (
        <StockUnitDeleteConfirmation
          onCancel={handleCancel}
          onConfirm={confirmDelete}
          loading={deleteMutation.isPending}
        />
      )}
    </ResponsiveDialog>
  );
}
