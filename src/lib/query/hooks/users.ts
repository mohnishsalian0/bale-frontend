"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getUserByAuthId,
  updateUserWarehouse,
  getUserRole,
  updateUser,
} from "@/lib/queries/users";
import type { TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch current user by auth ID
 */
export function useCurrentUser(authUserId: string | null) {
  return useQuery({
    queryKey: queryKeys.users.current(authUserId || ""),
    queryFn: () => getUserByAuthId(authUserId!),
    ...getQueryOptions(STALE_TIME.USER, GC_TIME.MASTER_DATA),
    enabled: !!authUserId,
  });
}

/**
 * Fetch user role with permissions
 */
export function useUserRole(userId: string | null, roleName: string) {
  return useQuery({
    queryKey: queryKeys.users.role(userId || ""),
    queryFn: () => getUserRole(userId!, roleName),
    ...getQueryOptions(STALE_TIME.USER, GC_TIME.MASTER_DATA),
    enabled: !!userId,
  });
}

/**
 * User mutations (update profile, warehouse)
 */
export function useUserMutations(authUserId: string) {
  const queryClient = useQueryClient();

  const updateWarehouse = useMutation({
    mutationFn: ({
      userId,
      warehouseId,
    }: {
      userId: string;
      warehouseId: string;
    }) => updateUserWarehouse(userId, warehouseId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.current(authUserId),
      });
    },
  });

  const updateProfile = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: TablesUpdate<"users">;
    }) => updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.current(authUserId),
      });
    },
  });

  return {
    updateWarehouse,
    updateProfile,
  };
}
