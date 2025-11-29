"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getInviteByCode,
  acceptInvite,
  type AcceptInviteParams,
} from "@/lib/queries/invites";

/**
 * Fetch invite by code/token
 */
export function useInvite(code: string | null) {
  return useQuery({
    queryKey: queryKeys.invites.byCode(code || ""),
    queryFn: () => getInviteByCode(code!),
    ...getQueryOptions(STALE_TIME.INVITES, GC_TIME.DEFAULT),
    enabled: !!code,
  });
}

/**
 * Invite mutations (accept invite)
 */
export function useInviteMutations() {
  const queryClient = useQueryClient();

  const accept = useMutation({
    mutationFn: (params: AcceptInviteParams) => acceptInvite(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.byCode(variables.inviteToken),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.current(),
      });
    },
  });

  return {
    accept,
  };
}
