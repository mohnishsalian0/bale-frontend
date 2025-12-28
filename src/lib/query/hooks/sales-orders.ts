"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getSalesOrders,
  getSalesOrderByNumber,
  createSalesOrder,
  createQuickSalesOrder,
  approveSalesOrder,
  cancelSalesOrder,
  completeSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  updateSalesOrderLineItems,
  type SalesOrderFilters,
  type CreateSalesOrderData,
  type CreateSalesOrderLineItem,
  type UpdateSalesOrderData,
  type CancelSalesOrderData,
  type CompleteSalesOrderData,
} from "@/lib/queries/sales-orders";
import { SalesOrderUpdate } from "@/types/sales-orders.types";

/**
 * Fetch sales orders for a warehouse with optional filters
 *
 * Examples:
 * - All orders: useSalesOrders(warehouseId)
 * - Pending orders: useSalesOrders(warehouseId, { status: 'approval_pending' })
 * - Active orders: useSalesOrders(warehouseId, { status: ['approval_pending', 'in_progress'] })
 * - Paginated orders: useSalesOrders(warehouseId, filters, page, pageSize)
 */
export function useSalesOrders({
  filters,
  page = 1,
  pageSize = 25,
  enabled = true,
}: {
  filters?: SalesOrderFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.salesOrders.all(filters, page),
    queryFn: () => getSalesOrders(filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.SALES_ORDERS, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Fetch sales orders with infinite scroll
 *
 * Used in link-to steps where we need to display a scrollable list of orders
 */
export function useInfiniteSalesOrders(
  filters?: SalesOrderFilters,
  pageSize: number = 30,
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.salesOrders.all(filters, 1), "infinite"],
    queryFn: ({ pageParam = 1 }) =>
      getSalesOrders(filters, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = Math.ceil(lastPage.totalCount / pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
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

  const quickCreate = useMutation({
    mutationFn: ({
      orderData,
      orderItems,
      stockUnitItems,
    }: {
      orderData: CreateSalesOrderData;
      orderItems: CreateSalesOrderLineItem[];
      stockUnitItems: Array<{
        stock_unit_id: string;
        quantity: number;
      }>;
    }) => createQuickSalesOrder(orderData, orderItems, stockUnitItems),
    onSuccess: () => {
      // Invalidate sales orders
      queryClient.invalidateQueries({
        queryKey: ["sales-orders", warehouseId],
      });
      // Invalidate goods outward/stock flow (quick sales order creates both)
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", warehouseId],
      });
      // Invalidate stock units (quantities updated)
      queryClient.invalidateQueries({
        queryKey: ["stock-units", warehouseId],
      });
      // Invalidate products (inventory counts updated)
      queryClient.invalidateQueries({
        queryKey: ["products", warehouseId],
      });
      // Invalidate dashboard (statistics updated)
      queryClient.invalidateQueries({
        queryKey: ["dashboard", warehouseId],
      });
    },
  });

  const update = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: Partial<SalesOrderUpdate>;
    }) => updateSalesOrder(orderId, data),
    onSuccess: () => {
      // Invalidate all sales order queries
      queryClient.invalidateQueries({
        queryKey: ["sales-orders"],
      });
    },
  });

  const updateLineItems = useMutation({
    mutationFn: ({
      orderId,
      lineItems,
    }: {
      orderId: string;
      lineItems: CreateSalesOrderLineItem[];
    }) => updateSalesOrderLineItems(orderId, lineItems),
    onSuccess: () => {
      // Invalidate all sales order queries
      queryClient.invalidateQueries({
        queryKey: ["sales-orders"],
      });
    },
  });

  const delete_ = useMutation({
    mutationFn: (orderId: string) => deleteSalesOrder(orderId),
    onSuccess: () => {
      // Invalidate all sales order queries
      queryClient.invalidateQueries({
        queryKey: ["sales-orders"],
      });
    },
  });

  return {
    create,
    quickCreate,
    approve,
    cancel,
    complete,
    update,
    updateLineItems,
    delete: delete_,
  };
}
