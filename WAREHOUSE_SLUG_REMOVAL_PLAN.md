# Remove warehouse_slug from URL Structure - Implementation Plan

## Overview

Migrate from `/warehouse/[warehouse_slug]/*` to flat routes (e.g., `/dashboard`, `/sales-orders`). Single source of truth: `user.warehouse_id` from database via session context.

---

## Phase 1: File Structure Reorganization

### Move all page files from nested to flat structure

**Source**: `/src/app/(protected)/warehouse/[warehouse_slug]/`
**Destination**: `/src/app/(protected)/`

**Files to move** (62 files total):

#### Top-level pages:

- `page.tsx` → `/src/app/(protected)/page.tsx`
- `dashboard/page.tsx`
- `inventory/page.tsx`
- `products/page.tsx`
- `partners/page.tsx`
- `sales-orders/page.tsx`
- `purchase-orders/page.tsx`
- `invoices/page.tsx`
- `payments/page.tsx`
- `adjustment-notes/page.tsx`
- `goods-movement/page.tsx`
- `goods-inward/page.tsx`
- `goods-outward/page.tsx`
- `goods-transfer/page.tsx`
- `qr-codes/page.tsx`
- `staff/page.tsx`
- `accounting/page.tsx`
- `orders/page.tsx`
- `restricted/page.tsx`

#### All nested routes with dynamic segments:

- `products/[product_number]/**/*` (all sub-routes)
- `sales-orders/[sale_number]/**/*`
- `purchase-orders/[purchase_number]/**/*`
- `invoices/[invoice_slug]/**/*`
- `payments/[payment_slug]/**/*`
- `adjustment-notes/[adjustment_slug]/**/*`
- `goods-inward/[inward_number]/**/*`
- `goods-outward/[outward_number]/**/*`
- `goods-transfer/[transfer_number]/**/*`
- `partners/[partner_id]/**/*`
- `staff/[user_id]/**/*`

#### Create/edit pages:

- All `/create/` routes
- All `/edit/` routes
- All `/quick-create/` routes

**After moving**: Delete empty `warehouse/` and `[warehouse_slug]/` folders

---

## Phase 2: Core Infrastructure Updates

### 1. Remove Warehouse-by-Slug Query Infrastructure

**File**: `/src/lib/queries/warehouses.ts`

- ❌ Remove `buildWarehouseBySlugQuery()` function (lines 28-38)
- ❌ Remove `getWarehouseBySlug()` function (lines 79-90)

**File**: `/src/lib/query/hooks/warehouses.ts`

- ❌ Remove `useWarehouseBySlug()` hook (lines 31-38)
- ❌ Remove `getWarehouseBySlug` import (line 8)

**File**: `/src/lib/query/keys.ts`

- ❌ Remove `bySlug: (slug: string) => ["warehouses", "slug", slug]` from warehouses keys (line 98)

---

### 2. Update Protected Layout

**File**: `/src/app/(protected)/layout.tsx`

**Changes**:

- ❌ Remove `warehouseSlug` extraction from params (line 107)
- ❌ Remove `useWarehouseBySlug` import and usage (lines 16, 116-120)
- ❌ Remove conditional warehouse fetching logic (lines 122-137)
- ✅ Keep only `useWarehouseById(user?.warehouse_id)` (lines 122-128)
- ✅ Simplify warehouse validation in useEffect (lines 142-194)
- ✅ Update landing redirect logic:
  - If `user.warehouse_id` exists → redirect to `/inventory`
  - If no warehouse → redirect to `/warehouse` selection page

**Key simplifications**:

```typescript
// BEFORE: Two warehouse fetching mechanisms
const warehouseBySlug = useWarehouseBySlug(warehouseSlug || null);
const warehouseById = useWarehouseById(
  !warehouseSlug && user?.warehouse_id ? user.warehouse_id : null,
);
const warehouse = warehouseSlug ? warehouseBySlug : warehouseById;

// AFTER: Single source of truth
const {
  data: warehouse,
  isLoading: warehouseLoading,
  error: warehouseError,
} = useWarehouseById(user?.warehouse_id || null);
```

