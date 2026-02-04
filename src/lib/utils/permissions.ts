import {
  getRouteConfig,
  matchDynamicRoute,
  RouteConfig,
} from "@/lib/permissions/route-config";

/**
 * Wildcard matcher using backtracking algorithm
 * Matches required permission against granted permission pattern
 * Supports greedy wildcards: 'inventory.*' or 'inventory.*.view'
 */
export function matchesWildcard(
  requiredPermission: string,
  grantedPattern: string,
): boolean {
  const requiredParts = requiredPermission.split(".");
  const grantedParts = grantedPattern.split(".");

  let reqIdx = 0;
  let grantIdx = 0;
  let lastStarGrant = -1;
  let lastStarReq = -1;

  while (reqIdx < requiredParts.length) {
    if (grantIdx < grantedParts.length && grantedParts[grantIdx] === "*") {
      // Record wildcard positions
      lastStarGrant = grantIdx;
      lastStarReq = reqIdx;
      grantIdx++; // move past '*'
    } else if (
      grantIdx < grantedParts.length &&
      grantedParts[grantIdx] === requiredParts[reqIdx]
    ) {
      // Direct match
      grantIdx++;
      reqIdx++;
    } else if (lastStarGrant >= 0) {
      // Backtrack: extend '*' to include this segment
      lastStarReq++;
      reqIdx = lastStarReq;
      grantIdx = lastStarGrant + 1;
    } else {
      // No match possible
      return false;
    }
  }

  // After consuming required parts, remaining granted parts must be '*' only
  while (grantIdx < grantedParts.length && grantedParts[grantIdx] === "*") {
    grantIdx++;
  }

  return grantIdx >= grantedParts.length;
}

/**
 * Check if user has a specific permission
 *
 * @param permission - Permission to check (e.g., "inventory.products.read")
 * @param userPermissions - Set of user's granted permissions
 * @returns true if user has the permission
 */
export function hasPermission(
  permission: string,
  userPermissions: string[],
): boolean {
  // Empty string means no permission check required - always return true
  if (permission === "") {
    return true;
  }

  // Check for exact match first (most common, fastest)
  if (userPermissions.includes(permission)) {
    return true;
  }

  // Check for wildcard matches
  for (const userPerm of userPermissions) {
    if (userPerm.includes("*") && matchesWildcard(permission, userPerm)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if user has permission to access a route
 *
 * @param pathname - Full pathname (e.g., "/warehouse/wh-123/inventory")
 * @param warehouseSlug - Warehouse slug to extract route path (optional for company routes)
 * @param userPermissions - Set of user's granted permissions
 * @returns Object with allowed flag and optional redirect info
 */
export function checkRoutePermission(
  pathname: string,
  warehouseSlug: string | null,
  userPermissions: string[],
): { allowed: boolean; redirectTo?: string; routeName?: string } {
  // Handle company-level routes
  if (pathname.startsWith("/company")) {
    const pathAfterCompany = pathname.replace(/^\/company\/?/, "") || "company";

    try {
      // Try exact match first
      let routeConfig: RouteConfig | null = getRouteConfig(
        pathAfterCompany,
        true,
      );

      // If not found, try dynamic route matching
      if (!routeConfig) {
        routeConfig = matchDynamicRoute(pathAfterCompany, true);
      }

      if (routeConfig) {
        // Check if user has the required permission
        if (!hasPermission(routeConfig.permission, userPermissions)) {
          return {
            allowed: false,
            redirectTo: `/restricted?page=${encodeURIComponent(routeConfig.displayName)}`,
            routeName: routeConfig.displayName,
          };
        }
        return { allowed: true };
      }
    } catch (error) {
      console.error("Company route permission check error:", error);
    }

    // Unknown company route - allow by default (or change to false for stricter security)
    return { allowed: true };
  }

  // Handle warehouse routes
  if (!warehouseSlug) {
    // No warehouse slug but not a company route - might be warehouse selection page
    return { allowed: true };
  }

  // Extract route path relative to /warehouse/[warehouse_slug]/
  const pathAfterWarehouse = pathname.split(`/warehouse/${warehouseSlug}/`)[1];

  if (!pathAfterWarehouse) {
    // On warehouse root or warehouse selection page - allow
    return { allowed: true };
  }

  try {
    // Try exact match first
    let routeConfig: RouteConfig | null = getRouteConfig(
      pathAfterWarehouse,
      false,
    );
    console.log(
      "xcvxc",
      routeConfig,
      pathname,
      pathAfterWarehouse,
      userPermissions,
    );

    // If not found, try dynamic route matching
    if (!routeConfig) {
      routeConfig = matchDynamicRoute(pathAfterWarehouse, false);
    }

    if (routeConfig) {
      // Check if user has the required permission
      if (!hasPermission(routeConfig.permission, userPermissions)) {
        // Return redirect info
        return {
          allowed: false,
          redirectTo: `/warehouse/${warehouseSlug}/restricted?page=${encodeURIComponent(routeConfig.displayName)}`,
          routeName: routeConfig.displayName,
        };
      }
      return { allowed: true };
    }
  } catch (error) {
    // Route not in config
    console.error("Route permission check error:", error);
  }

  // Unknown route - allow by default (or change to false for stricter security)
  return { allowed: true };
}
