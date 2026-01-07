"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import { getLedgers, type LedgerFilters } from "@/lib/queries/ledgers";

/**
 * Fetch ledgers with optional filters
 * Used for TDS ledger dropdowns
 */
export function useLedgers(filters?: LedgerFilters) {
  return useQuery({
    queryKey: queryKeys.ledgers.all(filters),
    queryFn: () => getLedgers(filters),
    ...getQueryOptions(STALE_TIME.LEDGERS, GC_TIME.MASTER_DATA),
  });
}