---

### 3. Update Warehouse Selector

**File**: `/src/components/layouts/warehouse-selector.tsx`

**Changes**:

- ❌ Remove `router.push()` after warehouse selection
- ❌ Remove URL reconstruction logic with `warehouse.slug`
- ✅ Keep `updateUserWarehouse` mutation
- ✅ After mutation success, let protected layout handle warehouse refetch automatically
- ✅ Add `router.refresh()` if automatic refetch doesn't trigger (test first)

**New behavior**:

1. User clicks warehouse in selector
2. Mutation updates `user.warehouse_id` in database
3. TanStack Query invalidates user query
4. Protected layout refetches user with new `warehouse_id`
5. Protected layout refetches warehouse using new ID
6. Session context updates with new warehouse
7. All child components re-render with new warehouse data
8. User stays on current page (e.g., `/sales-orders`) but sees new warehouse's data

---

## Phase 3: Permission System Updates

### 1. Update Route Configuration

**File**: `/src/lib/permissions/route-config.ts`

**Changes**:

- ✅ Update JSDoc comments:
  - Line 33: "Exact route path relative to /(protected)/" (was: "relative to /warehouse/[warehouse_slug]/")
  - Line 493: "Company-level routes: /company/\*" (already correct)
- ✅ Add `/restricted` route to main config:
  ```typescript
  restricted: {
    permission: "",
    displayName: "Access Restricted",
    description: "Permission denied page"
  }
  ```
- ✅ Route keys remain unchanged (already relative paths like "dashboard", "sales-orders", etc.)

---

### 2. Update Permission Checking Utility

**File**: `/src/lib/utils/permissions.ts`

**Changes to `checkRoutePermission()` function**:

- ❌ Remove `warehouseSlug` parameter from function signature (line 97)
- ❌ Remove warehouse route extraction logic (lines 136-146)
- ✅ Simplify to single route matching pattern

**New logic**:

```typescript
export function checkRoutePermission(
  pathname: string,
  userPermissions: string[],
): { allowed: boolean; redirectTo?: string; routeName?: string } {
  // Handle company-level routes
  if (pathname.startsWith("/company")) {
    const pathAfterCompany = pathname.replace(/^\/company\/?/, "") || "company";
    // ... existing company route logic
  }

  // Handle all other protected routes
  const pathAfterProtected = pathname.replace(/^\/(protected\/)?/, "");

  if (!pathAfterProtected || pathAfterProtected === "warehouse") {
    return { allowed: true }; // Warehouse selection page
  }

  // Get route config
  let routeConfig =
    getRouteConfig(pathAfterProtected, false) ||
    matchDynamicRoute(pathAfterProtected, false);

  if (routeConfig) {
    if (!hasPermission(routeConfig.permission, userPermissions)) {
      return {
        allowed: false,
        redirectTo: `/restricted?page=${encodeURIComponent(routeConfig.displayName)}`,
        routeName: routeConfig.displayName,
      };
    }
    return { allowed: true };
  }

  // Unknown route - allow by default
  return { allowed: true };
}
```

**Key changes**:

- Single parameter removed: `warehouseSlug` (no longer needed)
- Redirect URLs simplified: `/restricted` instead of `/warehouse/${slug}/restricted`
- Route extraction simplified: extract after `/(protected)/` instead of `/warehouse/${slug}/`

---

### 3. Update Middleware

**File**: `/src/middleware.ts`

**Changes**:

- ❌ Remove `warehouseSlug` extraction logic (lines 77-82):
  ```typescript
  // DELETE THIS:
  let warehouseSlug: string | null = null;
  const warehouseMatch = pathname.match(/^\/warehouse\/([^/]+)/);
  if (warehouseMatch) {
    warehouseSlug = warehouseMatch[1];
  }
  ```
- ❌ Remove `warehouseSlug` parameter from `checkRoutePermission()` call (line 88):

  ```typescript
  // BEFORE:
  const permissionCheck = checkRoutePermission(
    pathname,
    warehouseSlug,
    userPermissions,
  );

  // AFTER:
  const permissionCheck = checkRoutePermission(pathname, userPermissions);
  ```

