"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSession } from "@/contexts/session-context";
import {
  QuickActionButton,
  type QuickAction,
} from "@/components/ui/quick-action-button";
import {
  IconBolt,
  IconShoppingCart,
  IconTruckLoading,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ActiveSalesSection } from "../dashboard/ActiveSalesSection";
import { ActivePurchaseSection } from "../dashboard/ActivePurchaseSection";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  useSalesOrderAggregates,
  usePurchaseOrderAggregates,
} from "@/lib/query/hooks/aggregates";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";

export default function OrdersPage() {
  const router = useRouter();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();

  // Fetch order aggregates
  const { data: salesOrderStats } = useSalesOrderAggregates({
    warehouseId: warehouse.id,
  });

  const { data: purchaseOrderStats } = usePurchaseOrderAggregates({
    warehouseId: warehouse.id,
  });

  // Calculate totals
  const totalPendingOrders =
    (salesOrderStats?.count || 0) + (purchaseOrderStats?.count || 0);

  // Merge quantities from both sales and purchase orders
  const combinedQuantities = new Map(
    salesOrderStats?.pending_quantities_by_unit || [],
  );
  purchaseOrderStats?.pending_quantities_by_unit.forEach((qty, unit) => {
    combinedQuantities.set(unit, (combinedQuantities.get(unit) || 0) + qty);
  });

  const pendingFulfillment = formatMeasuringUnitQuantities(combinedQuantities);

  // Quick actions array
  const quickActions: QuickAction[] = [
    {
      icon: IconBolt,
      label: "Quick sale",
      href: `/warehouse/${warehouse.slug}/sales-orders/quick-create`,
    },
    {
      icon: IconShoppingCart,
      label: "Sales order",
      href: `/warehouse/${warehouse.slug}/sales-orders/create`,
    },
    {
      icon: IconTruckLoading,
      label: "Purchase order",
      href: `/warehouse/${warehouse.slug}/purchase-orders/create`,
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
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-teal-700 font-medium">
                {totalPendingOrders}
              </span>
              <span> pending orders</span>
              <span> • </span>
              <span className="text-teal-700 font-medium">
                {pendingFulfillment}
              </span>
              <span className="text-gray-500"> pending fulfillment</span>
            </p>
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/sales-order-cart.png"
            alt="Orders"
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
          onClick={() =>
            router.push(`/warehouse/${warehouse.slug}/sales-orders`)
          }
        >
          All sales
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(`/warehouse/${warehouse.slug}/purchase-orders`)
          }
        >
          All purchases
        </Button>
      </div>

      {/* Active Sales Orders Section */}
      <ActiveSalesSection
        title={`Active sales orders ${salesOrderStats?.count ? `(${salesOrderStats.count})` : ""}`}
        warehouseSlug={warehouse.slug}
      />

      {/* Active Purchase Orders Section */}
      <ActivePurchaseSection
        title={`Active purchase orders ${purchaseOrderStats?.count ? `(${purchaseOrderStats.count})` : ""}`}
        warehouseSlug={warehouse.slug}
      />
    </div>
  );
}
