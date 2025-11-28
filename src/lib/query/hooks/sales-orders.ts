"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import { getSalesOrders, getSalesOrder } from "@/lib/queries/sales-orders";

/**
 * Fetch all sales orders for a warehouse
 */
export function useSalesOrders(warehouseId: string | null) {
  return useQuery({
    queryKey: queryKeys.salesOrders.all(warehouseId),
    queryFn: () => getSalesOrders(warehouseId),
    ...getQueryOptions(STALE_TIME.SALES_ORDERS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch single sales order by sequence number
 */
export function useSalesOrder(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.salesOrders.detail(sequenceNumber || ""),
    queryFn: () => getSalesOrder(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.SALES_ORDERS, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Sales order mutations (create, update, delete)
 */
export function useSalesOrderMutations(_warehouseId: string | null) {
  // const queryClient = useQueryClient();

  return {
    // Placeholder for mutations
    // Would need corresponding functions in queries/sales-orders.ts
    // updateStatus: useMutation({
    //   mutationFn: ({ orderId, status }) => updateSalesOrderStatus(orderId, status),
    //   onSuccess: (_, variables) => {
    //     queryClient.invalidateQueries({ queryKey: queryKeys.salesOrders.detail(variables.orderId) });
    //     queryClient.invalidateQueries({ queryKey: queryKeys.salesOrders.all(warehouseId) });
    //   },
    // }),
  };
}