**Add old URL redirect handling**:

```typescript
// RBAC: Check route permissions for authenticated users on protected routes
if (user && !isPublic) {
  // Redirect old warehouse_slug URLs to new flat structure
  if (
    pathname.startsWith("/warehouse/") &&
    !pathname.startsWith("/warehouse/")
  ) {
    const oldUrlMatch = pathname.match(/^\/warehouse\/[^/]+\/(.+)$/);
    if (oldUrlMatch) {
      const newPath = `/${oldUrlMatch[1]}`;
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = newPath;
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Get user permissions and check route access
  const userPermissions = await getUserPermissionsByAuthId(supabase, user.id);
  const permissionCheck = checkRoutePermission(pathname, userPermissions);

  // ... rest of permission checking
}
```

**Updated `isPublic` routes** (line 43-51):

```typescript
const isPublic =
  pathname === "/" ||
  pathname === "/warehouse" || // Warehouse selection page
  pathname.startsWith("/auth/") ||
  pathname.startsWith("/invite/") ||
  pathname.startsWith("/company/") || // Company routes remain as-is
  pathname === "/terms" ||
  pathname === "/privacy" ||
  pathname === "/refund-policy" ||
  pathname === "/shipping-policy";
```

---

## Phase 4: Auth Callback Update

**File**: `/src/app/(public)/auth/callback/route.ts`

**Changes**:

- ✅ Line 16: Keep `redirectTo` default as `/warehouse` (warehouse selection page)
- ✅ Line 65-66: Keep redirect to `redirectTo` for existing users
- ✅ Line 139-140: Keep redirect to `redirectTo` for new users
- ❌ No changes needed (already redirects to `/warehouse`, which is correct)

**Verification**: This file doesn't construct warehouse_slug URLs, so no updates required.

---

## Phase 5: Navigation Updates (All Page Files)

### Pattern A: Remove warehouse_slug param extraction

**In all page.tsx files** (62 files):

```typescript
// ❌ REMOVE:
const { warehouse_slug } = await params;
// or
const { warehouse_slug } = use(params);

// ✅ USE (if warehouse context needed):
const { warehouse } = useSession();
```

**Files to update**:

- All pages listed in Phase 1 (62 files)

---

### Pattern B: Update router redirects

**In all form success handlers, action buttons, delete confirmations**:

```typescript
// ❌ BEFORE:
router.push(`/warehouse/${warehouse_slug}/sales-orders`);
router.push(`/warehouse/${warehouse_slug}/sales-orders/${id}/details`);
redirect(`/warehouse/${warehouse_slug}/products/${product_number}`);

// ✅ AFTER:
router.push(`/sales-orders`);
router.push(`/sales-orders/${id}/details`);
redirect(`/products/${product_number}`);
```

**Files with redirects** (~40+ files):

- All create forms (e.g., `products/create/page.tsx`, `sales-orders/create/page.tsx`)
- All edit forms (e.g., `products/[product_number]/edit/page.tsx`)
- All delete handlers
- All detail pages with navigation actions

---

### Pattern C: Update Link components

**In all navigation components and page links**:

```typescript
// ❌ BEFORE:
<Link href={`/warehouse/${warehouse.slug}/products`}>
<Link href={`/warehouse/${warehouse_slug}/sales-orders/${id}`}>

// ✅ AFTER:
<Link href="/products">
<Link href={`/sales-orders/${id}`}>
```

---

### Pattern D: Update pathname checks

**In conditional rendering based on current route**:

```typescript
// ❌ BEFORE:
const isActive = pathname === `/warehouse/${warehouse_slug}/dashboard`;
const isProductPage = pathname.startsWith(
  `/warehouse/${warehouse_slug}/products`,
);

// ✅ AFTER:
const isActive = pathname === `/dashboard`;
const isProductPage = pathname.startsWith(`/products`);
```

---

## Phase 6: Component Updates

### 1. Bottom Navigation

