"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getUser,
  updateUserWarehouse,
  updateUser,
  getUserPermissions,
} from "@/lib/queries/users";
import type { TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch current user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.users.current(),
    queryFn: () => getUser(),
    ...getQueryOptions(STALE_TIME.USER, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch user role with permissions
 */
export function useUserPermissions(roleName: string | null) {
  return useQuery({
    queryKey: queryKeys.users.permissions(),
    queryFn: () => getUserPermissions(roleName!),
    ...getQueryOptions(STALE_TIME.USER, GC_TIME.MASTER_DATA),
    enabled: !!roleName,
  });
}

/**
 * User mutations (update profile, warehouse)
 */
export function useUserMutations() {
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
        queryKey: queryKeys.users.current(),
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
        queryKey: queryKeys.users.current(),
      });
    },
  });

  return {
    updateWarehouse,
    updateProfile,
  };
}
