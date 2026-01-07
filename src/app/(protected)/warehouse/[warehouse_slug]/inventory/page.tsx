"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/contexts/session-context";
import {
  QuickActionButton,
  type QuickAction,
} from "@/components/ui/quick-action-button";
import { IconShirt, IconQrcode } from "@tabler/icons-react";
import IconGoodsInward from "@/components/icons/IconGoodsInward";
import IconGoodsOutward from "@/components/icons/IconGoodsOutward";
import { Button } from "@/components/ui/button";
import { LowStockProductsSection } from "../dashboard/LowStockProductsSection";
import { PendingQRCodesSection } from "../dashboard/PendingQRCodesSection";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInventoryAggregates } from "@/lib/query/hooks/aggregates";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import { MeasuringUnit } from "@/types/database/enums";

export default function InventoryPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();

  // Fetch inventory aggregates
  const { data: inventoryStats } = useInventoryAggregates({
    warehouseId: warehouse.id,
  });

  const totalProducts = inventoryStats?.product_count || 0;
  const inStockQuantity = formatMeasuringUnitQuantities(
    inventoryStats?.total_quantities_by_unit ||
      new Map<MeasuringUnit, number>(),
  );

  // Quick actions array
  const quickActions: QuickAction[] = [
    {
      icon: IconShirt,
      label: "Create product",
      href: `/warehouse/${warehouse.slug}/products`,
    },
    {
      icon: IconGoodsInward,
      label: "Goods inward",
      href: `/warehouse/${warehouse.slug}/goods-inward/create`,
    },
    {
      icon: IconGoodsOutward,
      label: "Goods outward",
      href: `/warehouse/${warehouse.slug}/goods-outward/create`,
    },
    {
      icon: IconQrcode,
      label: "QR code batch",
      href: `/warehouse/${warehouse.slug}/qr-codes/create`,
    },
  ];

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-teal-700 font-medium">{totalProducts}</span>
              <span> products</span>
              <span> • </span>
              <span className="text-teal-700 font-medium">
                {inStockQuantity}
              </span>
              <span className="text-gray-500"> in stock</span>
            </p>
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/inventory-shelf.png"
            alt="Inventory"
            fill
            sizes="100px"
            className="object-contain"
            priority
            quality={85}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 md:grid-cols-6 px-2 mt-6">
        {quickActions.map((action) => (
          <QuickActionButton
            key={action.label}
            action={action}
            onClick={() => {
              if (action.onClick) {
                action.onClick();
              } else if (action.href) {
                router.push(action.href);
              }
            }}
          />
        ))}
      </div>

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-2 gap-y-3 px-4 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/products`)}
        >
          View all products
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/stock-flow`)}
        >
          View all goods movement
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/warehouse/${warehouse.slug}/qr-codes`)}
        >
          View all QR batches
        </Button>
      </div>

      {/* Low Stock Products Section */}
      <LowStockProductsSection
        warehouseSlug={warehouse.slug}
        onNavigate={(path) => router.push(path)}
      />

      {/* Pending QR Codes Section */}
      <PendingQRCodesSection
        warehouseSlug={warehouse.slug}
        onNavigate={(path) => router.push(path)}
      />
    </div>
  );
}
