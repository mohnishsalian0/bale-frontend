"use client";

import { use, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import { TabPills } from "@/components/ui/tab-pills";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Progress } from "@/components/ui/progress";
import {
  SalesStatusBadge,
  getStatusConfig as getSalesStatusConfig,
} from "@/components/ui/sales-status-badge";
import {
  PurchaseStatusBadge,
  getStatusConfig as getPurchaseStatusConfig,
} from "@/components/ui/purchase-status-badge";
import { formatAbsoluteDate, formatMonthHeader } from "@/lib/utils/date";
import { getPartnerName } from "@/lib/utils/partner";
import {
  calculateCompletionPercentage as calcSalesCompletion,
  getOrderDisplayStatus as getSalesDisplayStatus,
  getProductSummary as getSalesProductSummary,
} from "@/lib/utils/sales-order";
import {
  calculateCompletionPercentage as calcPurchaseCompletion,
  getOrderDisplayStatus as getPurchaseDisplayStatus,
  getProductSummary as getPurchaseProductSummary,
} from "@/lib/utils/purchase-order";
import { useSession } from "@/contexts/session-context";
import { useProductWithInventoryAndOrdersByNumber } from "@/lib/query/hooks/products";
import { useSalesOrders } from "@/lib/query/hooks/sales-orders";
import { usePurchaseOrders } from "@/lib/query/hooks/purchase-orders";
import type {
  SalesOrderStatus,
  PurchaseOrderStatus,
} from "@/types/database/enums";

interface PageParams {
  params: Promise<{ warehouse_slug: string; product_number: string }>;
}

const ORDER_TYPE_OPTIONS = [
  { value: "sales", label: "Sales orders" },
  { value: "purchase", label: "Purchase orders" },
];

