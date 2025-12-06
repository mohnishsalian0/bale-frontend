"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { Fab } from "@/components/ui/fab";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { Progress } from "@/components/ui/progress";
import { useSalesOrders } from "@/lib/query/hooks/sales-orders";
import { usePartners } from "@/lib/query/hooks/partners";
import { useProducts } from "@/lib/query/hooks/products";
import { getPartnerName } from "@/lib/utils/partner";
import { formatMonthHeader } from "@/lib/utils/date";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  getProductSummary,
} from "@/lib/utils/sales-order";
import type { SalesOrderStatus, MeasuringUnit } from "@/types/database/enums";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  formatMeasuringUnitQuantities,
  getMeasuringUnit,
} from "@/lib/utils/measuring-units";
import { useIsMobile } from "@/hooks/use-mobile";

interface OrderListItem {
  id: string;
  orderNumber: number;
  customerId: string;
  customerName: string;
  products: Array<{ name: string; quantity: number }>;
  dueDate: string | null;
  orderDate: string;
  status:
    | "approval_pending"
    | "in_progress"
    | "overdue"
    | "completed"
    | "cancelled";
  completionPercentage: number;
  totalAmount: number;
}

interface MonthGroup {
  month: string;
  monthYear: string;
  orders: OrderListItem[];
}

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Fetch orders, customers, and products using TanStack Query with pagination
  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    isError: ordersError,
  } = useSalesOrders(warehouse.id, {}, currentPage, PAGE_SIZE);
  const { data: customers = [], isLoading: customersLoading } = usePartners({
    partner_type: "customer",
  });
  const { data: products = [], isLoading: productsLoading } = useProducts({
    is_active: true,
  });

  const loading = ordersLoading || customersLoading || productsLoading;
  const error = ordersError;

  const orders = ordersResponse?.data || [];
  const totalCount = ordersResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/sales-orders?page=1`);
    }
  }, [searchQuery, selectedStatus, selectedProduct, selectedCustomer]);

  // Handle page change
  const handlePageChange = (page: number) => {
    router.push(`/warehouse/${warehouse.slug}/sales-orders?page=${page}`);
  };

  // Transform products and customers for filters
  const availableProducts = useMemo(
    () => products.map((product) => product.name).sort(),
    [products],
  );

  const availableCustomers = useMemo(
    () =>
      customers.map((customer) => ({
        id: customer.id,
        name: getPartnerName(customer),
      })),
    [customers],
  );

  // Process orders data using useMemo
  const { monthGroups, pendingOrdersCount, pendingQuantitiesByUnit } =
    useMemo(() => {
      if (!orders.length) {
        return {
          monthGroups: [],
          pendingOrdersCount: 0,
          pendingQuantitiesByUnit: "0",
        };
      }

      // Transform orders
      const orderItems: OrderListItem[] = orders.map((order) => {
        const customerName = getPartnerName(order.customer);

        // Calculate products with quantities
        const products = (order.sales_order_items || []).map((item) => ({
          name: item.product?.name || "Unknown Product",
          quantity: item.required_quantity,
        }));

        // Calculate completion percentage using utility
        const completionPercentage = calculateCompletionPercentage(
          order.sales_order_items || [],
        );

        // Determine status (including overdue) using utility
        const status = getOrderDisplayStatus(
          order.status as SalesOrderStatus,
          order.expected_delivery_date,
        );

        return {
          id: order.id,
          orderNumber: order.sequence_number,
          customerId: order.customer_id,
          customerName,
          products,
          dueDate: order.expected_delivery_date,
          orderDate: order.order_date,
          status,
          completionPercentage,
          totalAmount: order.total_amount || 0,
        };
      });

      // Group by month (based on order creation date)
      const groups: { [key: string]: MonthGroup } = {};

      orderItems.forEach((order) => {
        const date = new Date(order.orderDate);
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

      const monthGroups = Object.values(groups)
        .map((group) => ({
          ...group,
          orders: group.orders.sort((a, b) => {
            // Sort orders within each month from newest to oldest
            return (
              new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
            );
          }),
        }))
        .sort((a, b) => {
          const [monthA, yearA] = a.monthYear.split(" ");
          const [monthB, yearB] = b.monthYear.split(" ");
          const dateA = new Date(`${monthA} 1, ${yearA}`);
          const dateB = new Date(`${monthB} 1, ${yearB}`);
          return dateB.getTime() - dateA.getTime();
        });

      // Calculate pending orders stats (approval_pending OR in_progress)
      const pendingOrders = orders.filter(
        (order) =>
          order.status === "approval_pending" || order.status === "in_progress",
      );

      const pendingOrdersCount = pendingOrders.length;

      // Aggregate remaining quantities by measuring unit
      const unitMap = new Map<MeasuringUnit, number>();

      pendingOrders.forEach((order) => {
        (order.sales_order_items || []).forEach((item) => {
          const unit = getMeasuringUnit(item.product);
          const remainingQty =
            item.required_quantity - (item.dispatched_quantity || 0);

          unitMap.set(unit, (unitMap.get(unit) || 0) + remainingQty);
        });
      });

      const pendingQuantitiesByUnit = formatMeasuringUnitQuantities(unitMap);

      return {
        monthGroups,
        pendingOrdersCount,
        pendingQuantitiesByUnit,
      };
    }, [orders]);

  // Filter groups using useMemo
  const filteredGroups = useMemo(() => {
    return monthGroups
      .map((group) => ({
        ...group,
        orders: group.orders.filter((order) => {
          const matchesSearch =
            order.orderNumber
              .toString()
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            order.customerName
              .toLowerCase()
              .includes(searchQuery.toLowerCase());

          const matchesStatus =
            selectedStatus === "all" || order.status === selectedStatus;

          const matchesProduct =
            selectedProduct === "all" ||
            order.products.some((p) => p.name === selectedProduct);

          const matchesCustomer =
            selectedCustomer === "all" || order.customerId === selectedCustomer;

          return (
            matchesSearch && matchesStatus && matchesProduct && matchesCustomer
          );
        }),
      }))
      .filter((group) => group.orders.length > 0);
  }, [
    monthGroups,
    searchQuery,
    selectedStatus,
    selectedProduct,
    selectedCustomer,
  ]);

  // Loading state
  if (loading) {
    return <LoadingState message="Loading sales orders..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load sales orders"
        message="Unable to fetch sales orders data"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="relative flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Sales orders</h1>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-teal-700 font-medium">
                {pendingOrdersCount}
              </span>
              <span> active orders</span>
              <span> • </span>
              <span className="text-teal-700 font-medium">
                {pendingQuantitiesByUnit}
              </span>
              <span className="text-gray-500"> pending to fulfill</span>
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by order number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-25 shrink-0">
          <Image
            src="/illustrations/sales-order-cart.png"
            alt="Sales orders"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        {/* Status Filter */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="approval_pending">Approval Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Product Filter */}
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {availableProducts.map((product) => (
              <SelectItem key={product} value={product}>
                {product}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Customer Filter */}
        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All customers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All customers</SelectItem>
            {availableCustomers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sales Orders List */}
      <div className="flex flex-col">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No orders found</p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search or filters"
                : "Start by adding a sales order"}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.monthYear} className="flex flex-col">
              {/* Month Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100">
                <p className="text-xs font-semibold text-gray-700">
                  {group.month}
                </p>
              </div>

              {/* Order Items */}
              {group.orders.map((order) => {
                const showProgressBar =
                  order.status === "in_progress" || order.status === "overdue";
                const progressColor =
                  order.status === "overdue" ? "yellow" : "blue";

                return (
                  <button
                    key={order.id}
                    onClick={() =>
                      router.push(
                        `/warehouse/${warehouse.slug}/sales-orders/${order.orderNumber}`,
                      )
                    }
                    className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    {/* Title and Status Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-medium text-gray-900">
                          {order.customerName}
                        </p>
                        <SalesStatusBadge status={order.status} />
                      </div>

                      {/* Subtexts spanning full width */}
                      <p className="text-xs text-gray-500 text-left mt-1">
                        {getProductSummary(order.products)}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {"SO-"}
                          {order.orderNumber}
                          {order.dueDate &&
                            ` • Due on ${formatAbsoluteDate(order.dueDate)}`}
                        </p>
                        {order.status !== "approval_pending" && (
                          <p className="text-xs text-gray-500">
                            {order.completionPercentage}% completed
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {showProgressBar && (
                      <Progress
                        color={progressColor}
                        value={order.completionPercentage}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <PaginationWrapper
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />

      {/* Floating Action Button */}
      <Fab
        onClick={() =>
          router.push(`/warehouse/${warehouse.slug}/sales-orders/create`)
        }
        className="fixed bottom-20 right-4"
      />
    </div>
  );
}
