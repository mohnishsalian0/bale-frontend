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

export const queryKeys = {
  // Products (companyId removed - RLS handles scoping, user in single company)
  products: {
    all: () => ["products"] as const,
    detail: (productId: string) => ["products", "detail", productId] as const,
    bySequence: (sequenceNumber: string) =>
      ["products", "sequence", sequenceNumber] as const,
    withInventory: (warehouseId: string) =>
      ["products", "inventory", warehouseId] as const,
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
    all: (warehouseId: string | null) => ["sales-orders", warehouseId] as const,
    detail: (sequenceNumber: string) =>
      ["sales-orders", "detail", sequenceNumber] as const,
    dashboard: (warehouseId: string) =>
      ["sales-orders", "dashboard", warehouseId] as const,
    pendingByCustomer: (customerId: string) =>
      ["sales-orders", "pending", "customer", customerId] as const,
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
    all: (warehouseId: string, filters?: Record<string, unknown>) =>
      ["stock-units", warehouseId, filters] as const,
    byProduct: (productId: string, warehouseId: string) =>
      ["stock-units", "product", productId, warehouseId] as const,
    withInwardDetails: (productId: string, warehouseId: string) =>
      ["stock-units", "with-inward-details", productId, warehouseId] as const,
    pendingQR: (warehouseId: string) =>
      ["stock-units", "pending-qr", warehouseId] as const,
  },

  // Stock Flow (Goods Inward/Outward)
  stockFlow: {
    inwards: (warehouseId: string, filters?: Record<string, unknown>) =>
      ["stock-flow", "inwards", warehouseId, filters] as const,
    outwards: (warehouseId: string, filters?: Record<string, unknown>) =>
      ["stock-flow", "outwards", warehouseId, filters] as const,
    inwardDetail: (sequenceNumber: string) =>
      ["stock-flow", "inward", "detail", sequenceNumber] as const,
    outwardDetail: (sequenceNumber: string) =>
      ["stock-flow", "outward", "detail", sequenceNumber] as const,
    outwardItemsByProduct: (productId: string) =>
      ["stock-flow", "outward-items", "product", productId] as const,
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
    current: () => ["users", "current"] as const,
    role: (userId: string) => ["users", "role", userId] as const,
  },

  // Invites
  invites: {
    byCode: (code: string) => ["invites", "code", code] as const,
  },
} as const;
