"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getSalesOrders,
  getSalesOrderByNumber,
  getSalesOrdersByCustomer,
  createSalesOrder,
  type SalesOrderFilters,
  type CreateSalesOrderData,
  type CreateSalesOrderLineItem,
} from "@/lib/queries/sales-orders";

/**
 * Fetch sales orders for a warehouse with optional filters
 *
 * Examples:
 * - All orders: useSalesOrders(warehouseId)
 * - Pending orders: useSalesOrders(warehouseId, { status: 'approval_pending' })
 * - Active orders: useSalesOrders(warehouseId, { status: ['approval_pending', 'in_progress'] })
 * - Recent orders: useSalesOrders(warehouseId, { limit: 5 })
 */
export function useSalesOrders(
  warehouseId: string | null,
  filters?: SalesOrderFilters,
) {
  return useQuery({
    queryKey: queryKeys.salesOrders.all(warehouseId, filters),
    queryFn: () => getSalesOrders(warehouseId, filters),
    ...getQueryOptions(STALE_TIME.SALES_ORDERS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch single sales order by sequence number
 */
export function useSalesOrderByNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.salesOrders.detail(sequenceNumber || ""),
    queryFn: () => getSalesOrderByNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.SALES_ORDERS, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch sales orders for a customer (for partner detail page)
 */
export function useSalesOrdersByCustomer(
  customerId: string | null,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: queryKeys.salesOrders.customer(customerId || ""),
    queryFn: () => getSalesOrdersByCustomer(customerId!),
    ...getQueryOptions(STALE_TIME.SALES_ORDERS, GC_TIME.TRANSACTIONAL),
    enabled: !!customerId && enabled,
  });
}

/**
 * Sales order mutations (create, update, delete)
 */
export function useSalesOrderMutations(warehouseId: string | null) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: ({
      orderData,
      lineItems,
    }: {
      orderData: CreateSalesOrderData;
      lineItems: CreateSalesOrderLineItem[];
    }) => createSalesOrder(orderData, lineItems),
    onSuccess: () => {
      // Invalidate all sales order queries for this warehouse (regardless of filters)
      queryClient.invalidateQueries({
        queryKey: ["sales-orders", warehouseId],
      });
    },
  });

  return {
    create,
  };
}
