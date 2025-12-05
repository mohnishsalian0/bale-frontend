"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import { getPendingQRProducts } from "@/lib/queries/dashboard";
import { usePartners } from "./partners";
import { useSalesOrders } from "./sales-orders";
import { useLowStockProducts } from "./products";

/**
 * Fetch products with pending QR codes for dashboard widget
 */
export function usePendingQRProducts(warehouseId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.pendingQR(warehouseId),
    queryFn: () => getPendingQRProducts(warehouseId),
    ...getQueryOptions(STALE_TIME.DASHBOARD, GC_TIME.REALTIME),
  });
}

/**
 * Composite hook to fetch all dashboard data at once
 * Useful for dashboard pages to minimize loading states
 */
export function useDashboardData(warehouseId: string) {
  // Fetch active sales orders (approval_pending and in_progress)
  const salesOrders = useSalesOrders(warehouseId, {
    status: ["approval_pending", "in_progress"],
    order_by: "order_date",
    order_direction: "desc",
    limit: 5,
  });

  const lowStock = useLowStockProducts(warehouseId);
  const pendingQR = usePendingQRProducts(warehouseId);

  // Fetch recent customers (limit 8 to check if more exist)
  const recentCustomers = usePartners({
    partner_type: "customer",
    order_by: "last_interaction_at",
    order_direction: "desc",
    limit: 8,
  });

  // Fetch recent suppliers/vendors (limit 8 to check if more exist)
  const recentSuppliers = usePartners({
    partner_type: ["supplier", "vendor"],
    order_by: "last_interaction_at",
    order_direction: "desc",
    limit: 8,
  });

  return {
    data: {
      salesOrders: salesOrders.data?.data || [],
      lowStockProducts: lowStock.data || [],
      pendingQRProducts: pendingQR.data || [],
      recentCustomers: recentCustomers.data || [],
      recentSuppliers: recentSuppliers.data || [],
    },
    isLoading:
      salesOrders.isLoading ||
      lowStock.isLoading ||
      pendingQR.isLoading ||
      recentCustomers.isLoading ||
      recentSuppliers.isLoading,
    isError:
      salesOrders.isError ||
      lowStock.isError ||
      pendingQR.isError ||
      recentCustomers.isError ||
      recentSuppliers.isError,
    refetch: () => {
      salesOrders.refetch();
      lowStock.refetch();
      pendingQR.refetch();
      recentCustomers.refetch();
      recentSuppliers.refetch();
    },
  };
}