**File**: `/src/components/layouts/bottom-nav.tsx`

**Update all navigation links**:

```typescript
// ❌ BEFORE:
const navItems = [
  { href: `/warehouse/${warehouse.slug}/dashboard`, ... },
  { href: `/warehouse/${warehouse.slug}/inventory`, ... },
  // ...
];

// ✅ AFTER:
const navItems = [
  { href: `/dashboard`, ... },
  { href: `/inventory`, ... },
  // ...
];
```

---

### 2. Stock Unit Details Content

**File**: `/src/components/layouts/stock-unit-details-content.tsx`

**Changes**:

- ❌ Remove `warehouse_slug` from params extraction
- ✅ Use `warehouse.id` from session context for mutations:
  ```typescript
  const { warehouse } = useSession();
  const { update } = useStockUnitMutations(); // Remove warehouseSlug param if present
  ```

---

### 3. Flow Step Components

**Files** (update imports from new paths):

- `/src/components/layouts/product-selection-step.tsx`
- `/src/components/layouts/stock-unit-scanner-step.tsx`
- `/src/components/layouts/partner-selection-step.tsx`

**If these import from warehouse_slug paths, update to new flat paths.**

---

## Phase 7: Mutation Hooks Review

### Check all mutation hooks for warehouse_slug parameters

**Files to review**: `/src/lib/query/hooks/*.ts`

**Pattern to find**:

```typescript
// If you find:
export function useSomeMutations(warehouseSlug: string) {
  // ...
}

// Change to:
export function useSomeMutations() {
  const { warehouse } = useSession();
  // Use warehouse.id where needed
}
```

**Known hooks to check**:

- `useStockUnitMutations` (if it has warehouseSlug param)
- Any other domain hooks with warehouse parameters

---

## Phase 8: Testing & Validation Checklist

### Authentication Flow

- [ ] Fresh login → redirects to `/warehouse` if no user.warehouse_id
- [ ] Fresh login → redirects to `/inventory` if user.warehouse_id exists
- [ ] Existing user login → redirects to intended destination

### Warehouse Switching

- [ ] Select warehouse from selector → user.warehouse_id updates
- [ ] Page stays the same (e.g., `/sales-orders`)
- [ ] Data refetches automatically for new warehouse
- [ ] Session context updates with new warehouse object
- [ ] All components re-render with new warehouse data

### Navigation

- [ ] All navigation links work without warehouse_slug
- [ ] Bottom nav links work
- [ ] Sidebar links work (if applicable)
- [ ] Breadcrumb navigation works

### Forms & Redirects

- [ ] Create forms redirect correctly after submission
- [ ] Edit forms redirect correctly after save
- [ ] Delete actions redirect correctly
- [ ] Cancel buttons navigate back correctly

### Permissions

- [ ] Permission-based route blocking works
- [ ] Redirects to `/restricted` page correctly
- [ ] Restricted page displays correct "page" query param

### Old URL Handling

- [ ] Old URLs `/warehouse/slug-name/dashboard` redirect to `/dashboard`
- [ ] Old bookmarks redirect to new structure
- [ ] Query params preserved during redirect

### Multi-tab Behavior

- [ ] Switching warehouse in one tab (consider adding notification in other tabs)
- [ ] Data consistency across tabs

### Edge Cases

- [ ] User with no warehouse assigned → `/warehouse` selection page
- [ ] User with invalid warehouse_id → error handling
- [ ] Warehouse deleted while user is active → error handling
- [ ] Direct URL access to protected routes → permission check works

---

## Phase 9: Documentation Updates

### Update project documentation

**Files to update**:

1. **`REQUIREMENTS.md`**:
   - Update route structure from `/warehouse/[warehouse_slug]/*` to flat structure
   - Update navigation examples
   - Update permission documentation

2. **`CLAUDE.md`**:
   - Update development guidelines
   - Update URL structure examples
   - Update routing patterns

3. **`ACCOUNTING_REQUIREMENTS.md`** (if applicable):
   - Update route examples for accounting module

---

## Implementation Order (Recommended)

