"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InventoryProductListStep } from "./InventoryProductListStep";
import { StockUnitListStep } from "./StockUnitListStep";
import { StockUnitQuantitySheet } from "./StockUnitQuantitySheet";
import { PieceQuantitySheet } from "./PieceQuantitySheet";
import {
  getStockUnits,
  getStockUnitWithProductDetail,
} from "@/lib/queries/stock-units";
import type { ScannedStockUnit } from "./QRScannerStep";
import type { ProductWithInventoryListView } from "@/types/products.types";
import type { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import type { StockType } from "@/types/database/enums";

type SelectInventoryStep = "products" | "stockUnits" | "quantity";

interface SelectInventorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  scannedUnits: ScannedStockUnit[];
  onScannedUnitsChange: (units: ScannedStockUnit[]) => void;
  orderProducts?: Record<string, number>; // productId -> requested_quantity
}

export function SelectInventorySheet({
  open,
  onOpenChange,
  warehouseId,
  scannedUnits,
  onScannedUnitsChange,
  orderProducts = {},
}: SelectInventorySheetProps) {
  const [currentStep, setCurrentStep] =
    useState<SelectInventoryStep>("products");

  // Selected state
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithInventoryListView | null>(null);
  const [selectedStockUnit, setSelectedStockUnit] =
    useState<StockUnitWithProductDetailView | null>(null);

  // Quantity sheet state
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setCurrentStep("products");
      setSelectedProduct(null);
      setSelectedStockUnit(null);
      setShowQuantitySheet(false);
    }
  }, [open]);

  const handleProductSelect = async (product: ProductWithInventoryListView) => {
    setSelectedProduct(product);
    const stockType = product.stock_type as StockType;

    if (stockType === "piece") {
      // For piece type: fetch the singleton stock unit and show quantity sheet
      try {
        // Fetch stock units for this product to get the singleton unit
        const stockUnits = await getStockUnits(warehouseId, {
          product_id: product.id,
          status: ["full", "partial"],
        });

        if (stockUnits.length > 0) {
          const pieceUnit = stockUnits[0]; // Get the singleton unit
          const stockUnitDetail = await getStockUnitWithProductDetail(
            pieceUnit.id,
          );
          setSelectedStockUnit(stockUnitDetail);
          setShowQuantitySheet(true);
        } else {
          console.error("No stock unit found for piece product");
          // Could show a toast here
        }
      } catch (error) {
        console.error("Error fetching piece stock unit:", error);
      }
    } else {
      // For roll/batch: show stock unit list
      setCurrentStep("stockUnits");
    }
  };

  const handleStockUnitSelect = async (stockUnitId: string) => {
    try {
      const stockUnitDetail = await getStockUnitWithProductDetail(stockUnitId);
      setSelectedStockUnit(stockUnitDetail);
      setShowQuantitySheet(true);
    } catch (error) {
      console.error("Error fetching stock unit:", error);
    }
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (selectedStockUnit && selectedProduct) {
      // Check if this stock unit already exists in scannedUnits
      const existingIndex = scannedUnits.findIndex(
        (unit) => unit.stockUnit.id === selectedStockUnit.id,
      );

      if (existingIndex !== -1) {
        // Update existing unit
        const updatedUnits = [...scannedUnits];
        updatedUnits[existingIndex] = {
          ...updatedUnits[existingIndex],
          quantity,
        };
        onScannedUnitsChange(updatedUnits);
      } else {
        // Add new unit
        onScannedUnitsChange([
          ...scannedUnits,
          {
            stockUnit: selectedStockUnit,
            quantity,
          },
        ]);
      }

      // Close quantity sheet and reset to products step
      setShowQuantitySheet(false);
      setCurrentStep("products");
      setSelectedProduct(null);
      setSelectedStockUnit(null);
    }
  };

  const handleQuantitySheetClose = (open: boolean) => {
    setShowQuantitySheet(open);
    if (!open) {
      // If sheet is closed without confirming, just close it
      setShowQuantitySheet(false);
    }
  };

  const handleBackToProducts = () => {
    setCurrentStep("products");
    setSelectedProduct(null);
    setSelectedStockUnit(null);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Get initial quantity for editing
  const getInitialQuantity = (): number => {
    if (selectedStockUnit) {
      const existing = scannedUnits.find(
        (unit) => unit.stockUnit.id === selectedStockUnit.id,
      );
      return existing ? existing.quantity : 0;
    }
    return 0;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          {/* Header */}
          <SheetHeader>
            <SheetTitle>Select from inventory</SheetTitle>
          </SheetHeader>

          {/* Content based on current step */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {currentStep === "products" && (
              <>
                <InventoryProductListStep
                  warehouseId={warehouseId}
                  scannedUnits={scannedUnits}
                  orderProducts={orderProducts}
                  onProductSelect={handleProductSelect}
                />
              </>
            )}

            {currentStep === "stockUnits" && selectedProduct && (
              <StockUnitListStep
                product={selectedProduct}
                warehouseId={warehouseId}
                scannedUnits={scannedUnits}
                onStockUnitSelect={handleStockUnitSelect}
              />
            )}

            {/* Footer */}
            <SheetFooter>
              {currentStep === "products" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full"
                >
                  Close
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToProducts}
                  className="w-full"
                >
                  Back
                </Button>
              )}
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      {/* Quantity Selection Sheets - Outside main sheet to avoid nesting */}
      {showQuantitySheet && selectedStockUnit && (
        <>
          {selectedProduct?.stock_type === "piece" ? (
            <PieceQuantitySheet
              open={showQuantitySheet}
              onOpenChange={handleQuantitySheetClose}
              product={selectedProduct}
              initialQuantity={getInitialQuantity()}
              availableQuantity={selectedStockUnit.remaining_quantity}
              onConfirm={handleQuantityConfirm}
            />
          ) : (
            <StockUnitQuantitySheet
              key={selectedStockUnit.id}
              open={showQuantitySheet}
              onOpenChange={handleQuantitySheetClose}
              stockUnit={selectedStockUnit}
              initialQuantity={getInitialQuantity()}
              onConfirm={handleQuantityConfirm}
            />
          )}
        </>
      )}
    </>
  );
}
