"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import type { PendingQRProduct } from "@/lib/queries/dashboard";
import type { StockType } from "@/types/database/enums";

interface PendingQRCodesSectionProps {
  products: PendingQRProduct[];
  warehouseSlug: string;
  onNavigate: (path: string) => void;
}

export function PendingQRCodesSection({
  products,
  warehouseSlug,
  onNavigate,
}: PendingQRCodesSectionProps) {
  return (
    <div className="flex flex-col mt-6 pb-4">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-lg font-bold text-gray-900">Pending QR codes</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate(`/warehouse/${warehouseSlug}/inventory`)}
        >
          View all →
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No pending QR codes</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {products.map((product) => (
            <Card
              key={`pending-qr-${product.id}`}
              className="rounded-none border-2 rounded-lg shadow-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() =>
                onNavigate(
                  `/warehouse/${warehouseSlug}/inventory/${product.sequence_number}`,
                )
              }
            >
              <CardContent className="p-4 flex gap-4 items-center">
                <ImageWrapper
                  size="md"
                  shape="square"
                  imageUrl={product.product_images?.[0]}
                  alt={product.name}
                  placeholderIcon={getProductIcon(
                    product.stock_type as StockType,
                  )}
                />

                <div className="flex-1 flex flex-col items-start">
                  <p className="font-medium text-gray-700">
                    {product.name || "Unknown product"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getProductInfo(product) || "No details"}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <p className="text-sm font-medium text-gray-700">
                    {product.pending_qr_count} QR codes
                  </p>
                  <p className="text-xs text-gray-500">pending</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