### Step 1: Infrastructure (Core files first)

1. Remove warehouse-by-slug queries (`warehouses.ts`, hooks, keys)
2. Update protected layout to use only `useWarehouseById`
3. Update warehouse selector to remove router.push
4. Test: Verify warehouse switching works without URL changes

### Step 2: Permission System

1. Update route config comments
2. Update `checkRoutePermission()` function
3. Update middleware (remove warehouseSlug extraction + add redirects)
4. Test: Verify old URLs redirect correctly

### Step 3: File Structure

1. Move all 62 page files from `warehouse/[warehouse_slug]/` to flat structure
2. Delete empty warehouse folders
3. Test: Verify all routes are accessible

### Step 4: Navigation Updates

1. Update all page files (remove warehouse_slug param extraction)
2. Update all router.push/redirect calls
3. Update all Link components
4. Update bottom navigation
5. Test: Verify all navigation works

### Step 5: Component Updates

1. Update stock unit details component
2. Update flow step components
3. Review and update mutation hooks
4. Test: Verify all forms and mutations work

### Step 6: Final Testing

1. Run through full testing checklist
2. Test on multiple browsers
3. Test multi-tab scenarios
4. Test edge cases

### Step 7: Documentation

1. Update REQUIREMENTS.md
2. Update CLAUDE.md
3. Update other relevant docs

---

## Critical Considerations & Risks

### ⚠️ Breaking Changes

- **All existing bookmarks** with `/warehouse/[slug]/...` will redirect to new structure
- Users may experience brief confusion during warehouse switching (no URL change)
- External links to old URLs will redirect (handled by middleware)

### ⚠️ Session Consistency

- Warehouse context updates only after protected layout refetches
- May need `router.refresh()` in warehouse selector if auto-refetch doesn't trigger
- Consider adding loading state during warehouse switch

### ⚠️ Multi-tab Behavior

- Switching warehouse in one tab won't auto-update other tabs
- Consider:
  - Adding event listeners (BroadcastChannel API)
  - Periodic refetching in background
  - Banner notification when warehouse changed in another tab

### ⚠️ Performance

- Every page render depends on session context
- Ensure TanStack Query caching is optimal
- Monitor query invalidation patterns

### ⚠️ Database Schema

- **No changes needed** to database (keeping warehouse.slug field for future use)
- **No changes needed** to warehouse_id foreign keys
- RLS policies remain unchanged

---

## Rollback Plan

If issues arise, rollback steps:

1. Revert git to commit before changes
2. Alternatively, create feature branch for new structure
3. Deploy old structure while debugging new one
4. Add feature flag to toggle between old/new routing (advanced)

---

## Estimated Effort

- **High-risk changes**: 10 files (core infrastructure, permissions, middleware)
- **Medium-risk changes**: 62 files (all page files - mostly mechanical updates)
- **Low-risk changes**: 40+ files (navigation updates - find/replace patterns)
- **Total files to modify**: ~110 files
- **Estimated time**:
  - Infrastructure & permissions: 2-3 hours
  - File structure reorganization: 1-2 hours
  - Navigation updates (mechanical): 2-4 hours
  - Testing & validation: 2-3 hours
  - Documentation: 1 hour
  - **Total: 8-13 hours** (spread over 2-3 sessions)

---

## Success Criteria

✅ All routes accessible without warehouse_slug in URL
✅ Single source of truth: user.warehouse_id from database
✅ Warehouse switching works seamlessly (stay on page, data refetches)
✅ Permission system works correctly
✅ Old URLs redirect to new structure
✅ No broken links or navigation issues
✅ All forms and mutations work
✅ Session context provides warehouse to all components
✅ Documentation updated
✅ All tests pass

---

## Notes

- This is a **major architectural refactor** but architecturally sound
- Single source of truth eliminates confusion and simplifies codebase
- Flat route structure is more intuitive and cleaner
- Permission checking becomes simpler without warehouse_slug extraction
- Session context pattern (warehouse from DB) is standard practice
- Consider this a one-time breaking change for long-term maintainability
