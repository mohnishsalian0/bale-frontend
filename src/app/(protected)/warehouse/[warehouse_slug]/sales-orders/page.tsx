"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  getProductSummary,
} from "@/lib/utils/sales-order";
import type { SalesOrderStatus } from "@/types/database/enums";
import { formatAbsoluteDate } from "@/lib/utils/date";

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
  const { warehouse } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");

  // Fetch orders, customers, and products using TanStack Query
  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
  } = useSalesOrders(warehouse.id);
  const { data: customers = [], isLoading: customersLoading } = usePartners({
    partner_type: "customer",
  });
  const { data: products = [], isLoading: productsLoading } = useProducts({
    is_active: true,
  });

  const loading = ordersLoading || customersLoading || productsLoading;
  const error = ordersError;

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
  const { monthGroups, totalOrdered, totalSales } = useMemo(() => {
    if (!orders.length) {
      return {
        monthGroups: [],
        totalOrdered: 0,
        totalSales: 0,
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
      const monthName = date.toLocaleString("en-US", { month: "long" });
      const year = date.getFullYear();

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthName,
          monthYear: `${monthName} ${year}`,
          orders: [],
        };
      }

      groups[monthKey].orders.push(order);
    });

    const monthGroups = Object.values(groups).sort((a, b) => {
      const [monthA, yearA] = a.monthYear.split(" ");
      const [monthB, yearB] = b.monthYear.split(" ");
      const dateA = new Date(`${monthA} 1, ${yearA}`);
      const dateB = new Date(`${monthB} 1, ${yearB}`);
      return dateB.getTime() - dateA.getTime();
    });

    // Calculate totals for past month (based on order date)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentOrders = orderItems.filter(
      (order) => new Date(order.orderDate) >= oneMonthAgo,
    );
    const totalOrdered = recentOrders.reduce((sum, order) => {
      return sum + order.products.reduce((pSum, p) => pSum + p.quantity, 0);
    }, 0);
    const totalSales = Math.round(
      recentOrders.reduce((sum, order) => sum + order.totalAmount, 0),
    );

    return {
      monthGroups,
      totalOrdered,
      totalSales,
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
      <div className="flex items-end justify-between gap-4 p-4 pb-0">
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-gray-900">Sales orders</h1>
            <p className="text-sm text-gray-500">
              <span className="text-teal-700 font-medium">
                {totalOrdered} mtr ordered
              </span>
              <span> & </span>
              <span className="text-teal-700 font-medium">
                ₹{totalSales.toLocaleString()} in sales
              </span>
              <span> in past month</span>
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
      <div className="flex gap-3 p-4 overflow-x-auto shrink-0">
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
