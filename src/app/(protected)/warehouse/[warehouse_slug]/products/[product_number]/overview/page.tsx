"use client";

import { use } from "react";
import Image from "next/image";
import {
  IconTrendingUp,
  IconInfoCircle,
  IconBox,
  IconNote,
} from "@tabler/icons-react";
import { Section } from "@/components/layouts/section";
import { formatCurrency } from "@/lib/utils/financial";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { getStockTypeDisplay } from "@/lib/utils/product";
import type { MeasuringUnit } from "@/types/database/enums";
import { useProductWithInventoryAndOrdersByNumber } from "@/lib/query/hooks/products";
import { useSession } from "@/contexts/session-context";
import { LoadingState } from "@/components/layouts/loading-state";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    product_number: string;
  }>;
}

export default function SummaryPage({ params }: PageParams) {
  const { product_number } = use(params);
  const { warehouse } = useSession();

  // Fetch product (will use cached data from layout)
  const { data: product, isLoading } = useProductWithInventoryAndOrdersByNumber(
    product_number,
    warehouse.id,
  );

  if (isLoading || !product) {
    return <LoadingState message="Loading summary..." />;
  }

  const unitAbbr = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit,
  );
  const productImages = product.product_images || [];

  return (
    <div className="flex flex-col p-4 gap-3">
      {/* Sales Section */}
      <Section
        title={`0 ${unitAbbr} sold`}
        subtitle="Sales"
        icon={() => <IconTrendingUp />}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Revenue</span>
            <span className="font-semibold text-gray-700">₹0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Last sale date</span>
            <span className="font-semibold text-gray-700">—</span>
          </div>
        </div>
      </Section>

      {/* Stock Section */}
      <Section title="Stock information" subtitle="" icon={() => <IconBox />}>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Stock type</span>
            <span className="font-semibold text-gray-700">
              {getStockTypeDisplay(product.stock_type)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Measuring unit</span>
            <span className="font-semibold text-gray-700">{unitAbbr}</span>
          </div>
          {product.min_stock_alert && product.min_stock_threshold && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Minimum stock</span>
              <span className="font-semibold text-gray-700">
                {product.min_stock_threshold} {unitAbbr}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* Product Information Section */}
      <Section
        title="Product information"
        subtitle=""
        icon={() => <IconInfoCircle />}
      >
        <div className="space-y-3">
          {/* Product Images Carousel */}
          {productImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {productImages.slice(0, 6).map((image, index) => (
                <div
                  key={index}
                  className="relative size-16 rounded shrink-0 bg-gray-100 overflow-hidden"
                >
                  <Image
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {product.cost_price_per_unit && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Purchase price per unit</span>
              <span className="font-semibold text-gray-700">
                ₹{formatCurrency(product.cost_price_per_unit)}/{unitAbbr}
              </span>
            </div>
          )}
          {product.selling_price_per_unit && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Selling price per unit</span>
              <span className="font-semibold text-gray-700">
                ₹{formatCurrency(product.selling_price_per_unit)}/{unitAbbr}
              </span>
            </div>
          )}
          {product.gsm && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">GSM</span>
              <span className="font-semibold text-gray-700">
                {product.gsm} gm/m²
              </span>
            </div>
          )}
          {product.thread_count_cm && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Thread count</span>
              <span className="font-semibold text-gray-700">
                {product.thread_count_cm} TPI
              </span>
            </div>
          )}
          {product.hsn_code && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">HSN code</span>
              <span className="font-semibold text-gray-700">
                {product.hsn_code}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* Notes Section */}
      <Section
        title="Inward notes"
        subtitle={product.notes || "No note added"}
        icon={() => <IconNote />}
      />
    </div>
  );
}
