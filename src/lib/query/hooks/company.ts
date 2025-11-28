"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getCompanyByAuthId,
  updateCompanyDetails,
} from "@/lib/queries/company";
import type { TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch company details for the current authenticated user
 */
export function useCompany(authUserId: string | null) {
  return useQuery({
    queryKey: queryKeys.company.detail(authUserId || ""),
    queryFn: getCompanyByAuthId,
    ...getQueryOptions(STALE_TIME.COMPANY, GC_TIME.MASTER_DATA),
    enabled: !!authUserId,
  });
}

/**
 * Company mutations (update)
 */
export function useCompanyMutations(authUserId: string) {
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: ({
      companyId,
      data,
    }: {
      companyId: string;
      data: TablesUpdate<"companies">;
    }) => updateCompanyDetails(companyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.company.detail(authUserId),
      });
    },
  });

  return {
    update,
  };
}
