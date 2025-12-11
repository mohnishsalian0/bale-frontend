/**
 * Query Key Factory
 *
 * Centralized, type-safe query key generation for TanStack Query.
 * Hierarchical structure allows for easy cache invalidation.
 *
 * Example usage:
 *   queryKeys.products.all(companyId)           // ['products', companyId]
 *   queryKeys.products.detail(productId)        // ['products', 'detail', productId]
 *   queryKeys.products.byWarehouse(warehouseId) // ['products', 'warehouse', warehouseId]
 *
 * Invalidation examples:
 *   // Invalidate all product queries
 *   queryClient.invalidateQueries({ queryKey: ['products'] })
 *
 *   // Invalidate specific product
 *   queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) })
 */

import { ProductFilters } from "@/types/products.types";

export const queryKeys = {
  // Products (companyId removed - RLS handles scoping, user in single company)
  products: {
    all: (filters?: ProductFilters) => ["products", filters] as const,
    byId: (productId: string) => ["products", "detail", productId] as const,
    byNumber: (sequenceNumber: string) =>
      ["products", "sequence", sequenceNumber] as const,
    withInventory: (
      warehouseId: string,
      filters?: ProductFilters,
      page?: number,
    ) => ["products", "inventory", warehouseId, filters, page] as const,
    withInventoryById: (productId: string, warehouseId: string) =>
      ["products", "inventory", "detail", productId, warehouseId] as const,
    withInventoryByNumber: (sequenceNumber: string, warehouseId: string) =>
      ["products", "inventory", "number", sequenceNumber, warehouseId] as const,
    materials: () => ["products", "materials"] as const,
    colors: () => ["products", "colors"] as const,
    tags: () => ["products", "tags"] as const,
    attributes: () => ["products", "attributes"] as const,
  },

  // Partners (companyId removed - RLS handles scoping, user in single company)
  partners: {
    all: (filters?: Record<string, unknown>) => ["partners", filters] as const,
    detail: (partnerId: string) => ["partners", "detail", partnerId] as const,
    customers: () => ["partners", "customers"] as const,
    suppliers: () => ["partners", "suppliers"] as const,
    agents: () => ["partners", "agents"] as const,
  },

  // Sales Orders
  salesOrders: {
    all: (filters?: Record<string, unknown>, page?: number) =>
      ["sales-orders", filters, page] as const,
    detail: (sequenceNumber: string) =>
      ["sales-orders", "detail", sequenceNumber] as const,
    dashboard: (warehouseId: string) =>
      ["sales-orders", "dashboard", warehouseId] as const,
    customer: (customerId: string) =>
      ["sales-orders", "customer", customerId] as const,
  },

  // Purchase Orders
  purchaseOrders: {
    all: (filters?: Record<string, unknown>, page?: number) =>
      ["purchase-orders", filters, page] as const,
    detail: (sequenceNumber: string) =>
      ["purchase-orders", "detail", sequenceNumber] as const,
    dashboard: (warehouseId: string) =>
      ["purchase-orders", "dashboard", warehouseId] as const,
    supplier: (supplierId: string) =>
      ["purchase-orders", "supplier", supplierId] as const,
  },

  // Warehouses (companyId removed - RLS handles scoping, user in single company)
  warehouses: {
    all: () => ["warehouses"] as const,
    detail: (warehouseId: string) =>
      ["warehouses", "detail", warehouseId] as const,
    bySlug: (slug: string) => ["warehouses", "slug", slug] as const,
  },

  // Stock Units
  stockUnits: {
    all: (
      warehouseId: string,
      filters?: Record<string, unknown>,
      page?: number,
    ) => ["stock-units", warehouseId, filters, page] as const,
    byId: (stockUnitId: string) =>
      ["stock-units", "product", stockUnitId] as const,
  },

  // Stock Flow (Goods Inward/Outward)
  stockFlow: {
    inwards: (
      warehouseId: string,
      filters?: Record<string, unknown>,
      page?: number,
    ) => ["stock-flow", "inwards", warehouseId, filters, page] as const,
    outwards: (
      warehouseId: string,
      filters?: Record<string, unknown>,
      page?: number,
    ) => ["stock-flow", "outwards", warehouseId, filters, page] as const,
    inwardsByPurchaseOrder: (orderNumber: string, page?: number) =>
      ["stock-flow", "inwards", orderNumber, page] as const,
    outwardsBySalesOrder: (orderNumber: string, page?: number) =>
      ["stock-flow", "outwards", orderNumber, page] as const,
    inwardDetail: (sequenceNumber: string) =>
      ["stock-flow", "inward", "detail", sequenceNumber] as const,
    outwardDetail: (sequenceNumber: string) =>
      ["stock-flow", "outward", "detail", sequenceNumber] as const,
    outwardItemsByProduct: (productId: string, page?: number) =>
      ["stock-flow", "outward-items", "product", productId, page] as const,
  },

  // QR Batches
  qrBatches: {
    all: (warehouseId: string, filters?: Record<string, unknown>) =>
      ["qr-batches", warehouseId, filters] as const,
    detail: (batchId: string) => ["qr-batches", "detail", batchId] as const,
    items: (batchId: string) => ["qr-batches", "items", batchId] as const,
  },

  // Dashboard
  dashboard: {
    all: (warehouseId: string) => ["dashboard", warehouseId] as const,
    salesOrders: (warehouseId: string) =>
      ["dashboard", "sales-orders", warehouseId] as const,
    lowStock: (warehouseId: string) =>
      ["dashboard", "low-stock", warehouseId] as const,
    pendingQR: (warehouseId: string) =>
      ["dashboard", "pending-qr", warehouseId] as const,
    recentPartners: () => ["dashboard", "recent-partners"] as const,
  },

  // Catalog (Public)
  catalog: {
    company: (slug: string) => ["catalog", "company", slug] as const,
    config: (companyId: string) => ["catalog", "config", companyId] as const,
    products: (companySlug: string) =>
      ["catalog", "products", companySlug] as const,
    order: (orderId: string) => ["catalog", "order", orderId] as const,
  },

  // Company
  company: {
    detail: () => ["company"] as const,
    warehouses: (companyId: string) =>
      ["company", "warehouses", companyId] as const,
  },

  // Users
  users: {
    all: () => ["users"] as const,
    detail: (userId: string) => ["users", "detail", userId] as const,
    current: () => ["users", "current"] as const,
    permissions: () => ["users", "permissions"] as const,
  },

  // Invites
  invites: {
    all: () => ["invites"] as const,
    active: () => ["invites", "active"] as const,
    byCode: (code: string) => ["invites", "code", code] as const,
  },
} as const;
