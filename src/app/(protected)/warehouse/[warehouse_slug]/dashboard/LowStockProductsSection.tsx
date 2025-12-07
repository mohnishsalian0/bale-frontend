"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ProductWithInventoryListView } from "@/types/products.types";
import type { StockType, MeasuringUnit } from "@/types/database/enums";

interface LowStockProductsSectionProps {
  products: ProductWithInventoryListView[];
  warehouseSlug: string;
  onNavigate: (path: string) => void;
}

export function LowStockProductsSection({
  products,
  warehouseSlug,
  onNavigate,
}: LowStockProductsSectionProps) {
  return (
    <div className="flex flex-col mt-6">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-lg font-bold text-gray-900">Low stock products</h2>
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
          <p className="text-sm text-gray-500">No low stock products</p>
        </div>
      ) : (
        <div className="flex flex-col border-b border-border">
          {products.map((product) => (
            <Card
              key={`low-stock-${product.id}`}
              className="rounded-none border-x-0 border-b-0 shadow-none bg-transparent cursor-pointer hover:bg-gray-100 transition-colors"
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

                <div className="flex-1">
                  <p className="text-base font-medium text-gray-700">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {getProductInfo(product) || "No details"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <IconAlertTriangle className="size-4 text-yellow-700" />
                    <p className="text-sm font-semibold text-yellow-700">
                      {product.inventory.in_stock_quantity}{" "}
                      {getMeasuringUnitAbbreviation(
                        product.measuring_unit as MeasuringUnit | null,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
