"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ImageWrapper from "@/components/ui/image-wrapper";
import { DashboardSectionSkeleton } from "@/components/layouts/dashboard-section-skeleton";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { usePendingQRProducts } from "@/lib/query/hooks/dashboard";
import { useSession } from "@/contexts/session-context";
import type { StockType } from "@/types/database/enums";

interface PendingQRCodesSectionProps {
  warehouseSlug: string;
  onNavigate: (path: string) => void;
}

export function PendingQRCodesSection({
  warehouseSlug,
  onNavigate,
}: PendingQRCodesSectionProps) {
  const { warehouse } = useSession();
  const router = useRouter();

  // Fetch pending QR products using the hook
  const {
    data: products = [],
    isLoading,
    isError,
  } = usePendingQRProducts(warehouse.id);

  // Loading state
  if (isLoading) {
    return <DashboardSectionSkeleton title="Pending QR codes" itemCount={5} />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col mt-6">
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-red-500">
            Failed to load pending QR codes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-6 pb-4">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-lg font-bold text-gray-900">Pending QR codes</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onNavigate(`/warehouse/${warehouseSlug}/products?pending_qr=true`)
          }
        >
          View all →
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">No pending QR codes</p>
        </div>
      ) : (
        <div className="flex flex-col border-b border-border">
          {products.map((product) => (
            <Card
              key={`pending-qr-${product.id}`}
              className="rounded-none border-x-0 border-b-0 shadow-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() =>
                router.push(
                  `/warehouse/${warehouseSlug}/products/${product.sequence_number}`,
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

                <div className="flex-1">
                  <p className="text-base font-medium text-gray-700">
                    {product.name || "Unknown product"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {getProductInfo(product) || "No details"}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <p className="text-sm font-semibold text-gray-700">
                    {product.pending_qr_count}
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
