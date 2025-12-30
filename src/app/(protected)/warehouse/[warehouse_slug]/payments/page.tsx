"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch, IconPlus } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { Fab } from "@/components/ui/fab";
import { TabPills } from "@/components/ui/tab-pills";
import { PaymentModeBadge } from "@/components/ui/payment-mode-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { usePayments } from "@/lib/query/hooks/payments";
import { usePartners } from "@/lib/query/hooks/partners";
import { formatAbsoluteDate, formatMonthHeader } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { getPartnerName } from "@/lib/utils/partner";
import { getPaymentAllocationSummary } from "@/lib/utils/payment";
import type { PaymentMode, VoucherType } from "@/types/database/enums";
import type { PaymentAllocationListView } from "@/types/payments.types";
import { useIsMobile } from "@/hooks/use-mobile";
import { PaymentTypeDialog } from "./PaymentTypeDialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

export default function PaymentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedVoucherType, setSelectedVoucherType] = useState<
    "payment" | "receipt"
  >("payment");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState("all");
  const [selectedPartner, setSelectedPartner] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogVoucherType, setDialogVoucherType] =
    useState<VoucherType | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Fetch payments using TanStack Query with pagination
  const {
    data: paymentsResponse,
    isLoading: paymentsLoading,
    isError: paymentsError,
  } = usePayments({
    filters: {
      search: debouncedSearchQuery || undefined,
      voucher_type: selectedVoucherType,
      payment_mode:
        selectedPaymentMode !== "all"
          ? (selectedPaymentMode as PaymentMode)
          : undefined,
      partner_id: selectedPartner !== "all" ? selectedPartner : undefined,
      date_from: dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : undefined,
      date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    },
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const { data: partners = [], isLoading: partnersLoading } = usePartners();

  const isLoading = paymentsLoading || partnersLoading;
  const isError = paymentsError;

  const payments = paymentsResponse?.data || [];
  const totalCount = paymentsResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/payments?page=1`);
    }
  }, [
    debouncedSearchQuery,
    selectedVoucherType,
    selectedPaymentMode,
    selectedPartner,
    dateRange,
  ]);

  const handlePageChange = (page: number) => {
    router.push(`/warehouse/${warehouse.slug}/payments?page=${page}`);
  };

  const handleCreatePayment = (type: VoucherType) => {
    setDialogVoucherType(type);
    setDialogOpen(true);
  };

  // Process payments data with month grouping
  const { monthGroups } = useMemo(() => {
    if (!payments.length) {
      return {
        monthGroups: [],
      };
    }

    // Group by month (based on payment date)
    const groups: {
      [key: string]: {
        month: string;
        monthYear: string;
        payments: typeof payments;
      };
    } = {};

    payments.forEach((payment) => {
      const date = new Date(payment.payment_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          payments: [],
        };
      }

      groups[monthKey].payments.push(payment);
    });

    const monthGroups = Object.values(groups)
      .map((group) => ({
        ...group,
        payments: group.payments.sort((a, b) => {
          // Sort payments within each month from newest to oldest
          return (
            new Date(b.payment_date).getTime() -
            new Date(a.payment_date).getTime()
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

    return {
      monthGroups,
    };
  }, [payments]);

  if (isLoading) {
    return <LoadingState message="Loading payments..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load payments"
        message="An error occurred while fetching payments."
        onRetry={() => router.refresh()}
      />
    );
  }

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            {/* <p className="text-sm text-gray-500 mt-2"> */}
            {/*   <span className="text-teal-700 font-medium">{paymentsCount}</span> */}
            {/*   <span> payments</span> */}
            {/*   <span> • </span> */}
            {/*   <span className="text-teal-700 font-medium">{receiptsCount}</span> */}
            {/*   <span className="text-gray-500"> receipts</span> */}
            {/* </p> */}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by payment number, party..."
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
            src=""
            alt="Payments"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        <TabPills
          options={[
            { value: "payment", label: "Payments" },
            { value: "receipt", label: "Receipts" },
          ]}
          value={selectedVoucherType}
          onValueChange={(value) =>
            setSelectedVoucherType(value as "payment" | "receipt")
          }
        />

        <Select
          value={selectedPaymentMode}
          onValueChange={setSelectedPaymentMode}
        >
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="neft">NEFT</SelectItem>
            <SelectItem value="rtgs">RTGS</SelectItem>
            <SelectItem value="upi">UPI</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPartner} onValueChange={setSelectedPartner}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {getPartnerName(partner)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {/* Payment List */}
      <div className="flex flex-col">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-700 mb-2">No payments found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ||
              selectedPaymentMode !== "all" ||
              selectedPartner !== "all" ||
              dateRange
                ? "Try adjusting your search or filters"
                : "Start by creating a payment"}
            </p>
          </div>
        ) : (
          monthGroups.map((group) => (
            <div key={group.monthYear} className="flex flex-col">
              {/* Month Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100">
                <p className="text-xs font-semibold text-gray-700">
                  {group.month}
                </p>
              </div>

              {/* Payment Items */}
              {group.payments.map((payment) => {
                const isAdvance =
                  payment.payment_allocations.length === 0 ||
                  payment.payment_allocations.every(
                    (alloc: PaymentAllocationListView) =>
                      alloc.allocation_type === "advance",
                  );
                const allocationSummary = getPaymentAllocationSummary(
                  payment.payment_allocations,
                );
                const showAllocationSummary = !isAdvance && allocationSummary;
                const tdsInfo =
                  payment.tds_amount && payment.tds_amount > 0
                    ? `TDS: ${formatCurrency(payment.tds_amount)}`
                    : "";

                return (
                  <button
                    key={payment.id}
                    onClick={() =>
                      router.push(
                        `/warehouse/${warehouse.slug}/payments/${payment.slug}`,
                      )
                    }
                    className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    {/* Title and Payment Mode Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-medium text-gray-700">
                            {payment.party_ledger?.name || "N/A"}
                          </p>
                          <PaymentModeBadge
                            mode={payment.payment_mode as PaymentMode}
                          />
                        </div>

                        {/* Amount */}
                        <p className="text-sm font-semibold text-gray-700">
                          {formatCurrency(payment.total_amount || 0)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        {/* Payment Type and Allocations */}
                        <p className="text-sm text-gray-500 text-left">
                          {isAdvance ? "Advance" : "Against"}
                          {showAllocationSummary && (
                            <span className="ml-1 text-gray-500">
                              {allocationSummary}
                            </span>
                          )}
                        </p>

                        {/* TDS if applicable */}
                        <p className="text-xs text-gray-500">{tdsInfo}</p>
                      </div>

                      {/* Payment Number and Date */}
                      <p className="text-xs text-gray-500 text-left">
                        {payment.payment_number}
                        {` • ${formatAbsoluteDate(payment.payment_date)}`}
                      </p>

                      {/* Reference Number and Date */}
                      {payment.reference_number && (
                        <p className="text-xs text-gray-500 text-left">
                          Ref: {payment.reference_number}
                          {payment.reference_date &&
                            ` • Ref date: ${formatAbsoluteDate(payment.reference_date)}`}
                        </p>
                      )}
                    </div>
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

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Fab icon={IconPlus} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleCreatePayment("payment")}>
              Make Payment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreatePayment("receipt")}>
              Receive Payment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Payment Type Selection Dialog */}
      {dialogVoucherType && (
        <PaymentTypeDialog
          key={dialogVoucherType}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          voucherType={dialogVoucherType}
        />
      )}
    </div>
  );
}
