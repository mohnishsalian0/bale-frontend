"use client";

import { useState } from "react";
import { QRScannerOverlay } from "@/components/ui/qr-scanner-overlay";
import { StockUnitDetailsContent } from "@/components/layouts/stock-unit-details-content";
import { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface DashboardScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DashboardScannerModal({
  open,
  onOpenChange,
}: DashboardScannerModalProps) {
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedStockUnitId, setScannedStockUnitId] = useState<string | null>(
    null,
  );

  const handleScan = async (detectedCodes: IDetectedBarcode[]) => {
    if (paused || detectedCodes.length === 0) return;

    const decodedText = detectedCodes[0].rawValue;

    // Pause scanning and set the scanned stock unit ID
    setPaused(true);
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

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Reset state when modal closes
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
          showTorch={false}
          onScan={handleScan}
          onError={handleError}
          showResumeButton={paused && scannedStockUnitId !== null}
          onResume={handleResume}
          error={error}
          title="Scan QR to view details"
        />
      </div>

      {/* Scanned Stock Unit Display */}
      <div className="flex-1 overflow-y-auto pt-4 md:pb-2">
        {scannedStockUnitId ? (
          <StockUnitDetailsContent stockUnitId={scannedStockUnitId} />
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
      title="Scan Stock Unit"
    >
      {content}
    </ResponsiveDialog>
  );
}
