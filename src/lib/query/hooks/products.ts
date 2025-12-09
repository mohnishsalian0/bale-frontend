"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getProductAttributeLists,
  getProductById,
  getProductByNumber,
  getProducts,
  getProductsWithInventory,
  getProductWithInventoryById,
  getProductWithInventoryByNumber,
  getLowStockProducts,
  createProductAttribute,
  createProduct,
  updateProduct,
  uploadProductImages,
  deleteProductImages,
  updateProductImagesField,
  deleteProduct,
  updateProductActiveStatus,
  updateProductCatalogVisibility,
} from "@/lib/queries/products";
import { ProductFilters, ProductUpsertData } from "@/types/products.types";
import type { AttributeGroup } from "@/types/database/enums";

/**
 * Fetch all products with attributes
 */
export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.all(filters),
    queryFn: () => getProducts(filters),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch products with infinite scroll (for product selection in forms)
 */
export function useInfiniteProducts(
  filters?: ProductFilters,
  pageSize: number = 30,
) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.products.all(filters), "infinite"],
    queryFn: ({ pageParam = 1 }) => getProducts(filters, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = Math.ceil(lastPage.totalCount / pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch products with inventory and infinite scroll (for sales orders)
 */
export function useInfiniteProductsWithInventory(
  warehouseId: string | null,
  filters?: ProductFilters,
  pageSize: number = 30,
) {
  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.products.withInventory(warehouseId || "", filters),
      "infinite",
    ],
    queryFn: ({ pageParam = 1 }) =>
      getProductsWithInventory(warehouseId!, filters, pageParam, pageSize),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = Math.ceil(lastPage.totalCount / pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!warehouseId,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch single product by ID with attributes
 */
export function useProductById(productId: string | null) {
  return useQuery({
    queryKey: queryKeys.products.byId(productId || ""),
    queryFn: () => getProductById(productId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!productId,
  });
}

/**
 * Fetch single product by sequence number with attributes
 */
export function useProductByNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.products.byNumber(sequenceNumber || ""),
    queryFn: () => getProductByNumber(Number(sequenceNumber)),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch products with inventory for a warehouse
 * Supports full-text search via filters.search_term
 */
export function useProductsWithInventory(
  warehouseId: string | null,
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.products.withInventory(
      warehouseId || "",
      filters,
      page,
    ),
    queryFn: () =>
      getProductsWithInventory(warehouseId!, filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    placeholderData: keepPreviousData,
    enabled: !!warehouseId,
  });
}

/**
 * Fetch single product with inventory by ID
 */
export function useProductWithInventoryById(
  productId: string | null,
  warehouseId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.products.withInventoryById(
      productId || "",
      warehouseId || "",
    ),
    queryFn: () => getProductWithInventoryById(productId!, warehouseId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!productId && !!warehouseId,
  });
}

/**
 * Fetch single product with inventory by sequence number
 */
export function useProductWithInventoryByNumber(
  sequenceNumber: string | null,
  warehouseId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.products.withInventoryByNumber(
      sequenceNumber || "",
      warehouseId || "",
    ),
    queryFn: () =>
      getProductWithInventoryByNumber(Number(sequenceNumber), warehouseId!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!sequenceNumber && !!warehouseId,
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
 * Attribute mutation hook - consolidated for all attribute types
 */
export function useCreateProductAttribute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      groupName,
    }: {
      name: string;
      groupName: AttributeGroup;
    }) => createProductAttribute(name, groupName),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.attributes(),
      });
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
      // Invalidate all product queries (with and without filters)
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
    onSuccess: () => {
      // Invalidate all product queries (with and without filters)
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateCatalogVisibility = useMutation({
    mutationFn: ({ productId, value }: { productId: string; value: boolean }) =>
      updateProductCatalogVisibility(productId, value),
    onSuccess: () => {
      // Invalidate all product queries (with and without filters)
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: (_, productId) => {
      // Invalidate all product queries (with and without filters)
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.removeQueries({
        queryKey: queryKeys.products.byId(productId),
      });
    },
  });

  const updateActiveStatus = useMutation({
    mutationFn: ({ productId, value }: { productId: string; value: boolean }) =>
      updateProductActiveStatus(productId, value),
    onSuccess: () => {
      // Invalidate all product queries (with and without filters)
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    create,
    update,
    updateCatalogVisibility,
    delete: deleteProductMutation,
    updateActiveStatus,
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

/**
 * Fetch products with low stock for a warehouse
 */
export function useLowStockProducts(warehouseId: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.products.withInventory(warehouseId),
    queryFn: () => getLowStockProducts(warehouseId, limit),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.REALTIME),
  });
}
