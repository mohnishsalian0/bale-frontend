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
  getPurchaseOrders,
  getPurchaseOrderByNumber,
  createPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  completePurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderLineItems,
  updatePurchaseOrderWithItems,
  deletePurchaseOrder,
  type PurchaseOrderFilters,
  type CreatePurchaseOrderData,
  type CreatePurchaseOrderLineItem,
  type UpdatePurchaseOrderData,
  type CancelPurchaseOrderData,
  type CompletePurchaseOrderData,
} from "@/lib/queries/purchase-orders";
import { PurchaseOrderUpdate } from "@/types/purchase-orders.types";

/**
 * Fetch purchase orders for a warehouse with optional filters
 *
 * Examples:
 * - All orders: usePurchaseOrders(warehouseId)
 * - Pending orders: usePurchaseOrders(warehouseId, { status: 'approval_pending' })
 * - Active orders: usePurchaseOrders(warehouseId, { status: ['approval_pending', 'in_progress'] })
 * - Paginated orders: usePurchaseOrders(warehouseId, filters, page, pageSize)
 */
export function usePurchaseOrders({
  filters,
  page = 1,
  pageSize = 25,
  enabled = true,
}: {
  filters?: PurchaseOrderFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.all(filters, page),
    queryFn: () => getPurchaseOrders(filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.PURCHASE_ORDERS, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Fetch purchase orders with infinite scroll
 *
 * Used in link-to steps where we need to display a scrollable list of orders
 */
export function useInfinitePurchaseOrders(
  filters?: PurchaseOrderFilters,
  pageSize: number = 30,
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.purchaseOrders.all(filters, 1), "infinite"],
    queryFn: ({ pageParam = 1 }) =>
      getPurchaseOrders(filters, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = Math.ceil(lastPage.totalCount / pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    ...getQueryOptions(STALE_TIME.PURCHASE_ORDERS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch single purchase order by sequence number
 */
export function usePurchaseOrderByNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(sequenceNumber || ""),
    queryFn: () => getPurchaseOrderByNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.PURCHASE_ORDERS, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Purchase order mutations (create, update, delete)
 */
export function usePurchaseOrderMutations(warehouseId: string | null) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: ({
      orderData,
      lineItems,
    }: {
      orderData: CreatePurchaseOrderData;
      lineItems: CreatePurchaseOrderLineItem[];
    }) => createPurchaseOrder(orderData, lineItems),
    onSuccess: () => {
      // Invalidate all purchase order queries for this warehouse (regardless of filters)
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", warehouseId],
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
      orderData: UpdatePurchaseOrderData;
      lineItems: CreatePurchaseOrderLineItem[];
    }) => approvePurchaseOrder(orderId, orderData, lineItems),
    onSuccess: () => {
      // Invalidate all purchase order queries
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });
    },
  });

  const cancel = useMutation({
    mutationFn: ({
      orderId,
      cancelData,
    }: {
      orderId: string;
      cancelData: CancelPurchaseOrderData;
    }) => cancelPurchaseOrder(orderId, cancelData),
    onSuccess: () => {
      // Invalidate all purchase order queries
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });
    },
  });

  const complete = useMutation({
    mutationFn: ({
      orderId,
      completeData,
    }: {
      orderId: string;
      completeData: CompletePurchaseOrderData;
    }) => completePurchaseOrder(orderId, completeData),
    onSuccess: () => {
      // Invalidate all purchase order queries
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });
    },
  });

  const update = useMutation({
    mutationFn: ({
      orderId,
      data,
    }: {
      orderId: string;
      data: Partial<PurchaseOrderUpdate>;
    }) => updatePurchaseOrder(orderId, data),
    onSuccess: () => {
      // Invalidate all purchase order queries
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });
    },
  });

  const updateLineItems = useMutation({
    mutationFn: ({
      orderId,
      lineItems,
    }: {
      orderId: string;
      lineItems: CreatePurchaseOrderLineItem[];
    }) => updatePurchaseOrderLineItems(orderId, lineItems),
    onSuccess: () => {
      // Invalidate all purchase order queries
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });
    },
  });

  const updateWithItems = useMutation({
    mutationFn: ({
      orderId,
      orderData,
      lineItems,
    }: {
      orderId: string;
      orderData: UpdatePurchaseOrderData;
      lineItems: CreatePurchaseOrderLineItem[];
    }) => updatePurchaseOrderWithItems(orderId, orderData, lineItems),
    onSuccess: () => {
      // Invalidate all purchase order queries
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });
    },
  });

  const delete_ = useMutation({
    mutationFn: (orderId: string) => deletePurchaseOrder(orderId),
    onSuccess: () => {
      // Invalidate all purchase order queries
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders"],
      });
    },
  });

  return {
    create,
    approve,
    cancel,
    complete,
    update,
    updateLineItems,
    updateWithItems,
    delete: delete_,
  };
}
