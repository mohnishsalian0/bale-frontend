"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getSalesOrders,
  getSalesOrderByNumber,
  getSalesOrdersByCustomer,
  createSalesOrder,
  approveSalesOrder,
  cancelSalesOrder,
  completeSalesOrder,
  type SalesOrderFilters,
  type CreateSalesOrderData,
  type CreateSalesOrderLineItem,
  type UpdateSalesOrderData,
  type CancelSalesOrderData,
  type CompleteSalesOrderData,
} from "@/lib/queries/sales-orders";

/**
 * Fetch sales orders for a warehouse with optional filters
 *
 * Examples:
 * - All orders: useSalesOrders(warehouseId)
 * - Pending orders: useSalesOrders(warehouseId, { status: 'approval_pending' })
 * - Active orders: useSalesOrders(warehouseId, { status: ['approval_pending', 'in_progress'] })
 * - Paginated orders: useSalesOrders(warehouseId, filters, page, pageSize)
 */
export function useSalesOrders(
  warehouseId: string | null,
  filters?: SalesOrderFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.salesOrders.all(warehouseId, filters, page),
    queryFn: () => getSalesOrders(warehouseId, filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.SALES_ORDERS, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
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
  filters?: SalesOrderFilters,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: queryKeys.salesOrders.customer(customerId || ""),
    queryFn: () => getSalesOrdersByCustomer(customerId!, filters),
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

  const approve = useMutation({
    mutationFn: ({
      orderId,
      orderData,
      lineItems,
    }: {
      orderId: string;
      orderData: UpdateSalesOrderData;
      lineItems: CreateSalesOrderLineItem[];
    }) => approveSalesOrder(orderId, orderData, lineItems),
    onSuccess: () => {
      // Invalidate all sales order queries
      queryClient.invalidateQueries({
        queryKey: ["sales-orders"],
      });
    },
  });

  const cancel = useMutation({
    mutationFn: ({
      orderId,
      cancelData,
    }: {
      orderId: string;
      cancelData: CancelSalesOrderData;
    }) => cancelSalesOrder(orderId, cancelData),
    onSuccess: () => {
      // Invalidate all sales order queries
      queryClient.invalidateQueries({
        queryKey: ["sales-orders"],
      });
    },
  });

  const complete = useMutation({
    mutationFn: ({
      orderId,
      completeData,
    }: {
      orderId: string;
      completeData: CompleteSalesOrderData;
    }) => completeSalesOrder(orderId, completeData),
    onSuccess: () => {
      // Invalidate all sales order queries
      queryClient.invalidateQueries({
        queryKey: ["sales-orders"],
      });
    },
  });

  return {
    create,
    approve,
    cancel,
    complete,
  };
}
