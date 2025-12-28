"use client";

import { use, useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { IconPlus, IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useAdjustmentNotes } from "@/lib/query/hooks/adjustment-notes";
import { usePartners } from "@/lib/query/hooks/partners";
import { getPartnerName } from "@/lib/utils/partner";
import { getAdjustmentItemSummary } from "@/lib/utils/adjustment-notes";
import { formatAbsoluteDate, formatMonthHeader } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Fab } from "@/components/ui/fab";
import { TabPills } from "@/components/ui/tab-pills";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
  }>;
}

export default function AdjustmentNotesListPage({ params }: PageParams) {
  const { warehouse_slug } = use(params);
  const router = useRouter();
  const isMobile = useIsMobile();

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedType, setSelectedType] = useState<"credit" | "debit">(
    "credit",
  );
  const [selectedPartner, setSelectedPartner] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const PAGE_SIZE = 25;

  const {
    data: result,
    isLoading: adjustmentNotesLoading,
    isError: adjustmentNotesError,
  } = useAdjustmentNotes({
    filters: {
      search_term: debouncedSearchQuery || undefined,
      adjustment_type: selectedType,
      partner_id: selectedPartner !== "all" ? selectedPartner : undefined,
      date_from: dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : undefined,
      date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    },
    page,
    pageSize: PAGE_SIZE,
  });

  const { data: partners = [], isLoading: partnersLoading } = usePartners();

  const isLoading = adjustmentNotesLoading || partnersLoading;
  const isError = adjustmentNotesError;

  const adjustmentNotes = result?.data || [];
  const totalCount = result?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when search or type changes
  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [debouncedSearchQuery, selectedType, selectedPartner, dateRange]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleCreateAdjustmentNote = (type: "credit" | "debit") => {
    router.push(`/warehouse/${warehouse_slug}/adjustment-notes/create/${type}`);
  };

  // Process adjustment notes data with month grouping
  const { monthGroups } = useMemo(() => {
    if (!adjustmentNotes.length) {
      return {
        monthGroups: [],
      };
    }

    // Group by month (based on adjustment date)
    const groups: {
      [key: string]: {
        month: string;
        monthYear: string;
        notes: typeof adjustmentNotes;
      };
    } = {};

    adjustmentNotes.forEach((note) => {
      const date = new Date(note.adjustment_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          notes: [],
        };
      }

      groups[monthKey].notes.push(note);
    });

    const monthGroups = Object.values(groups)
      .map((group) => ({
        ...group,
        notes: group.notes.sort((a, b) => {
          // Sort notes within each month from newest to oldest
          return (
            new Date(b.adjustment_date).getTime() -
            new Date(a.adjustment_date).getTime()
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
  }, [adjustmentNotes]);

  if (isLoading) {
    return <LoadingState message="Loading adjustment notes..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load adjustment notes"
        message="Could not load the adjustment notes list"
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
            <h1 className="text-3xl font-bold text-gray-900">
              Adjustment Notes
            </h1>
            {/* <p className="text-sm text-gray-500 mt-2"> */}
            {/*   <span className="text-teal-700 font-medium"> */}
            {/*     {creditNotesCount} */}
            {/*   </span> */}
            {/*   <span> credit notes</span> */}
            {/*   <span> • </span> */}
            {/*   <span className="text-teal-700 font-medium"> */}
            {/*     {debitNotesCount} */}
            {/*   </span> */}
            {/*   <span className="text-gray-500"> debit notes</span> */}
            {/* </p> */}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by number, party, invoice..."
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
            alt="Adjustment Notes"
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
            { value: "credit", label: "Credit" },
            { value: "debit", label: "Debit" },
          ]}
          value={selectedType}
          onValueChange={(value) =>
            setSelectedType(value as "credit" | "debit")
          }
        />

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

      {/* List */}
      <div className="flex flex-col">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-700 mb-2">No adjustment notes found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ||
              selectedPartner !== "all" ||
              selectedType !== "credit" ||
              dateRange
                ? "Try adjusting your search or filters"
                : "Start by creating a credit or debit note"}
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

              {/* Adjustment Note Items */}
              {group.notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() =>
                    router.push(
                      `/warehouse/${warehouse_slug}/adjustment-notes/${note.slug}/details`,
                    )
                  }
                  className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    {/* Invoice Number */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-medium text-gray-700">
                        Against {note.invoice?.invoice_number || "N/A"}
                      </p>

                      {/* Amount */}
                      <p className="text-sm font-semibold text-gray-700">
                        {formatCurrency(note.total_amount)}
                      </p>
                    </div>

                    {/* Item Summary */}
                    <p className="text-sm text-gray-500 text-left">
                      {getAdjustmentItemSummary(note.adjustment_note_items)}
                    </p>

                    {/* Adjustment Number and Date */}
                    <p className="text-xs text-gray-500 text-left">
                      {note.adjustment_number}
                      {` • ${formatAbsoluteDate(note.adjustment_date)}`}
                    </p>

                    {/* Reason */}
                    <p
                      className="text-xs text-gray-500 truncate text-left"
                      title={note.reason}
                    >
                      {note.reason}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <PaginationWrapper
        currentPage={page}
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
            <DropdownMenuItem
              onClick={() => handleCreateAdjustmentNote("credit")}
            >
              Credit Note
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleCreateAdjustmentNote("debit")}
            >
              Debit Note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
