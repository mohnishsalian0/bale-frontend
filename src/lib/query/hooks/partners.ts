"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getPartners,
  getCustomers,
  getSuppliers,
  getAgents,
  getPartnerById,
} from "@/lib/queries/partners";

/**
 * Fetch all partners with optional filters
 * Filtered by company via RLS (user in single company)
 * @param filters - Currently unused, reserved for future client-side filtering
 */
export function usePartners(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.partners.all(filters),
    queryFn: getPartners,
    ...getQueryOptions(STALE_TIME.PARTNERS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch single partner by ID
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
 * Fetch only customer partners
 * Filtered by company via RLS (user in single company)
 */
export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.partners.customers(),
    queryFn: getCustomers,
    ...getQueryOptions(STALE_TIME.PARTNERS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch only supplier/vendor partners
 * Filtered by company via RLS (user in single company)
 */
export function useSuppliers() {
  return useQuery({
    queryKey: queryKeys.partners.suppliers(),
    queryFn: getSuppliers,
    ...getQueryOptions(STALE_TIME.PARTNERS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch only agent partners
 * Filtered by company via RLS (user in single company)
 */
export function useAgents() {
  return useQuery({
    queryKey: queryKeys.partners.agents(),
    queryFn: getAgents,
    ...getQueryOptions(STALE_TIME.PARTNERS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Partner mutations (create, update, delete)
 */
export function usePartnerMutations() {
  const queryClient = useQueryClient();

  // Placeholder for mutations - would need corresponding functions in queries/partners.ts
  return {
    // createPartner: useMutation({
    //   mutationFn: (data) => createPartner(data),
    //   onSuccess: () => {
    //     queryClient.invalidateQueries({ queryKey: ['partners'] });
    //   },
    // }),
  };
}
