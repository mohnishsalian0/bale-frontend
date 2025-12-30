"use client";

import { useState } from "react";
import { IconBolt, IconTrash, IconPhoto } from "@tabler/icons-react";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ImageWrapper from "@/components/ui/image-wrapper";
import { SelectInventorySheet } from "@/app/(protected)/warehouse/[warehouse_slug]/goods-outward/SelectInventorySheet";
import { StockUnitQuantitySheet } from "@/app/(protected)/warehouse/[warehouse_slug]/goods-outward/StockUnitQuantitySheet";
import { formatStockUnitNumber } from "@/lib/utils/product";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import {
  getMeasuringUnitAbbreviation,
  pluralizeMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import { getStockUnitWithProductDetail } from "@/lib/queries/stock-units";
import { StockUnitWithProductDetailView } from "@/types/stock-units.types";

const SCAN_DELAY: number = 1200;

export interface ScannedStockUnit {
  stockUnit: StockUnitWithProductDetailView;
  quantity: number; // User-entered quantity to dispatch
}

interface StockUnitScannerStepProps {
  scannedUnits: ScannedStockUnit[];
  onScannedUnitsChange: (units: ScannedStockUnit[]) => void;
  warehouseId: string;
}

export function StockUnitScannerStep({
  scannedUnits,
  onScannedUnitsChange,
  warehouseId,
}: StockUnitScannerStepProps) {
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showInventorySheet, setShowInventorySheet] = useState(false);
  const [showQuantitySheet, setShowQuantitySheet] = useState(false);
  const [pendingStockUnit, setPendingStockUnit] = useState<{
    stockUnit: StockUnitWithProductDetailView;
    editingIndex?: number;
    initialQuantity?: number;
  } | null>(null);

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (paused || detectedCodes.length === 0) return;

    // Pause scanning temporarily to process
    setPaused(true);

    const decodedText = detectedCodes[0].rawValue;
    console.log(decodedText);

    try {
      // Fetch stock unit with product details in single query
      const stockUnitWithProduct = await getStockUnitWithProductDetail(
        decodedText,
        { warehouseId, status: ["full", "partial"] },
      );

      if (!stockUnitWithProduct.product) {
        setError("Product not found");
        setTimeout(() => {
          setError(null);
          setPaused(false);
        }, SCAN_DELAY);
        return;
      }

      const stockType = stockUnitWithProduct.product.stock_type as StockType;

      // Check if already scanned
      const existingIndex = scannedUnits.findIndex(
        (unit) => unit.stockUnit.id === decodedText,
      );

      if (existingIndex !== -1) {
        // For piece type: increment quantity by 1
        if (stockType === "piece") {
          const updatedUnits = [...scannedUnits];
          const maxQuantity =
            updatedUnits[existingIndex].stockUnit.remaining_quantity;
          const newQuantity = Math.min(
            updatedUnits[existingIndex].quantity + 1,
            maxQuantity,
          );

          updatedUnits[existingIndex] = {
            ...updatedUnits[existingIndex],
            quantity: newQuantity,
          };

          onScannedUnitsChange(updatedUnits);
          toast.success(`Quantity increased to ${newQuantity}`);

          // Resume scanning immediately
          setPaused(false);
          return;
        }

        // For roll/batch: reopen modal with current quantity
        setPendingStockUnit({
          stockUnit: stockUnitWithProduct,
          editingIndex: existingIndex,
          initialQuantity: scannedUnits[existingIndex].quantity,
        });
        setShowQuantitySheet(true);
        return;
      }

      // New scan
      if (stockType === "piece") {
        // For piece type: add directly with quantity 1, no modal
        onScannedUnitsChange([
          ...scannedUnits,
          {
            stockUnit: stockUnitWithProduct,
            quantity: 1,
          },
        ]);
        toast.success("Added 1 piece");

        // Resume scanning immediately
        setPaused(false);
        return;
      }

      // For roll/batch: Open quantity sheet to select quantity
      setPendingStockUnit({ stockUnit: stockUnitWithProduct });
      setShowQuantitySheet(true);
      // Scanner remains paused until quantity sheet is closed
    } catch (err) {
      console.error("Error fetching stock unit:", err);
      setError("Invalid QR code");
      setTimeout(() => {
        setError(null);
        setPaused(false);
      }, SCAN_DELAY);
    }
  };

  const handleError = (err: unknown) => {
    console.error("Scanner error:", err);
    if (err instanceof Error) {
      if (err?.name === "NotAllowedError") {
        setError("Camera permission denied");
      } else if (err?.name === "NotFoundError") {
        setError("No camera found");
      }
    }
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (pendingStockUnit) {
      // Check if we're editing an existing unit or adding new
      if (pendingStockUnit.editingIndex !== undefined) {
        // Update existing unit
        const updatedUnits = [...scannedUnits];
        updatedUnits[pendingStockUnit.editingIndex] = {
          ...updatedUnits[pendingStockUnit.editingIndex],
          quantity,
        };
        onScannedUnitsChange(updatedUnits);
      } else {
        // Add new unit to scanned units with selected quantity
        onScannedUnitsChange([
          ...scannedUnits,
          {
            stockUnit: pendingStockUnit.stockUnit,
            quantity,
          },
        ]);
      }

      // Clear pending state
      setPendingStockUnit(null);

      // Resume scanning after a brief delay
      setTimeout(() => setPaused(false), SCAN_DELAY);
    }
  };

  const handleQuantitySheetClose = (open: boolean) => {
    setShowQuantitySheet(open);
    if (!open) {
      // If sheet is closed without confirming, clear pending and resume scanning
      setPendingStockUnit(null);
      setTimeout(() => setPaused(false), SCAN_DELAY);
    }
  };

  const handleRemoveUnit = (index: number) => {
    const updatedUnits = scannedUnits.filter((_, i) => i !== index);
    onScannedUnitsChange(updatedUnits);
  };

  const handleEditQuantity = (index: number) => {
    const item = scannedUnits[index];
    setPendingStockUnit({
      stockUnit: item.stockUnit,
      editingIndex: index,
      initialQuantity: item.quantity,
    });
    setShowQuantitySheet(true);
  };

  const handleOpenInventory = () => {
    setPaused(true); // Pause scanner when opening inventory
    setShowInventorySheet(true);
  };

  const handleInventorySheetClose = (open: boolean) => {
    setShowInventorySheet(open);
    if (!open) {
      // Resume scanner when sheet closes
      setPaused(false);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 overflow-auto">
      {/* Camera Section */}
      <div className="relative w-full aspect-square shrink-0 bg-gray-900 overflow-hidden">
        {/* QR Scanner */}
        <Scanner
          onScan={handleScan}
          onError={handleError}
          formats={["qr_code"]}
          paused={paused}
          components={{
            torch,
            finder: false,
          }}
          constraints={{
            facingMode: "environment",
          }}
          styles={{
            container: {
              width: "100%",
              height: "100%",
            },
            video: {
              objectFit: "cover",
            },
          }}
        >
          {/* Custom Finder */}
          <div className="absolute top-1/2 left-1/2 w-2/3 h-2/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div
              className="w-full h-full border-2 border-white rounded-2xl"
              style={{
                boxShadow:
                  "0 0 0 9999px color-mix(in srgb, var(--color-gray-900) 80%, transparent)",
              }}
            />
          </div>
        </Scanner>

        {/* Title & Error Overlay */}
        {error ? (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white/50 text-red-900 px-4 py-2 text-sm text-nowrap rounded-lg z-10">
            {error}
          </div>
        ) : (
          <p className="absolute top-10 left-1/2 -translate-x-1/2 text-lg text-white text-center whitespace-pre z-10">
            Scan QR to add item
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 absolute bottom-10 left-1/2 -translate-x-1/2 text-center z-10">
          {/* Flashlight Button */}
          <Button
            type="button"
            variant={`${torch ? "default" : "outline"}`}
            size="icon"
            onClick={() => setTorch((prev) => !prev)}
            className={`${!torch ? "text-gray-700 border-gray-500 shadow-dark-gray-md hover:bg-gray-200" : ""}`}
          >
            <IconBolt className="rotate-[270deg]" />
          </Button>

          {/* Select from Inventory Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenInventory}
            className="text-gray-700 border-gray-500 shadow-dark-gray-md hover:bg-gray-200"
          >
            Select from inventory
          </Button>
        </div>
      </div>

      {/* Scanned Products List */}
      <div className="flex-1">
        {scannedUnits.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Scan QR codes to add items</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {scannedUnits.map((item, index) => {
              const imageUrl = item.stockUnit.product?.product_images?.[0];
              let maxQuantity = item.stockUnit.remaining_quantity;
              const unitAbbreviation = getMeasuringUnitAbbreviation(
                item.stockUnit.product?.measuring_unit as MeasuringUnit | null,
              );
              const pluralizedUnit = pluralizeMeasuringUnitAbbreviation(
                item.quantity,
                unitAbbreviation,
              );
              const stockType = item.stockUnit.product?.stock_type as StockType;
              const stockUnitNumber = formatStockUnitNumber(
                item.stockUnit.sequence_number,
                stockType,
              );
              if (stockType !== "roll") {
                maxQuantity = Math.floor(maxQuantity);
              }

              return (
                <div
                  key={item.stockUnit.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-200"
                >
                  {/* Product Image */}
                  <ImageWrapper
                    size="md"
                    shape="square"
                    imageUrl={imageUrl}
                    alt={item.stockUnit.product?.name || "Product image"}
                    placeholderIcon={IconPhoto}
                  />

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      title={item.stockUnit.product?.name}
                      className="text-base font-medium text-gray-700 truncate"
                    >
                      {item.stockUnit.product?.name}
                    </p>
                    <p
                      title={stockUnitNumber}
                      className="text-xs text-gray-500 truncate"
                    >
                      {stockUnitNumber}
                    </p>
                  </div>

                  {/* Quantity Button and Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Quantity Button */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleEditQuantity(index)}
                    >
                      {item.quantity} / {maxQuantity} {pluralizedUnit}
                    </Button>

                    {/* Delete Button */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      onClick={() => handleRemoveUnit(index)}
                    >
                      <IconTrash />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Select Inventory Sheet */}
      {showInventorySheet && (
        <SelectInventorySheet
          open={showInventorySheet}
          onOpenChange={handleInventorySheetClose}
          warehouseId={warehouseId}
          scannedUnits={scannedUnits}
          onScannedUnitsChange={onScannedUnitsChange}
        />
      )}

      {/* Quantity Selection Sheet */}
      {showQuantitySheet && (
        <StockUnitQuantitySheet
          key={pendingStockUnit?.stockUnit.id}
          open={showQuantitySheet}
          onOpenChange={handleQuantitySheetClose}
          stockUnit={pendingStockUnit?.stockUnit || null}
          initialQuantity={pendingStockUnit?.initialQuantity || 0}
          onConfirm={handleQuantityConfirm}
        />
      )}
    </div>
  );
}
