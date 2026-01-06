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
import { TabPills } from "@/components/ui/tab-pills";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { Fab } from "@/components/ui/fab";
import { Progress } from "@/components/ui/progress";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { useInvoices } from "@/lib/query/hooks/invoices";
import { usePartners } from "@/lib/query/hooks/partners";
import { useInvoiceAggregates } from "@/lib/query/hooks/aggregates";
import { formatAbsoluteDate, formatMonthHeader } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { getPartnerName, getPartnerTypeLabel } from "@/lib/utils/partner";
import {
  getInvoiceDisplayStatus,
  getInvoiceItemSummary,
} from "@/lib/utils/invoice";
import type { InvoiceStatus, PartnerType } from "@/types/database/enums";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

export default function InvoicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Initialize filters from query params
  const [selectedType, setSelectedType] = useState<"sales" | "purchase">(
    (searchParams.get("invoice_type") as "sales" | "purchase") || "sales",
  );
  const [selectedStatus, setSelectedStatus] = useState(
    searchParams.get("status") || "all",
  );
  const [selectedPartner, setSelectedPartner] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Parse status filter - can be comma-separated like "open,partially_paid"
  const statusFilter =
    selectedStatus !== "all"
      ? selectedStatus.includes(",")
        ? (selectedStatus.split(",") as InvoiceStatus[])
        : (selectedStatus as InvoiceStatus)
      : undefined;

  // Fetch aggregate stats for selected invoice type (unfiltered by status/partner/date)
  const { data: invoiceStats } = useInvoiceAggregates({
    filters: {
      warehouse_id: warehouse.id,
      invoice_type: selectedType,
    },
  });

  // Fetch invoices using TanStack Query with pagination
  const {
    data: invoicesResponse,
    isLoading: invoicesLoading,
    isError: invoicesError,
  } = useInvoices({
    filters: {
      search: debouncedSearchQuery || undefined,
      invoice_type: selectedType,
      status: statusFilter,
      party_ledger_id: selectedPartner !== "all" ? selectedPartner : undefined,
      date_from: dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : undefined,
      date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    },
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const { data: partners = [], isLoading: partnersLoading } = usePartners();

  const isLoading = invoicesLoading || partnersLoading;
  const isError = invoicesError;

  const invoices = invoicesResponse?.data || [];
  const totalCount = invoicesResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/invoices?page=1`);
    }
  }, [
    debouncedSearchQuery,
    selectedType,
    selectedStatus,
    selectedPartner,
    dateRange,
  ]);

  const handlePageChange = (page: number) => {
    router.push(`/warehouse/${warehouse.slug}/invoices?page=${page}`);
  };

  const handleCreateInvoice = (type: "sales" | "purchase") => {
    router.push(`/warehouse/${warehouse.slug}/invoices/create/${type}`);
  };

  // Process invoices data with month grouping
  const monthGroups = useMemo(() => {
    if (!invoices.length) {
      return [];
    }

    // Group by month (based on invoice date)
    const groups: {
      [key: string]: {
        month: string;
        monthYear: string;
        invoices: typeof invoices;
      };
    } = {};

    invoices.forEach((invoice) => {
      const date = new Date(invoice.invoice_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          invoices: [],
        };
      }

      groups[monthKey].invoices.push(invoice);
    });

    return Object.values(groups)
      .map((group) => ({
        ...group,
        invoices: group.invoices.sort((a, b) => {
          // Sort invoices within each month from newest to oldest
          return (
            new Date(b.invoice_date).getTime() -
            new Date(a.invoice_date).getTime()
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
  }, [invoices]);

  // Get aggregate stats from hook (for selected invoice type only)
  const openInvoicesCount = invoiceStats?.count || 0;
  const totalOutstanding = invoiceStats?.total_outstanding || 0;

  if (isLoading) {
    return <LoadingState message="Loading invoices..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load invoices"
        message="An error occurred while fetching invoices."
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
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-teal-700 font-medium">
                {openInvoicesCount}
              </span>
              <span> open invoices</span>
              <span> • </span>
              <span className="text-teal-700 font-medium">
                {formatCurrency(totalOutstanding)}
              </span>
              <span className="text-gray-500"> outstanding</span>
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by invoice number, party..."
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
            alt="Invoices"
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
            { value: "sales", label: "Sales" },
            { value: "purchase", label: "Purchase" },
          ]}
          value={selectedType}
          onValueChange={(value) =>
            setSelectedType(value as "sales" | "purchase")
          }
        />

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="partially_paid">Partially Paid</SelectItem>
            <SelectItem value="settled">Settled</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPartner} onValueChange={setSelectedPartner}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.ledger.id}>
                <p>{getPartnerName(partner)}</p>
                <p className="text-xs text-gray-500">
                  {getPartnerTypeLabel(partner.partner_type as PartnerType)}
                </p>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {/* Invoice List */}
      <div className="flex flex-col">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-700 mb-2">No invoices found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ||
              selectedStatus !== "all" ||
              selectedPartner !== "all" ||
              dateRange
                ? "Try adjusting your search or filters"
                : "Start by creating an invoice"}
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

              {/* Invoice Items */}
              {group.invoices.map((invoice) => {
                const invoiceStatusData = getInvoiceDisplayStatus(invoice);
                const outstandingInfo =
                  invoice.outstanding_amount && invoice.outstanding_amount > 0
                    ? `${formatCurrency(invoice.outstanding_amount)} due`
                    : "";
                const showProgressBar =
                  invoiceStatusData.status === "partially_paid" ||
                  invoiceStatusData.status === "overdue";
                const progressBarColor =
                  invoiceStatusData.status === "overdue" ? "yellow" : "blue"; // Default to blue for other statuses

                const progressValue =
                  (((invoice.total_amount || 0) -
                    (invoice.outstanding_amount || 0)) /
                    (invoice.total_amount || 1)) *
                  100;

                return (
                  <button
                    key={invoice.id}
                    onClick={() =>
                      router.push(
                        `/warehouse/${warehouse.slug}/invoices/${invoice.slug}`,
                      )
                    }
                    className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    {/* Title and Status Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-medium text-gray-700">
                            {invoice.party_name || invoice.party_display_name}
                          </p>
                          <InvoiceStatusBadge
                            status={invoiceStatusData.status}
                            text={invoiceStatusData.text}
                          />
                        </div>

                        {/* Amount */}
                        <p className="text-sm font-semibold text-gray-700">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                      </div>

                      {/* Subtexts spanning full width */}
                      <p className="text-sm text-gray-500 text-left mt-1">
                        {getInvoiceItemSummary(invoice.invoice_items)}
                      </p>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {invoice.invoice_number}
                          {invoice.due_date &&
                            ` • Due on ${formatAbsoluteDate(invoice.due_date)}`}
                        </p>
                        {showProgressBar && (
                          <p className="text-xs text-gray-500">
                            {outstandingInfo}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {showProgressBar && (
                      <Progress
                        color={progressBarColor}
                        value={progressValue}
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

      {/* FAB */}
      <div className="fixed bottom-20 right-4 z-40">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div>
              <Fab icon={IconPlus} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleCreateInvoice("sales")}>
              Sales Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreateInvoice("purchase")}>
              Purchase Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
