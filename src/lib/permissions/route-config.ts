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
   * Uses dot-path notation (e.g., "inventory.products.read")
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
  // ===== Main App Routes (app) =====
  dashboard: {
    permission: "dashboard.read",
    displayName: "Dashboard",
    description: "View dashboard",
  },

  "stock-flow": {
    permission: "movement.read",
    displayName: "Stock Flow",
    description: "View goods inward and outward movements",
  },

  inventory: {
    permission: "inventory.products.read",
    displayName: "Inventory",
    description: "View and manage product inventory",
  },

  partners: {
    permission: "partners.read",
    displayName: "Partners",
    description: "View and manage business partners",
  },

  "sales-orders": {
    permission: "sales_orders.read",
    displayName: "Sales Orders",
    description: "View and manage sales orders",
  },

  "qr-codes": {
    permission: "inventory.qr_batches.read",
    displayName: "QR Codes",
    description: "View and manage QR code batches",
  },

  staff: {
    permission: "users.read",
    displayName: "Staff Management",
    description: "View and manage staff members",
  },

  reports: {
    permission: "reports.read",
    displayName: "Reports",
    description: "View business reports and analytics",
  },

  settings: {
    permission: "settings.read",
    displayName: "Settings",
    description: "Manage warehouse and company settings",
  },

  // ===== Flow Routes (creation flows) =====
  "goods-inward/create": {
    permission: "movement.inward.create",
    displayName: "Create Goods Inward",
    description: "Record incoming inventory",
  },

  "goods-outward/create": {
    permission: "movement.outward.create",
    displayName: "Create Goods Outward",
    description: "Dispatch inventory",
  },

  "sales-orders/create": {
    permission: "sales_orders.create",
    displayName: "Create Sales Order",
    description: "Create new customer orders",
  },

  "qr-codes/create": {
    permission: "inventory.qr_batches.create",
    displayName: "Create QR Codes",
    description: "Generate QR code labels for inventory",
  },
};

/**
 * Get route config for exact path match
 * Throws error if route is not defined in config
 *
 * @param path - Route path to look up (must match exactly)
 * @returns Route configuration
 * @throws Error if route is not defined in routePermissions
 */
export function getRouteConfig(path: string): RouteConfig {
  const config = routePermissions[path];

  if (!config) {
    throw new Error(
      `Route "${path}" is not defined in route configuration. ` +
        `All routes must be explicitly defined in routePermissions.`,
    );
  }

  return config;
}
