"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getInviteByCode,
  getActiveInvites,
  acceptInvite,
  createInvite,
  deleteInvite,
} from "@/lib/queries/invites";
import type {
  AcceptInviteParams,
  InviteCreateParams,
} from "@/types/invites.types";

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
 * Fetch all active (unused and non-expired) invites
 */
export function useActiveInvites() {
  return useQuery({
    queryKey: queryKeys.invites.active(),
    queryFn: () => getActiveInvites(),
    ...getQueryOptions(STALE_TIME.INVITES, GC_TIME.DEFAULT),
  });
}

/**
 * Invite mutations (create, delete, accept)
 */
export function useInviteMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (params: InviteCreateParams) => createInvite(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.active(),
      });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: (inviteId: string) => deleteInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.active(),
      });
    },
  });

  const accept = useMutation({
    mutationFn: (params: AcceptInviteParams) => acceptInvite(params),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.byCode(variables.inviteToken),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.current(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.invites.active(),
      });
    },
  });

  return {
    create,
    delete: deleteInviteMutation,
    accept,
  };
}
