import { getRouteConfig } from "@/lib/permissions/route-config";

/**
 * Wildcard matcher using backtracking algorithm
 * Matches required permission against granted permission pattern
 * Supports greedy wildcards: 'inventory.*' or 'inventory.*.view'
 */
function matchesWildcard(
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
 * @param warehouseSlug - Warehouse slug to extract route path
 * @param userPermissions - Set of user's granted permissions
 * @returns Object with allowed flag and optional redirect info
 */
export function checkRoutePermission(
  pathname: string,
  warehouseSlug: string,
  userPermissions: string[],
): { allowed: boolean; redirectTo?: string } {
  // Extract route path relative to /warehouse/[warehouse_slug]/
  const pathAfterWarehouse = pathname.split(`/warehouse/${warehouseSlug}/`)[1];

  if (!pathAfterWarehouse) {
    // On warehouse root or warehouse selection page - allow
    return { allowed: true };
  }

  try {
    const routeConfig = getRouteConfig(pathAfterWarehouse);

    // Check if user has the required permission
    if (!hasPermission(routeConfig.permission, userPermissions)) {
      // Return redirect info
      return {
        allowed: false,
        redirectTo: `/warehouse/${warehouseSlug}/restricted?page=${encodeURIComponent(routeConfig.displayName)}`,
      };
    }

    return { allowed: true };
  } catch (error) {
    // Route not in config - throw error in development
    console.error(error);
    // You might want to handle this differently in production
    return { allowed: true }; // or false, depending on your security preference
  }
}
