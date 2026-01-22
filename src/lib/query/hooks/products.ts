"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
} from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getProductAttributeLists,
  getProductById,
  getProductByNumber,
  getProductByCode,
  getProducts,
  getProductsWithInventoryAndOrders,
  getProductWithInventoryById,
  getProductWithInventoryAndOrdersByNumber,
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
import {
  ProductFilters,
  ProductUpsertData,
  ProductListView,
  ProductWithInventoryListView,
} from "@/types/products.types";
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
  enabled: boolean = true,
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
    enabled: enabled,
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
  });
}

/**
 * Fetch products with inventory and order aggregates using infinite scroll
 * Used in product selection components (sales orders, goods outward, etc.)
 */
export function useInfiniteProductsWithInventoryAndOrders(
  warehouseId: string | null,
  filters?: ProductFilters,
  pageSize: number = 30,
  enabled: boolean = true,
) {
  return useInfiniteQuery({
    queryKey: [
      ...queryKeys.products.withInventoryAndOrders(warehouseId || "", filters),
      "infinite",
    ],
    queryFn: ({ pageParam = 1 }) =>
      getProductsWithInventoryAndOrders(
        warehouseId!,
        filters,
        pageParam,
        pageSize,
      ),
    getNextPageParam: (lastPage, allPages) => {
      const currentPage = allPages.length;
      const totalPages = Math.ceil(lastPage.totalCount / pageSize);
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!warehouseId && enabled,
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
 * Fetch multiple products by IDs with attributes
 * Uses TanStack Query's useQueries for automatic deduplication and caching
 */
export function useProductsByIds(productIds: string[]) {
  return useQueries({
    queries: productIds.map((id) => ({
      queryKey: queryKeys.products.byId(id),
      queryFn: () => getProductById(id),
      ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    })),
    combine: (results) => ({
      data: results
        .map((r) => r.data)
        .filter((data) => data !== undefined) as ProductListView[],
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
      errors: results.filter((r) => r.error).map((r) => r.error),
    }),
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
 * Fetch single product by product code with attributes
 */
export function useProductByCode(productCode: string | null) {
  return useQuery({
    queryKey: queryKeys.products.byCode(productCode || ""),
    queryFn: () => getProductByCode(productCode!),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
    enabled: !!productCode,
  });
}

/**
 * Fetch products with inventory and order aggregates (unified hook)
 * Used in both products and inventory pages
 * Set has_inventory filter to control stock filtering
 */
export function useProductsWithInventoryAndOrders(
  warehouseId: string | null,
  filters?: ProductFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.products.withInventoryAndOrders(
      warehouseId || "",
      filters,
      page,
    ),
    queryFn: () =>
      getProductsWithInventoryAndOrders(warehouseId!, filters, page, pageSize),
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
 * Fetch multiple products with inventory by IDs
 * Uses TanStack Query's useQueries for automatic deduplication and caching
 */
export function useProductsWithInventoryByIds(
  productIds: string[],
  warehouseId: string | null,
) {
  return useQueries({
    queries: productIds.map((id) => ({
      queryKey: queryKeys.products.withInventoryById(id, warehouseId || ""),
      queryFn: () => getProductWithInventoryById(id, warehouseId!),
      ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.MASTER_DATA),
      enabled: !!warehouseId,
    })),
    combine: (results) => ({
      data: results
        .map((r) => r.data)
        .filter((data) => data !== undefined) as ProductWithInventoryListView[],
      isLoading: results.some((r) => r.isLoading),
      isError: results.some((r) => r.isError),
      errors: results.filter((r) => r.error).map((r) => r.error),
    }),
  });
}

/**
 * Fetch single product with inventory and orders by sequence number
 */
export function useProductWithInventoryAndOrdersByNumber(
  sequenceNumber: string | null,
  warehouseId: string | null,
) {
  return useQuery({
    queryKey: queryKeys.products.withInventoryAndOrdersByNumber(
      sequenceNumber || "",
      warehouseId || "",
    ),
    queryFn: () =>
      getProductWithInventoryAndOrdersByNumber(
        Number(sequenceNumber),
        warehouseId!,
      ),
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
    queryKey: [
      ...queryKeys.products.withInventoryAndOrders(warehouseId),
      "low-stock",
      limit,
    ],
    queryFn: () => getLowStockProducts(warehouseId, limit),
    ...getQueryOptions(STALE_TIME.PRODUCTS, GC_TIME.REALTIME),
  });
}
