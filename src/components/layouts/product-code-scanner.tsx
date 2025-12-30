"use client";

import { useState } from "react";
import { IDetectedBarcode } from "@yudiel/react-qr-scanner";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { QRScannerOverlay } from "@/components/ui/qr-scanner-overlay";

interface ProductCodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCodeScanned: (code: string) => void;
}

export function ProductCodeScanner({
  open,
  onOpenChange,
  onCodeScanned,
}: ProductCodeScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (detectedCodes: IDetectedBarcode[]) => {
    if (detectedCodes.length === 0) return;

    const code = detectedCodes[0].rawValue.trim();
    onCodeScanned(code);
    onOpenChange(false);
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

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setError(null);
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* QR Scanner Section */}
      <div className="sm:rounded-lg overflow-clip">
        <QRScannerOverlay
          paused={false}
          torch={false}
          onTorchToggle={() => {}} // No-op since showTorch is false
          onScan={handleScan}
          onError={handleError}
          error={error}
          title="Scan product barcode or QR code"
          formats={["qr_code", "code_128", "code_39", "ean_13", "ean_8"]}
          showTorch={false}
        />
      </div>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleClose}
      title="Scan Product Code"
    >
      {content}
    </ResponsiveDialog>
  );
}
