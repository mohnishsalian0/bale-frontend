"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getSalesOrders,
  getSalesOrderByNumber,
  getSalesOrdersByCustomer,
  createSalesOrder,
  type CreateSalesOrderData,
  type CreateSalesOrderLineItem,
} from "@/lib/queries/sales-orders";

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
      queryClient.invalidateQueries({
        queryKey: queryKeys.salesOrders.all(warehouseId),
      });
    },
  });

  return {
    create,
  };
}
