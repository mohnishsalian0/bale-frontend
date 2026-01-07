import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getStockUnitAdjustments,
  getStockUnitAdjustment,
  createStockUnitAdjustment,
  deleteStockUnitAdjustment,
} from "@/lib/queries/stock-unit-adjustments";
import { stockUnitAdjustmentKeys } from "@/lib/query/keys";

/**
 * Hook to fetch stock unit adjustments by stock unit ID
 */
export function useStockUnitAdjustments(stockUnitId: string) {
  return useQuery({
    queryKey: stockUnitAdjustmentKeys.byStockUnit(stockUnitId),
    queryFn: () => getStockUnitAdjustments(stockUnitId),
    enabled: !!stockUnitId,
  });
}

/**
 * Hook to fetch a single stock unit adjustment by ID
 */
export function useStockUnitAdjustment(id: string) {
  return useQuery({
    queryKey: stockUnitAdjustmentKeys.byId(id),
    queryFn: () => getStockUnitAdjustment(id),
    enabled: !!id,
  });
}

/**
 * Hook for stock unit adjustment mutations (create, delete)
 */
export function useStockUnitAdjustmentMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: createStockUnitAdjustment,
    onSuccess: (_, variables) => {
      // Invalidate adjustments list for this stock unit
      queryClient.invalidateQueries({
        queryKey: stockUnitAdjustmentKeys.byStockUnit(variables.stock_unit_id),
      });
      // Invalidate all stock unit queries (remaining_quantity changed)
      queryClient.invalidateQueries({ queryKey: ["stock-units"] });
      // Invalidate product inventory (aggregate may have changed)
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteStockUnitAdjustment,
    onSuccess: () => {
      // Invalidate all adjustment queries
      queryClient.invalidateQueries({
        queryKey: stockUnitAdjustmentKeys.all,
      });
      // Invalidate all stock unit queries (remaining_quantity changed)
      queryClient.invalidateQueries({ queryKey: ["stock-units"] });
      // Invalidate product inventory
      queryClient.invalidateQueries({ queryKey: ["products"] });
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return {
    create,
    delete: deleteMutation,
  };
}
