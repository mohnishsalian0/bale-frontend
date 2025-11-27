"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getWarehouses,
  getWarehouseBySlug,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "@/lib/queries/warehouses";
import type { TablesInsert, TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch all warehouses for the company
 * Filtered by company via RLS (user in single company)
 */
export function useWarehouses() {
  return useQuery({
    queryKey: queryKeys.warehouses.all(),
    queryFn: getWarehouses,
    ...getQueryOptions(STALE_TIME.WAREHOUSES, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch warehouse by slug
 */
export function useWarehouseBySlug(slug: string | null) {
  return useQuery({
    queryKey: queryKeys.warehouses.bySlug(slug || ""),
    queryFn: () => getWarehouseBySlug(slug!),
    ...getQueryOptions(STALE_TIME.WAREHOUSES, GC_TIME.MASTER_DATA),
    enabled: !!slug,
  });
}

/**
 * Fetch warehouse by ID
 */
export function useWarehouseById(warehouseId: string | null) {
  return useQuery({
    queryKey: queryKeys.warehouses.detail(warehouseId || ""),
    queryFn: () => getWarehouseById(warehouseId!),
    ...getQueryOptions(STALE_TIME.WAREHOUSES, GC_TIME.MASTER_DATA),
    enabled: !!warehouseId,
  });
}

/**
 * Warehouse mutations (create, update, delete)
 */
export function useWarehouseMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: TablesInsert<"warehouses">) => createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all() });
    },
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TablesUpdate<"warehouses"> }) =>
      updateWarehouse(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all() });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.all() });
    },
  });

  return {
    create,
    update,
    remove,
  };
}
