"use client";

import { useState } from "react";
import Image from "next/image";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Fab } from "@/components/ui/fab";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { LedgerFormSheet } from "../LedgerFormSheet";
import { useLedgers, useParentGroups } from "@/lib/query/hooks/ledgers";
import { useDebounce } from "@/hooks/use-debounce";
import { getLedgerIcon } from "@/lib/utils/ledger";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Database } from "@/types/database/supabase";

type LedgerType = Database["public"]["Enums"]["ledger_type_enum"];

export default function LedgersPage() {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<string>("all");
  const [parentGroupFilter, setParentGroupFilter] = useState<string>("all");
  const [showCreateLedger, setShowCreateLedger] = useState(false);
  const [editingLedgerId, setEditingLedgerId] = useState<string | null>(null);

  // Build filters
  const filters = {
    search_term: debouncedSearch || undefined,
    ledger_type:
      ledgerTypeFilter !== "all"
        ? (ledgerTypeFilter as LedgerType)
        : undefined,
    parent_group_id: parentGroupFilter !== "all" ? parentGroupFilter : undefined,
  };

  const { data: ledgers, isLoading, isError, refetch } = useLedgers(filters);
  const { data: parentGroups } = useParentGroups();

  if (isLoading) return <LoadingState message="Loading ledgers..." />;
  if (isError)
    return <ErrorState title="Failed to load ledgers" onRetry={refetch} />;

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Chart of Accounts
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {ledgers?.length || 0} ledgers
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by ledger name..."
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
            src="/mascot/accounting-ledger.png"
            alt="Chart of Accounts"
            fill
            sizes="100px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        <Select value={ledgerTypeFilter} onValueChange={setLedgerTypeFilter}>
          <SelectTrigger className="max-w-40 h-10 shrink-0">
            <SelectValue placeholder="Ledger Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="party">Party</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="tax">Tax</SelectItem>
            <SelectItem value="bank">Bank</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="liability">Liability</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={parentGroupFilter}
          onValueChange={setParentGroupFilter}
        >
          <SelectTrigger className="max-w-48 h-10 shrink-0">
            <SelectValue placeholder="Parent Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {parentGroups?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ledger List */}
      <div className="flex-1 overflow-y-auto">
        {ledgers?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No ledgers found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ? "Try adjusting your search" : "Add your first ledger"}
            </p>
          </div>
        ) : (
          <div className="flex flex-col border-b border-border">
            {ledgers?.map((ledger) => {
              const Icon = getLedgerIcon(ledger.ledger_type);
              const partnerName = ledger.partner
                ? ledger.partner.company_name ||
                  `${ledger.partner.first_name} ${ledger.partner.last_name}`
                : null;

              return (
                <button
                  key={ledger.id}
                  onClick={() => setEditingLedgerId(ledger.id)}
                  className="flex items-center gap-4 p-4 border-t border-border text-left hover:bg-gray-100 transition-colors"
                >
                  {/* Icon */}
                  <div className="size-12 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="size-6 text-gray-700" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-base font-medium text-gray-700 truncate"
                      title={ledger.name}
                    >
                      {ledger.name}
                    </p>
                    <p
                      className="text-sm text-gray-500 truncate"
                      title={`${ledger.parent_group?.name}${partnerName ? ` • Linked to ${partnerName}` : ""}`}
                    >
                      {ledger.parent_group?.name}
                      {partnerName && ` • Linked to ${partnerName}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <Fab
        onClick={() => setShowCreateLedger(true)}
        className="fixed bottom-20 right-4"
      />

      {/* Form Sheet */}
      {(showCreateLedger || editingLedgerId) && (
        <LedgerFormSheet
          ledgerId={editingLedgerId}
          open={showCreateLedger || !!editingLedgerId}
          onOpenChange={(open: boolean) => {
            if (!open) {
              setShowCreateLedger(false);
              setEditingLedgerId(null);
            }
          }}
        />
      )}
    </div>
  );
}
