"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import { getCompany, updateCompanyDetails } from "@/lib/queries/company";
import { CompanyUpdate } from "@/types/companies.types";

/**
 * Fetch company details for the current authenticated user
 */
export function useCompany() {
  return useQuery({
    queryKey: queryKeys.company.detail(),
    queryFn: getCompany,
    ...getQueryOptions(STALE_TIME.COMPANY, GC_TIME.MASTER_DATA),
  });
}

/**
 * Company mutations (update)
 */
export function useCompanyMutations() {
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: ({
      companyId,
      data,
      image,
    }: {
      companyId: string;
      data: CompanyUpdate;
      image?: File | null;
    }) => updateCompanyDetails({ companyId, updates: data, image }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.company.detail(),
      });
    },
  });

  return {
    update,
  };
}
