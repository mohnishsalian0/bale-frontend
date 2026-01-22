"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getLedgers,
  getLedgerById,
  getParentGroups,
  createLedger,
  updateLedger,
  deleteLedger,
  type LedgerFilters,
} from "@/lib/queries/ledgers";
import type { LedgerInsert, LedgerUpdate } from "@/types/ledgers.types";
import { toast } from "sonner";

/**
 * Fetch ledgers with optional filters
 * Used for ledgers list page and dropdowns
 */
export function useLedgers(filters?: LedgerFilters) {
  return useQuery({
    queryKey: queryKeys.ledgers.all(filters),
    queryFn: () => getLedgers(filters),
    ...getQueryOptions(STALE_TIME.LEDGERS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch single ledger by ID
 * Used for ledger detail/edit views
 */
export function useLedgerById(id: string | null) {
  return useQuery({
    queryKey: queryKeys.ledgers.byId(id!),
    queryFn: () => getLedgerById(id!),
    enabled: !!id,
    ...getQueryOptions(STALE_TIME.LEDGERS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch all parent groups
 * Used for parent group dropdown in ledger form
 */
export function useParentGroups() {
  return useQuery({
    queryKey: queryKeys.parentGroups.all(),
    queryFn: getParentGroups,
    ...getQueryOptions(STALE_TIME.PARENT_GROUPS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Ledger mutations (create, update, delete)
 * Automatically invalidates ledgers cache on success
 */
export function useLedgerMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (ledger: LedgerInsert) => createLedger(ledger),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ledgers.all() });
      toast.success("Ledger created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create ledger");
    },
  });

  const update = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: LedgerUpdate }) =>
      updateLedger(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ledgers.all() });
      toast.success("Ledger updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update ledger");
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteLedger(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ledgers.all() });
      toast.success("Ledger deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete ledger");
    },
  });

  return { create, update, remove };
}
