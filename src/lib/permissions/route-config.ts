/**
 * Route permission configuration
 *
 * Industry-standard route metadata pattern used by frameworks like:
 * - Next.js App Router
 * - Angular Router
 * - Vue Router
 * - React Router
 */

export interface RouteConfig {
  /**
   * Permission required to access this route
   * Uses dot-path notation (e.g., "inventory.goods_inward.read")
   */
  permission: string;

  /**
   * Human-readable page name for error messages
   * Example: "Stock Flow", "Inventory Management"
   */
  displayName: string;

  /**
   * Description of what this page does (optional)
   * Used in error messages or help text
   */
  description?: string;
}

/**
 * Route permission mapping
 * Key: Exact route path relative to /warehouse/[warehouse_slug]/
 * Value: Route configuration
 *
 * IMPORTANT:
 * - All warehouse routes MUST be defined here
 * - No partial matching - each route needs exact entry
 * - Public routes (like /invite, /auth) are not included as they're outside warehouse context
 */
export const routePermissions: Record<string, RouteConfig> = {
  // ===== Main Dashboard =====
  dashboard: {
    permission: "inventory.dashboard.read",
    displayName: "Dashboard",
    description: "View main dashboard overview",
  },

  // ===== Inventory Module =====
  inventory: {
    permission: "inventory.dashboard.read",
    displayName: "Inventory Dashboard",
    description: "View inventory dashboard and stock overview",
  },

  // Products (Master Catalog)
  products: {
    permission: "business.products.read",
    displayName: "Products",
    description: "View product catalog",
  },

  "products/create": {
    permission: "business.products.create",
    displayName: "Create Product",
    description: "Add new product to catalog",
  },

  // Dynamic routes use pattern matching in middleware
  // Listed here for documentation
  "products/[product_number]": {
    permission: "business.products.read",
    displayName: "Product Details",
    description: "View product information",
  },

  "products/[product_number]/edit": {
    permission: "business.products.update",
    displayName: "Edit Product",
    description: "Update product information",
  },

  "products/[product_number]/summary": {
    permission: "business.products.read",
    displayName: "Product Summary",
    description: "View product summary",
  },

  "products/[product_number]/stock-units": {
    permission: "inventory.stock_units.read",
    displayName: "Product Stock Units",
    description: "View product stock units",
  },

  "products/[product_number]/stock-flow": {
    permission: "inventory.goods_inward.read",
    displayName: "Product Stock Flow",
    description: "View product movement history",
  },

  // QR Codes
  "qr-codes": {
    permission: "inventory.qr_batches.read",
    displayName: "QR Codes",
    description: "View and manage QR code batches",
  },

  "qr-codes/create": {
    permission: "inventory.qr_batches.create",
    displayName: "Generate QR Codes",
    description: "Generate QR code labels for inventory",
  },

  // ===== Goods Movement =====
  "goods-movement": {
    permission: "inventory.goods_inward.read",
    displayName: "Goods Movement",
    description: "View goods movement overview",
  },

  "goods-movement/inward": {
    permission: "inventory.goods_inward.read",
    displayName: "Goods Inward",
    description: "View inward movement list",
  },

  "goods-movement/outward": {
    permission: "inventory.goods_outward.read",
    displayName: "Goods Outward",
    description: "View outward movement list",
  },

  // Goods Inward
  "goods-inward": {
    permission: "inventory.goods_inward.read",
    displayName: "Goods Inward",
    description: "View goods inward movements",
  },

  "goods-inward/create": {
    permission: "inventory.goods_inward.create",
    displayName: "Create Goods Inward",
    description: "Record incoming inventory",
  },

  "goods-inward/[inward_number]": {
    permission: "inventory.goods_inward.read",
    displayName: "Goods Inward Details",
    description: "View inward movement details",
  },

  "goods-inward/[inward_number]/edit": {
    permission: "inventory.goods_inward.update",
    displayName: "Edit Goods Inward",
    description: "Update inward movement",
  },

  // Goods Outward
  "goods-outward": {
    permission: "inventory.goods_outward.read",
    displayName: "Goods Outward",
    description: "View goods outward movements",
  },

  "goods-outward/create": {
    permission: "inventory.goods_outward.create",
    displayName: "Create Goods Outward",
    description: "Dispatch inventory",
  },

  "goods-outward/[outward_number]": {
    permission: "inventory.goods_outward.read",
    displayName: "Goods Outward Details",
    description: "View outward movement details",
  },

  "goods-outward/[outward_number]/edit": {
    permission: "inventory.goods_outward.update",
    displayName: "Edit Goods Outward",
    description: "Update outward movement",
  },

  // Goods Transfer
  "goods-transfer": {
    permission: "inventory.goods_transfers.read",
    displayName: "Goods Transfer",
    description: "View warehouse-to-warehouse transfers",
  },

  "goods-transfer/create": {
    permission: "inventory.goods_transfers.create",
    displayName: "Create Goods Transfer",
    description: "Create warehouse transfer",
  },

  "goods-transfer/[transfer_number]": {
    permission: "inventory.goods_transfers.read",
    displayName: "Goods Transfer Details",
    description: "View transfer details",
  },

  "goods-transfer/[transfer_number]/edit": {
    permission: "inventory.goods_transfers.update",
    displayName: "Edit Goods Transfer",
    description: "Update transfer record",
  },

  // ===== Orders Module =====
  orders: {
    permission: "orders.dashboard.read",
    displayName: "Orders Dashboard",
    description: "View orders dashboard and overview",
  },

  // Sales Orders
  "sales-orders": {
    permission: "orders.sales_orders.read",
    displayName: "Sales Orders",
    description: "View and manage sales orders",
  },

  "sales-orders/create": {
    permission: "orders.sales_orders.create",
    displayName: "Create Sales Order",
    description: "Create new customer order",
  },

  "sales-orders/quick-create": {
    permission: "orders.sales_orders.create",
    displayName: "Quick Create Sales Order",
    description: "Create sales order with quick flow",
  },

  "sales-orders/[sale_number]": {
    permission: "orders.sales_orders.read",
    displayName: "Sales Order Details",
    description: "View sales order details",
  },

  "sales-orders/[sale_number]/details": {
    permission: "orders.sales_orders.read",
    displayName: "Sales Order Details",
    description: "View detailed order information",
  },

  "sales-orders/[sale_number]/edit": {
    permission: "orders.sales_orders.update",
    displayName: "Edit Sales Order",
    description: "Update sales order",
  },

  "sales-orders/[sale_number]/edit-items": {
    permission: "orders.sales_orders.update",
    displayName: "Edit Sales Order Items",
    description: "Update order items",
  },

  // Purchase Orders
  "purchase-orders": {
    permission: "orders.purchase_orders.read",
    displayName: "Purchase Orders",
    description: "View and manage purchase orders",
  },

  "purchase-orders/create": {
    permission: "orders.purchase_orders.create",
    displayName: "Create Purchase Order",
    description: "Create new supplier order",
  },

  "purchase-orders/[purchase_number]": {
    permission: "orders.purchase_orders.read",
    displayName: "Purchase Order Details",
    description: "View purchase order details",
  },

  "purchase-orders/[purchase_number]/details": {
    permission: "orders.purchase_orders.read",
    displayName: "Purchase Order Details",
    description: "View detailed order information",
  },

  "purchase-orders/[purchase_number]/edit": {
    permission: "orders.purchase_orders.update",
    displayName: "Edit Purchase Order",
    description: "Update purchase order",
  },

  "purchase-orders/[purchase_number]/edit-items": {
    permission: "orders.purchase_orders.update",
    displayName: "Edit Purchase Order Items",
    description: "Update order items",
  },

  // ===== Accounting Module =====
  accounting: {
    permission: "accounting.dashboard.read",
    displayName: "Accounting Dashboard",
    description: "View accounting dashboard and financial overview",
  },

  // Ledgers
  "accounting/ledgers": {
    permission: "accounting.ledgers.read",
    displayName: "Ledgers",
    description: "View and manage ledger accounts",
  },

  // Invoices
  invoices: {
    permission: "accounting.invoices.read",
    displayName: "Invoices",
    description: "View and manage invoices",
  },

  "invoices/create": {
    permission: "accounting.invoices.create",
    displayName: "Create Invoice",
    description: "Create new invoice",
  },

  "invoices/create/[invoice_type]": {
    permission: "accounting.invoices.create",
    displayName: "Create Invoice",
    description: "Create new invoice of specific type",
  },

  "invoices/quick-create": {
    permission: "accounting.invoices.create",
    displayName: "Quick Create Invoice",
    description: "Create invoice with quick flow",
  },

  "invoices/quick-create/[invoice_type]": {
    permission: "accounting.invoices.create",
    displayName: "Quick Create Invoice",
    description: "Create invoice with quick flow",
  },

  "invoices/[invoice_slug]": {
    permission: "accounting.invoices.read",
    displayName: "Invoice Details",
    description: "View invoice details",
  },

  "invoices/[invoice_slug]/details": {
    permission: "accounting.invoices.read",
    displayName: "Invoice Details",
    description: "View detailed invoice information",
  },

  "invoices/[invoice_slug]/edit": {
    permission: "accounting.invoices.update",
    displayName: "Edit Invoice",
    description: "Update invoice",
  },

  // Payments
  payments: {
    permission: "accounting.payments.read",
    displayName: "Payments",
    description: "View and manage payments and receipts",
  },

  "payments/create": {
    permission: "accounting.payments.create",
    displayName: "Create Payment",
    description: "Record new payment or receipt",
  },

  "payments/create/[payment_type]": {
    permission: "accounting.payments.create",
    displayName: "Create Payment",
    description: "Record payment of specific type",
  },

  "payments/[payment_slug]": {
    permission: "accounting.payments.read",
    displayName: "Payment Details",
    description: "View payment details",
  },

  "payments/[payment_slug]/details": {
    permission: "accounting.payments.read",
    displayName: "Payment Details",
    description: "View detailed payment information",
  },

  "payments/[payment_slug]/edit": {
    permission: "accounting.payments.update",
    displayName: "Edit Payment",
    description: "Update payment",
  },

  // Adjustment Notes
  "adjustment-notes": {
    permission: "accounting.adjustment_notes.read",
    displayName: "Adjustment Notes",
    description: "View and manage credit/debit notes",
  },

  "adjustment-notes/create": {
    permission: "accounting.adjustment_notes.create",
    displayName: "Create Adjustment Note",
    description: "Create new credit or debit note",
  },

  "adjustment-notes/create/[adjustment_type]": {
    permission: "accounting.adjustment_notes.create",
    displayName: "Create Adjustment Note",
    description: "Create adjustment note of specific type",
  },

  "adjustment-notes/[adjustment_slug]": {
    permission: "accounting.adjustment_notes.read",
    displayName: "Adjustment Note Details",
    description: "View adjustment note details",
  },

  "adjustment-notes/[adjustment_slug]/details": {
    permission: "accounting.adjustment_notes.read",
    displayName: "Adjustment Note Details",
    description: "View detailed adjustment note information",
  },

  "adjustment-notes/[adjustment_slug]/edit": {
    permission: "accounting.adjustment_notes.update",
    displayName: "Edit Adjustment Note",
    description: "Update adjustment note",
  },

  // ===== Business Module =====
  // Partners
  partners: {
    permission: "business.partners.read",
    displayName: "Partners",
    description: "View and manage business partners",
  },

  "partners/create": {
    permission: "business.partners.create",
    displayName: "Create Partner",
    description: "Add new business partner",
  },

  "partners/[partner_id]": {
    permission: "business.partners.read",
    displayName: "Partner Details",
    description: "View partner information",
  },

  "partners/[partner_id]/edit": {
    permission: "business.partners.update",
    displayName: "Edit Partner",
    description: "Update partner information",
  },

  "partners/[partner_id]/summary": {
    permission: "business.partners.read",
    displayName: "Partner Summary",
    description: "View partner summary",
  },

  "partners/[partner_id]/orders": {
    permission: "business.partners.read",
    displayName: "Partner Orders",
    description: "View partner order history",
  },

  // Staff
  staff: {
    permission: "business.users.read",
    displayName: "Staff Management",
    description: "View and manage staff members",
  },

  "staff/create": {
    permission: "business.users.create",
    displayName: "Create Staff Member",
    description: "Invite new staff member",
  },

  "staff/[user_id]/edit": {
    permission: "business.users.update",
    displayName: "Edit Staff Member",
    description: "Update staff information",
  },
};

