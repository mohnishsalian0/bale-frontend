"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getProductAttributeLists,
  getProductById,
  getProductBySequenceNumber,
  getProductColors,
  getProductMaterials,
  getProducts,
  getProductsWithInventory,
  getProductTags,
  createProductMaterial,
  createProductColor,
  createProductTag,
  createProduct,
  updateProduct,
  uploadProductImages,
  deleteProductImages,
  updateProductImagesField,
} from "@/lib/queries/products";
import { ProductUpsertData } from "@/types/products.types";

/**
 * Fetch all products with attributes
 */
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all(),
    queryFn: getProducts,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch single product by ID with attributes
 */
export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.products.detail(productId || ""),
    queryFn: () => getProductById(productId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!productId,
  });
}

/**
 * Fetch single product by sequence number with attributes
 */
export function useProductBySequence(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.products.bySequence(sequenceNumber || ""),
    queryFn: () => getProductBySequenceNumber(Number(sequenceNumber)),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch products with inventory for a warehouse
 */
export function useProductsWithInventory(warehouseId: string | null) {
  return useQuery({
    queryKey: queryKeys.products.withInventory(warehouseId || ""),
    queryFn: () => getProductsWithInventory(warehouseId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!warehouseId,
  });
}

/**
 * Fetch product materials
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
 */
export function useProductAttributes() {
  return useQuery({
    queryKey: queryKeys.products.attributes(),
    queryFn: getProductAttributeLists,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Attribute mutation hooks
 */
export function useCreateProductMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createProductMaterial(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.materials() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.attributes() });
    },
  });
}

export function useCreateProductColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createProductColor(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.colors() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.attributes() });
    },
  });
}

export function useCreateProductTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createProductTag(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.tags() });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.attributes() });
    },
  });
}

/**
 * Product mutations (create, update)
 */
export function useProductMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: ({
      productData,
      attributeIds,
    }: {
      productData: ProductUpsertData;
      attributeIds: {
        materialIds: string[];
        colorIds: string[];
        tagIds: string[];
      };
    }) => createProduct(productData, attributeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
  });

  const update = useMutation({
    mutationFn: ({
      productId,
      productData,
      attributeIds,
    }: {
      productId: string;
      productData: ProductUpsertData;
      attributeIds: {
        materialIds: string[];
        colorIds: string[];
        tagIds: string[];
      };
    }) => updateProduct(productId, productData, attributeIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.detail(variables.productId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() });
    },
  });

  return {
    create,
    update,
  };
}

/**
 * Product image mutations
 */
export function useProductImageMutations() {
  const upload = useMutation({
    mutationFn: ({
      companyId,
      productId,
      images,
      offset,
    }: {
      companyId: string;
      productId: string;
      images: File[];
      offset?: number;
    }) => uploadProductImages(companyId, productId, images, offset),
  });

  const deleteImages = useMutation({
    mutationFn: (urls: string[]) => deleteProductImages(urls),
  });

  const updateField = useMutation({
    mutationFn: ({
      productId,
      imageUrls,
    }: {
      productId: string;
      imageUrls: string[];
    }) => updateProductImagesField(productId, imageUrls),
  });

  return {
    upload,
    deleteImages,
    updateField,
  };
}