export default function OrdersPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { product_number, warehouse_slug } = use(params);
  const { warehouse } = useSession();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const orderType = (searchParams.get("type") || "sales") as
    | "sales"
    | "purchase";
  const PAGE_SIZE = 20;

  const isSalesView = orderType === "sales";

  // Product from cache (fetched by layout)
  const { data: product } = useProductWithInventoryAndOrdersByNumber(
    product_number,
    warehouse.id,
  );

  const {
    data: salesResponse,
    isLoading: salesLoading,
    isError: salesError,
    refetch: refetchSales,
  } = useSalesOrders({
    filters: { productId: product?.id, warehouseId: warehouse.id },
    page: isSalesView ? currentPage : 1,
    pageSize: PAGE_SIZE,
    enabled: isSalesView && !!product?.id,
  });

  const {
    data: purchaseResponse,
    isLoading: purchaseLoading,
    isError: purchaseError,
    refetch: refetchPurchase,
  } = usePurchaseOrders({
    filters: { productId: product?.id, warehouseId: warehouse.id },
    page: !isSalesView ? currentPage : 1,
    pageSize: PAGE_SIZE,
    enabled: !isSalesView && !!product?.id,
  });

  const loading = isSalesView ? salesLoading : purchaseLoading;
  const isError = isSalesView ? salesError : purchaseError;
  const refetch = isSalesView ? refetchSales : refetchPurchase;
  const totalCount = isSalesView
    ? salesResponse?.totalCount || 0
    : purchaseResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const salesOrders = salesResponse?.data || [];
  const purchaseOrders = purchaseResponse?.data || [];

  // Group sales orders by month
  const salesMonthGroups = useMemo(() => {
    const groups: Record<
      string,
      { month: string; monthYear: string; orders: typeof salesOrders }
    > = {};

    salesOrders.forEach((order) => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          orders: [],
        };
      }
      groups[monthKey].orders.push(order);
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.monthYear + "-01").getTime() -
        new Date(a.monthYear + "-01").getTime(),
    );
  }, [salesOrders]);

  // Group purchase orders by month
  const purchaseMonthGroups = useMemo(() => {
    const groups: Record<
      string,
      { month: string; monthYear: string; orders: typeof purchaseOrders }
    > = {};

    purchaseOrders.forEach((order) => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          orders: [],
        };
      }
      groups[monthKey].orders.push(order);
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.monthYear + "-01").getTime() -
        new Date(a.monthYear + "-01").getTime(),
    );
  }, [purchaseOrders]);

  const handleTypeChange = (type: string) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/orders?type=${type}&page=1`,
    );
  };

  const handlePageChange = (page: number) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/orders?type=${orderType}&page=${page}`,
    );
  };

  if (loading) return <LoadingState message="Loading orders..." />;

  if (isError)
    return (
      <ErrorState
        title="Failed to load orders"
        message="Unable to fetch orders for this product"
        onRetry={refetch}
      />
    );

  const monthGroups = isSalesView ? salesMonthGroups : purchaseMonthGroups;
  const isEmpty = monthGroups.length === 0;

  return (
    <div className="flex flex-col flex-1">
      {/* Filter Pills */}
      <div className="flex gap-4 px-4 py-4">
        <TabPills
          options={ORDER_TYPE_OPTIONS}
          value={orderType}
          onValueChange={handleTypeChange}
        />
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <IconBox className="size-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No orders</h3>
          <p className="text-sm text-gray-500 text-center">
            No {isSalesView ? "sales" : "purchase"} orders found for this
            product
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col border-b border-dashed border-gray-300">
            {isSalesView
              ? salesMonthGroups.map((group) => (
                  /*   */ <div key={group.monthYear} className="flex flex-col">
                    {/* Month Header */}
                    <div className="sticky top-11 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100">
                      <p className="text-xs font-semibold text-gray-700">
                        {group.month}
                      </p>
                    </div>

                    {group.orders.map((order) => {
                      const displayStatus = getSalesDisplayStatus(
                        order.status as SalesOrderStatus,
                        order.delivery_due_date,
                      );
                      const completionPct = calcSalesCompletion(
                        order.sales_order_items,
                      );
                      const showProgress =
                        displayStatus.status === "in_progress" ||
                        displayStatus.status === "overdue";
                      const progressColor = getSalesStatusConfig(
                        displayStatus.status,
                      ).color;
                      const customerName = getPartnerName(order.customer);
                      const productSummary = getSalesProductSummary(
                        order.sales_order_items,
                      );

                      return (
                        <button
                          key={order.id}
                          onClick={() =>
                            router.push(
                              `/warehouse/${warehouse_slug}/sales-orders/${order.sequence_number}/details`,
                            )
                          }
                          className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-base font-medium text-gray-700 truncate">
                                {customerName}
                              </p>
                              <SalesStatusBadge
                                status={displayStatus.status}
                                text={displayStatus.text}
                              />
                            </div>
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {productSummary}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-500">
                                SO-{order.sequence_number}
                                {order.delivery_due_date &&
                                  ` • Due on ${formatAbsoluteDate(order.delivery_due_date)}`}
                              </p>
                              {displayStatus.status !== "approval_pending" && (
                                <p className="text-xs text-gray-500">
                                  {completionPct}% completed
                                </p>
                              )}
                            </div>
                          </div>
                          {showProgress && (
                            <Progress
                              color={progressColor}
                              value={completionPct}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              : purchaseMonthGroups.map((group) => (
                  <div key={group.monthYear} className="flex flex-col">
                    {/* Month Header */}
                    <div className="sticky top-11 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100">
                      <p className="text-xs font-semibold text-gray-700">
                        {group.month}
                      </p>
                    </div>

                    {group.orders.map((order) => {
                      const displayStatus = getPurchaseDisplayStatus(
                        order.status as PurchaseOrderStatus,
                        order.delivery_due_date,
                      );
                      const completionPct = calcPurchaseCompletion(
                        order.purchase_order_items,
                      );
                      const showProgress =
                        displayStatus.status === "in_progress" ||
                        displayStatus.status === "overdue";
                      const progressColor = getPurchaseStatusConfig(
                        displayStatus.status,
                      ).color;
                      const supplierName = getPartnerName(order.supplier);
                      const productSummary = getPurchaseProductSummary(
                        order.purchase_order_items,
                      );

                      return (
                        <button
                          key={order.id}
                          onClick={() =>
                            router.push(
                              `/warehouse/${warehouse_slug}/purchase-orders/${order.sequence_number}/details`,
                            )
                          }
                          className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-base font-medium text-gray-700 truncate">
                                {supplierName}
                              </p>
                              <PurchaseStatusBadge
                                status={displayStatus.status}
                                text={displayStatus.text}
                              />
                            </div>
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              {productSummary}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-500">
                                PO-{order.sequence_number}
                                {order.delivery_due_date &&
                                  ` • Due on ${formatAbsoluteDate(order.delivery_due_date)}`}
                              </p>
                              {displayStatus.status !== "approval_pending" && (
                                <p className="text-xs text-gray-500">
                                  {completionPct}% completed
                                </p>
                              )}
                            </div>
                          </div>
                          {showProgress && (
                            <Progress
                              color={progressColor}
                              value={completionPct}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
          </div>

          {totalPages > 1 && (
            <PaginationWrapper
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