/**
 * Company-level routes (outside warehouse context)
 * Path: /company/*
 */
export const companyRoutes: Record<string, RouteConfig> = {
  company: {
    permission: "business.companies.read",
    displayName: "Company Settings",
    description: "View and manage company information",
  },

  "company/edit": {
    permission: "business.companies.update",
    displayName: "Edit Company",
    description: "Update company settings",
  },

  "company/warehouses": {
    permission: "business.warehouses.read",
    displayName: "Warehouses",
    description: "View and manage warehouse locations",
  },

  "company/warehouses/create": {
    permission: "business.warehouses.create",
    displayName: "Create Warehouse",
    description: "Add new warehouse location",
  },

  "company/warehouses/[warehouse_id]/edit": {
    permission: "business.warehouses.update",
    displayName: "Edit Warehouse",
    description: "Update warehouse information",
  },
};

/**
 * Get route config for exact path match
 * Throws error if route is not defined in config
 *
 * @param path - Route path to look up (must match exactly)
 * @param isCompanyRoute - Whether this is a company-level route (default: false)
 * @returns Route configuration
 * @throws Error if route is not defined in routePermissions
 */
export function getRouteConfig(
  path: string,
  isCompanyRoute: boolean = false,
): RouteConfig {
  const config = isCompanyRoute
    ? companyRoutes[path]
    : routePermissions[path];

  if (!config) {
    const context = isCompanyRoute ? "company" : "warehouse";
    throw new Error(
      `Route "${path}" is not defined in ${context} route configuration. ` +
        `All routes must be explicitly defined in routePermissions.`,
    );
  }

  return config;
}

/**
 * Match dynamic route patterns
 * Converts dynamic route like "products/[product_number]" to match actual paths
 *
 * @param actualPath - The actual route path from the URL
 * @param isCompanyRoute - Whether this is a company-level route
 * @returns RouteConfig if match found, null otherwise
 */
export function matchDynamicRoute(
  actualPath: string,
  isCompanyRoute: boolean = false,
): RouteConfig | null {
  const routes = isCompanyRoute ? companyRoutes : routePermissions;

  // First try exact match
  if (routes[actualPath]) {
    return routes[actualPath];
  }

  // Try dynamic pattern matching
  const pathSegments = actualPath.split("/");

  for (const [pattern, config] of Object.entries(routes)) {
    const patternSegments = pattern.split("/");

    // Must have same number of segments
    if (pathSegments.length !== patternSegments.length) continue;

    // Check if pattern matches
    const matches = patternSegments.every((segment, i) => {
      // Dynamic segment matches anything
      if (segment.startsWith("[") && segment.endsWith("]")) return true;
      // Static segment must match exactly
      return segment === pathSegments[i];
    });

    if (matches) return config;
  }

  return null;
}
