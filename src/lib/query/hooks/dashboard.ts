"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getDashboardSalesOrders,
  getLowStockProducts,
  getPendingQRProducts,
  getRecentPartners,
} from "@/lib/queries/dashboard";

/**
 * Fetch dashboard sales orders (recent orders)
 */
export function useDashboardSalesOrders(warehouseId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.salesOrders(warehouseId),
    queryFn: () => getDashboardSalesOrders(warehouseId),
    ...getQueryOptions(STALE_TIME.DASHBOARD, GC_TIME.REALTIME),
  });
}

/**
 * Fetch low stock products for dashboard widget
 */
export function useLowStockProducts(warehouseId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.lowStock(warehouseId),
    queryFn: () => getLowStockProducts(warehouseId),
    ...getQueryOptions(STALE_TIME.DASHBOARD, GC_TIME.REALTIME),
  });
}

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
 * Fetch recent partners (customers and suppliers) for dashboard widget
 */
export function useRecentPartners() {
  return useQuery({
    queryKey: queryKeys.dashboard.recentPartners(),
    queryFn: () => getRecentPartners(),
    ...getQueryOptions(STALE_TIME.DASHBOARD, GC_TIME.REALTIME),
  });
}

/**
 * Composite hook to fetch all dashboard data at once
 * Useful for dashboard pages to minimize loading states
 */
export function useDashboardData(warehouseId: string) {
  const salesOrders = useDashboardSalesOrders(warehouseId);
  const lowStock = useLowStockProducts(warehouseId);
  const pendingQR = usePendingQRProducts(warehouseId);
  const recentPartners = useRecentPartners();

  return {
    data: {
      salesOrders: salesOrders.data || [],
      lowStockProducts: lowStock.data || [],
      pendingQRProducts: pendingQR.data || [],
      recentCustomers: recentPartners.data?.customers || [],
      recentSuppliers: recentPartners.data?.suppliers || [],
    },
    isLoading:
      salesOrders.isLoading ||
      lowStock.isLoading ||
      pendingQR.isLoading ||
      recentPartners.isLoading,
    isError:
      salesOrders.isError ||
      lowStock.isError ||
      pendingQR.isError ||
      recentPartners.isError,
    refetch: () => {
      salesOrders.refetch();
      lowStock.refetch();
      pendingQR.refetch();
      recentPartners.refetch();
    },
  };
}
