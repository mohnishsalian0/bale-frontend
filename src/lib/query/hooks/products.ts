"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getProductsWithAttributes,
  getProductByIdWithAttributes,
  getProductBySequenceNumberWithAttributes,
  getProductsWithInventory,
  getProductMaterials,
  getProductColors,
  getProductTags,
  getProductAttributeLists,
} from "@/lib/queries/products";

/**
 * Fetch all products with attributes
 * Filtered by company via RLS (user in single company)
 */
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all(),
    queryFn: getProductsWithAttributes,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch single product by ID with attributes
 */
export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId || ""),
    queryFn: () => getProductByIdWithAttributes(productId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!productId,
  });
}

/**
 * Fetch single product by sequence number with attributes
 * Filtered by company via RLS (user in single company)
 */
export function useProductBySequence(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.products.bySequence(sequenceNumber || ""),
    queryFn: () =>
      getProductBySequenceNumberWithAttributes(Number(sequenceNumber)),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch products with inventory for a warehouse
 */
export function useProductsWithInventory(warehouseId: string) {
  return useQuery({
    queryKey: queryKeys.products.withInventory(warehouseId),
    queryFn: () => getProductsWithInventory(warehouseId),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch product materials
 * Filtered by company via RLS (user in single company)
 */
export function useProductMaterials() {
  return useQuery({
    queryKey: queryKeys.products.materials(),
    queryFn: getProductMaterials,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch product colors
 * Filtered by company via RLS (user in single company)
 */
export function useProductColors() {
  return useQuery({
    queryKey: queryKeys.products.colors(),
    queryFn: getProductColors,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch product tags
 * Filtered by company via RLS (user in single company)
 */
export function useProductTags() {
  return useQuery({
    queryKey: queryKeys.products.tags(),
    queryFn: getProductTags,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch all product attributes (materials, colors, tags)
 * Filtered by company via RLS (user in single company)
 */
export function useProductAttributes() {
  return useQuery({
    queryKey: queryKeys.products.attributes(),
    queryFn: getProductAttributeLists,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Product mutations (create, update, delete)
 * Note: Actual mutation functions need to be implemented in queries/products.ts
 */
export function useProductMutations() {
  const queryClient = useQueryClient();

  // These would need corresponding functions in queries/products.ts
  // For now, returning placeholder structure
  return {
    // createProduct: useMutation({
    //   mutationFn: (data) => createProduct(data),
    //   onSuccess: () => {
    //     queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    //   },
    // }),
    // updateProduct: useMutation({
    //   mutationFn: ({ id, data }) => updateProduct(id, data),
    //   onSuccess: (_, variables) => {
    //     queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) });
    //     queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    //   },
    // }),
  };
}
