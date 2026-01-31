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
  fullQuantity?: boolean; // If true, always transfer full quantity without showing quantity sheet
}

export function SelectInventorySheet({
  open,
  onOpenChange,
  warehouseId,
  scannedUnits,
  onScannedUnitsChange,
  orderProducts = {},
  fullQuantity = false,
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

    if (fullQuantity && stockType === "piece") {
      // For piece type with fullQuantity: fetch and auto-add full quantity
      try {
        const stockUnits = await getStockUnits(warehouseId, {
          product_id: product.id,
          status: ["full", "partial"],
        });

        if (stockUnits.length > 0) {
          const pieceUnit = stockUnits[0];
          const stockUnitDetail = await getStockUnitWithProductDetail(
            pieceUnit.id,
          );

          // Auto-add with full quantity
          const existingIndex = scannedUnits.findIndex(
            (unit) => unit.stockUnit.id === stockUnitDetail.id,
          );

          if (existingIndex !== -1) {
            const updatedUnits = [...scannedUnits];
            updatedUnits[existingIndex] = {
              ...updatedUnits[existingIndex],
              quantity: stockUnitDetail.remaining_quantity,
            };
            onScannedUnitsChange(updatedUnits);
          } else {
            onScannedUnitsChange([
              ...scannedUnits,
              {
                stockUnit: stockUnitDetail,
                quantity: stockUnitDetail.remaining_quantity,
              },
            ]);
          }
        } else {
          console.error("No stock unit found for piece product");
        }
      } catch (error) {
        console.error("Error fetching piece stock unit:", error);
      }
    } else if (stockType === "piece") {
      // For piece type without fullQuantity: show quantity sheet
      try {
        const stockUnits = await getStockUnits(warehouseId, {
          product_id: product.id,
          status: ["full", "partial"],
        });

        if (stockUnits.length > 0) {
          const pieceUnit = stockUnits[0];
          const stockUnitDetail = await getStockUnitWithProductDetail(
            pieceUnit.id,
          );
          setSelectedStockUnit(stockUnitDetail);
          setShowQuantitySheet(true);
        } else {
          console.error("No stock unit found for piece product");
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

      if (fullQuantity) {
        // Auto-add with full quantity without showing quantity sheet
        const existingIndex = scannedUnits.findIndex(
          (unit) => unit.stockUnit.id === stockUnitDetail.id,
        );

        if (existingIndex !== -1) {
          const updatedUnits = [...scannedUnits];
          updatedUnits[existingIndex] = {
            ...updatedUnits[existingIndex],
            quantity: stockUnitDetail.remaining_quantity,
          };
          onScannedUnitsChange(updatedUnits);
        } else {
          onScannedUnitsChange([
            ...scannedUnits,
            {
              stockUnit: stockUnitDetail,
              quantity: stockUnitDetail.remaining_quantity,
            },
          ]);
        }
      } else {
        // Show quantity sheet for partial quantity selection
        setSelectedStockUnit(stockUnitDetail);
        setShowQuantitySheet(true);
      }
    } catch (error) {
      console.error("Error fetching stock unit:", error);
    }
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (selectedStockUnit && selectedProduct) {
      const existingIndex = scannedUnits.findIndex(
        (unit) => unit.stockUnit.id === selectedStockUnit.id,
      );

      if (existingIndex !== -1) {
        const updatedUnits = [...scannedUnits];
        updatedUnits[existingIndex] = {
          ...updatedUnits[existingIndex],
          quantity,
        };
        onScannedUnitsChange(updatedUnits);
      } else {
        onScannedUnitsChange([
          ...scannedUnits,
          {
            stockUnit: selectedStockUnit,
            quantity,
          },
        ]);
      }

      setShowQuantitySheet(false);
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

  const handleRemoveUnit = (stockUnitId: string) => {
    const updatedUnits = scannedUnits.filter(
      (unit) => unit.stockUnit.id !== stockUnitId,
    );
    onScannedUnitsChange(updatedUnits);
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
                onRemoveUnit={handleRemoveUnit}
                fullQuantity={fullQuantity}
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
