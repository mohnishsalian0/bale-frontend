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
import { getProducts, getProductAttributeLists } from "@/lib/queries/products";
import {
  getStockUnits,
  getStockUnitWithProductDetail,
} from "@/lib/queries/stock-units";
import type { ScannedStockUnit } from "./QRScannerStep";
import type {
  ProductListView,
  ProductAttribute,
} from "@/types/products.types";
import type { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import type { StockType } from "@/types/database/enums";

type SelectInventoryStep = "products" | "stockUnits" | "quantity";

interface SelectInventorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  scannedUnits: ScannedStockUnit[];
  onScannedUnitsChange: (units: ScannedStockUnit[]) => void;
}

export function SelectInventorySheet({
  open,
  onOpenChange,
  warehouseId,
  scannedUnits,
  onScannedUnitsChange,
}: SelectInventorySheetProps) {
  const [currentStep, setCurrentStep] = useState<SelectInventoryStep>("products");
  const [products, setProducts] = useState<ProductListView[]>([]);
  const [materials, setMaterials] = useState<ProductAttribute[]>([]);
  const [colors, setColors] = useState<ProductAttribute[]>([]);
  const [tags, setTags] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected state
  const [selectedProduct, setSelectedProduct] = useState<ProductListView | null>(null);
  const [selectedStockUnit, setSelectedStockUnit] = useState<StockUnitWithProductDetailView | null>(null);
  const [selectedStockUnitId, setSelectedStockUnitId] = useState<string | null>(null);

  // Quantity sheet state
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);

  // Load products on mount
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setCurrentStep("products");
      setSelectedProduct(null);
      setSelectedStockUnit(null);
      setSelectedStockUnitId(null);
      setShowQuantitySheet(false);
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch products and attributes in parallel
      const [productsData, attributeLists] = await Promise.all([
        getProducts(),
        getProductAttributeLists(),
      ]);

      setProducts(productsData.data);
      setMaterials(attributeLists.materials);
      setColors(attributeLists.colors);
      setTags(attributeLists.tags);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = async (product: ProductListView) => {
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
          const stockUnitDetail = await getStockUnitWithProductDetail(pieceUnit.id);
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
    setSelectedStockUnitId(stockUnitId);
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
      setSelectedStockUnitId(null);
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
    setSelectedStockUnitId(null);
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
          <div className="flex flex-col h-full overflow-hidden">
            {currentStep === "products" && (
              <>
                <InventoryProductListStep
                  products={products}
                  materials={materials}
                  colors={colors}
                  tags={tags}
                  loading={loading}
                  scannedUnits={scannedUnits}
                  onProductSelect={handleProductSelect}
                />

                {/* Footer */}
                <SheetFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="w-full"
                  >
                    Close
                  </Button>
                </SheetFooter>
              </>
            )}

            {currentStep === "stockUnits" && selectedProduct && (
              <StockUnitListStep
                product={selectedProduct}
                warehouseId={warehouseId}
                scannedUnits={scannedUnits}
                onStockUnitSelect={handleStockUnitSelect}
                onBack={handleBackToProducts}
              />
            )}
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
