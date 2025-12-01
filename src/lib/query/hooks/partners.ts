"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getPartners,
  getPartnerById,
  getPartnerWithOrderStatsById,
  createPartner,
  updatePartner,
  deletePartner,
} from "@/lib/queries/partners";
import type { PartnerFilters } from "@/types/partners.types";

/**
 * Fetch partners with optional filters
 *
 * Examples:
 * - All partners: usePartners()
 * - Customers: usePartners({ partner_type: 'customer' })
 * - Suppliers: usePartners({ partner_type: 'supplier' })
 * - Agents: usePartners({ partner_type: 'agent' })
 */
export function usePartners(filters?: PartnerFilters) {
  return useQuery({
    queryKey: queryKeys.partners.all(filters),
    queryFn: () => getPartners(filters),
    ...getQueryOptions(STALE_TIME.PARTNERS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch single partner by ID (without order aggregates)
 * Used for: partner form, basic partner details
 */
export function usePartner(partnerId: string | null) {
  return useQuery({
    queryKey: queryKeys.partners.detail(partnerId || ""),
    queryFn: () => getPartnerById(partnerId!),
    ...getQueryOptions(STALE_TIME.PARTNERS, GC_TIME.MASTER_DATA),
    enabled: !!partnerId,
  });
}

/**
 * Fetch single partner by ID with order statistics
 * Used for: partner detail page
 */
export function usePartnerWithOrderStats(partnerId: string | null) {
  return useQuery({
    queryKey: queryKeys.partners.detail(partnerId || ""),
    queryFn: () => getPartnerWithOrderStatsById(partnerId!),
    ...getQueryOptions(STALE_TIME.PARTNERS, GC_TIME.MASTER_DATA),
    enabled: !!partnerId,
  });
}

/**
 * Partner mutations (create, update, delete)
 */
export function usePartnerMutations() {
  const queryClient = useQueryClient();

  const createPartnerMutation = useMutation({
    mutationFn: createPartner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all() });
    },
  });

  const updatePartnerMutation = useMutation({
    mutationFn: updatePartner,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.partners.detail(data.id),
      });
    },
  });

  const deletePartnerMutation = useMutation({
    mutationFn: deletePartner,
    onSuccess: (_, partnerId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all() });
      queryClient.removeQueries({
        queryKey: queryKeys.partners.detail(partnerId),
      });
    },
  });

  return {
    createPartner: createPartnerMutation,
    updatePartner: updatePartnerMutation,
    deletePartner: deletePartnerMutation,
  };
}
