"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getAttributes,
  createAttribute,
  createAttributesBatch,
} from "@/lib/queries/attributes";
import type { ProductAttributeGroup } from "@/types/database/enums";
import type { CreateAttributeData } from "@/types/attributes.types";

/**
 * Fetch attributes filtered by single group
 * @param groupName - Optional attribute group to filter by (material, color, product_tag)
 */
export function useAttributes(groupName?: ProductAttributeGroup) {
  return useQuery({
    queryKey: groupName
      ? queryKeys.attributes.byGroup(groupName)
      : queryKeys.attributes.all(),
    queryFn: () => getAttributes(groupName),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Attribute mutations (create single, create batch)
 */
export function useAttributeMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: ({ name, groupName }: CreateAttributeData) =>
      createAttribute(name, groupName),
    onSuccess: (_, variables) => {
      // Invalidate the specific group that was created
      queryClient.invalidateQueries({
        queryKey: queryKeys.attributes.byGroup(variables.groupName),
      });
    },
  });

  const createBatch = useMutation({
    mutationFn: (attributes: CreateAttributeData[]) =>
      createAttributesBatch(attributes),
    onSuccess: (_, variables) => {
      // Invalidate all affected groups
      const uniqueGroups = [...new Set(variables.map((a) => a.groupName))];
      uniqueGroups.forEach((groupName) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.attributes.byGroup(groupName),
        });
      });
    },
  });

  return {
    create,
    createBatch,
  };
}
