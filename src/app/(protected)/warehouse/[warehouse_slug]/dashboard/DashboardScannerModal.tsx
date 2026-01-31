"use client";

import { useState, useEffect } from "react";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { QRScannerOverlay } from "@/components/ui/qr-scanner-overlay";
import { StockUnitDetailsContent } from "@/components/layouts/stock-unit-details-content";
import { formatStockUnitNumber } from "@/lib/utils/product";
import { useSession } from "@/contexts/session-context";
import type { StockType, StockUnitStatus } from "@/types/database/enums";
import { useStockUnitWithProductDetail } from "@/lib/query/hooks/stock-units";
import { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

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

  const [torch, setTorch] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedStockUnitId, setScannedStockUnitId] = useState<string | null>(
    null,
  );

  // Fetch stock unit detail when scanned
  const { data: scannedStockUnit, isError: isStockUnitError } =
    useStockUnitWithProductDetail(scannedStockUnitId);

  // Handle query results
  useEffect(() => {
    if (!scannedStockUnitId) return;

    if (isStockUnitError) {
      queueMicrotask(() => setError("Stock unit not found"));
      setTimeout(() => {
        setError(null);
        setPaused(false);
        setScannedStockUnitId(null);
      }, SCAN_DELAY);
      return;
    }

    if (scannedStockUnit) {
      // Check if stock unit belongs to current warehouse
      if (scannedStockUnit.current_warehouse_id !== warehouse.id) {
        queueMicrotask(() =>
          setError("Stock unit not found in this warehouse"),
        );
        setTimeout(() => {
          setError(null);
          setPaused(false);
          setScannedStockUnitId(null);
        }, SCAN_DELAY);
        return;
      }
      // Successfully loaded stock unit from current warehouse
      // Scanner remains paused until user clicks Resume
    }
  }, [scannedStockUnit, isStockUnitError, scannedStockUnitId, warehouse.id]);

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (paused || detectedCodes.length === 0) return;

    // Pause scanning temporarily to process
    setPaused(true);

    const decodedText = detectedCodes[0].rawValue;

    // Set the scanned stock unit ID to trigger the query
    setScannedStockUnitId(decodedText);
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

  const handleResume = () => {
    // Clear scanned unit and resume scanning
    setScannedStockUnitId(null);
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
      setScannedStockUnitId(null);
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

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleClose}
      title={
        scannedStockUnit ? (
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
        )
      }
    >
      {content}
    </ResponsiveDialog>
  );
}
