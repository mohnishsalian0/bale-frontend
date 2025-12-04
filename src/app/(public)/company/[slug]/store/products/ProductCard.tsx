"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { IconTrash } from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { PublicProduct } from "@/lib/queries/catalog";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { ProductStockStatusBadge } from "@/components/ui/product-stock-badge";

interface ProductCardProps {
  product: PublicProduct;
  quantity?: number;
  onAddToCart: (product: PublicProduct) => void;
  onRemove: (productId: string) => void;
}

export function ProductCard({
  product,
  quantity = 0,
  onAddToCart,
  onRemove,
}: ProductCardProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  const images = product.product_images || [];
  const hasMultipleImages = images.length > 1;

  useEffect(() => {
    if (!api) {
      return;
    }

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleAddToCart = () => {
    onAddToCart(product);
  };

  // Get material and color info
  const productInfoText = getProductInfo(product);
  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        {/* Image Carousel */}
        {images.length > 0 ? (
          <div className="relative">
            <Carousel className="w-full" setApi={setApi}>
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-clip">
                      <Image
                        src={image}
                        alt={`${product.name} - Image ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
            {/* Carousel Dots */}
            {hasMultipleImages && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`size-2 rounded-full transition-all ${
                      index === current
                        ? "bg-white w-6"
                        : "bg-white/60 hover:bg-white/80"
                    }`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative aspect-[16/9] bg-gray-100 rounded-lg overflow-clip flex items-center justify-center">
            {(() => {
              const Icon = getProductIcon(product.stock_type as StockType);
              return <Icon className="size-16 text-gray-400" />;
            })()}
          </div>
        )}

        {/* Product Info */}
        <div className="py-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3
                className="font-medium text-gray-900 truncate"
                title={product.name}
              >
                {product.name}
              </h3>
              {productInfoText && (
                <p
                  className="text-xs text-gray-500 truncate"
                  title={productInfoText}
                >
                  {productInfoText}
                </p>
              )}
            </div>
            <ProductStockStatusBadge status={product.stock_status} />
          </div>

          {/* Add to Cart / Quantity Button */}
          {quantity > 0 ? (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={() => onRemove(product.id)}
              >
                <IconTrash />
              </Button>
              <Button
                onClick={handleAddToCart}
                className="flex-1 max-w-60"
                size="sm"
              >
                {quantity} {unitAbbreviation}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAddToCart}
              className="w-full max-w-60 ml-auto"
              variant="outline"
              size="sm"
            >
              Add to cart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
