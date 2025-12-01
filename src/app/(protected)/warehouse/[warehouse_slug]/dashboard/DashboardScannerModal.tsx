"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { QRScannerOverlay } from "@/components/ui/qr-scanner-overlay";
import {
  StockUnitDetailsContent,
  type StockUnitWithProduct,
} from "@/components/layouts/stock-unit-details-content";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/browser";
import { formatStockUnitNumber } from "@/lib/utils/product";
import { useSession } from "@/contexts/session-context";
import type { StockType, StockUnitStatus } from "@/types/database/enums";
import { PRODUCT_WITH_ATTRIBUTES_SELECT } from "@/lib/queries/products";

const SCAN_DELAY = 1200;

interface DashboardScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DashboardScannerModal({
  open,
  onOpenChange,
}: DashboardScannerModalProps) {
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const supabase = createClient();

  const [torch, setTorch] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedStockUnit, setScannedStockUnit] =
    useState<StockUnitWithProduct | null>(null);

  const handleScan = async (detectedCodes: any[]) => {
    if (paused || detectedCodes.length === 0) return;

    // Pause scanning temporarily to process
    setPaused(true);

    const decodedText = detectedCodes[0].rawValue;

    try {
      // Fetch stock unit from database by ID
      const { data: stockUnit, error: stockError } = await supabase
        .from("stock_units")
        .select("*")
        .eq("id", decodedText)
        .eq("warehouse_id", warehouse.id)
        .single();

      if (stockError || !stockUnit) {
        setError("Stock unit not found in this warehouse");
        setTimeout(() => {
          setError(null);
          setPaused(false);
        }, SCAN_DELAY);
        return;
      }

      // Fetch product details with attributes
      const { data: product, error: productError } = await supabase
        .from("products")
        .select(
          `
					${PRODUCT_WITH_ATTRIBUTES_SELECT}
				`,
        )
        .eq("id", stockUnit.product_id)
        .single();

      if (productError || !product) {
        setError("Product not found");
        setTimeout(() => {
          setError(null);
          setPaused(false);
        }, SCAN_DELAY);
        return;
      }

      // Set the scanned stock unit with product data
      setScannedStockUnit({
        ...stockUnit,
        product,
      });

      // Scanner remains paused until user clicks Resume
    } catch (err) {
      console.error("Error fetching stock unit:", err);
      setError("Invalid QR code");
      setTimeout(() => {
        setError(null);
        setPaused(false);
      }, SCAN_DELAY);
    }
  };

  const handleError = (err: any) => {
    console.error("Scanner error:", err);
    if (err?.name === "NotAllowedError") {
      setError("Camera permission denied");
    } else if (err?.name === "NotFoundError") {
      setError("No camera found");
    }
  };

  const handleResume = () => {
    // Clear scanned unit and resume scanning
    setScannedStockUnit(null);
    setPaused(false);
  };

  const handleTorchToggle = () => {
    setTorch((prev) => !prev);
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state when modal closes
      setTorch(false);
      setPaused(false);
      setError(null);
      setScannedStockUnit(null);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* QR Scanner Section */}
      <div className="sm:rounded-lg overflow-clip">
        <QRScannerOverlay
          paused={paused}
          torch={torch}
          onTorchToggle={handleTorchToggle}
          onScan={handleScan}
          onError={handleError}
          showResumeButton={paused && scannedStockUnit !== null}
          onResume={handleResume}
          error={error}
          title="Scan QR to view details"
        />
      </div>

      {/* Scanned Stock Unit Display */}
      <div className="flex-1 overflow-y-auto">
        {scannedStockUnit ? (
          <StockUnitDetailsContent stockUnit={scannedStockUnit} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No stock unit scanned yet</p>
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleClose}>
        <DrawerContent className="h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>
              {scannedStockUnit ? (
                <>
                  {formatStockUnitNumber(
                    scannedStockUnit.sequence_number,
                    scannedStockUnit.product?.stock_type as StockType,
                  )}
                  <StockStatusBadge
                    status={scannedStockUnit.status as StockUnitStatus}
                  />
                </>
              ) : (
                "Scan Stock Unit"
              )}
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {scannedStockUnit ? (
              <>
                {formatStockUnitNumber(
                  scannedStockUnit.sequence_number,
                  scannedStockUnit.product?.stock_type as StockType,
                )}
                <StockStatusBadge
                  status={scannedStockUnit.status as StockUnitStatus}
                />
              </>
            ) : (
              "Scan Stock Unit"
            )}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
