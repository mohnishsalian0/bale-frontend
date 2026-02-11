# Product Detail Page Redesign Plan

## Overview

This plan covers the full redesign of the product detail page at:
`src/app/(protected)/warehouse/[warehouse_slug]/products/[product_number]/`

### Goals

1. Redesign the layout header (remove info cards, compact attributes, move GlowIndicator, add status badges, show available qty)
2. Restructure tabs: `summary → overview`, delete `stock-flow`, add `activity` and `orders`
3. Add a DB RPC function for product-level activity feed (UNION ALL across all movement tables)
4. Create the Activity tab page (with type filter pills)
5. Create the Orders tab page (Sales / Purchase sub-filter)

---

## Step 1: Database Migration — `0071_product_activity_function.sql`

**File to create:** `supabase/migrations/0071_product_activity_function.sql`

This RPC aggregates all movement events for a product in a warehouse into a single paginated feed, modeled after `0042_stock_unit_activity.sql`.

### Full SQL

```sql
-- Bale Backend - Product Activity Function
-- Track complete activity history for a product within a warehouse

-- =====================================================
-- PRODUCT ACTIVITY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_product_activity(
    p_product_id  UUID,
    p_warehouse_id UUID,
    p_type_filter TEXT    DEFAULT 'all',   -- 'all'|'inward'|'outward'|'transfer_out'|'transfer_in'|'convert_in'|'convert_out'
    p_limit       INTEGER DEFAULT 20,
    p_offset      INTEGER DEFAULT 0
)
RETURNS TABLE (
    event_id          UUID,
    event_type        TEXT,
    event_date        DATE,
    reference_number  TEXT,
    reference_id      UUID,
    counterparty_name TEXT,
    quantity          NUMERIC,
    status            TEXT,
    total_count       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH all_events AS (
        -- 1. INWARD: Product came in from a partner/vendor via goods inward
        SELECT
            gi.id                                                               AS event_id,
            'inward'::TEXT                                                      AS event_type,
            gi.inward_date                                                      AS event_date,
            'GI-' || gi.sequence_number::TEXT                                  AS reference_number,
            gi.id                                                               AS reference_id,
            COALESCE(p.company_name, p.first_name || ' ' || p.last_name)       AS counterparty_name,
            SUM(su.initial_quantity)                                            AS quantity,
            'completed'::TEXT                                                   AS status
        FROM goods_inwards gi
        JOIN stock_units su ON su.origin_inward_id = gi.id
        LEFT JOIN partners p ON gi.partner_id = p.id
        WHERE su.product_id          = p_product_id
          AND gi.warehouse_id        = p_warehouse_id
          AND su.deleted_at          IS NULL
        GROUP BY gi.id, gi.sequence_number, gi.inward_date,
                 p.company_name, p.first_name, p.last_name

        UNION ALL

        -- 2. OUTWARD: Product dispatched to customer/partner via goods outward
        SELECT
            go.id                                                               AS event_id,
            'outward'::TEXT                                                     AS event_type,
            go.outward_date                                                     AS event_date,
            'GO-' || go.sequence_number::TEXT                                  AS reference_number,
            go.id                                                               AS reference_id,
            COALESCE(p.company_name, p.first_name || ' ' || p.last_name)       AS counterparty_name,
            SUM(goi.quantity_dispatched)                                        AS quantity,
            CASE WHEN go.is_cancelled THEN 'cancelled' ELSE 'completed' END    AS status
        FROM goods_outwards go
        JOIN goods_outward_items goi ON goi.outward_id   = go.id
        JOIN stock_units su          ON goi.stock_unit_id = su.id
        LEFT JOIN partners p         ON go.partner_id    = p.id
        WHERE su.product_id          = p_product_id
          AND go.warehouse_id        = p_warehouse_id
          AND goi.is_cancelled       = FALSE
        GROUP BY go.id, go.sequence_number, go.outward_date, go.is_cancelled,
                 p.company_name, p.first_name, p.last_name

        UNION ALL

        -- 3. TRANSFER OUT: Product sent FROM this warehouse to another
        SELECT
            gt.id                                                               AS event_id,
            'transfer_out'::TEXT                                                AS event_type,
            gt.transfer_date                                                    AS event_date,
            'GT-' || gt.sequence_number::TEXT                                  AS reference_number,
            gt.id                                                               AS reference_id,
            w_to.name                                                           AS counterparty_name,
            SUM(gti.quantity_transferred)                                       AS quantity,
            gt.status::TEXT                                                     AS status
        FROM goods_transfers gt
        JOIN goods_transfer_items gti ON gti.transfer_id   = gt.id
        JOIN stock_units su           ON gti.stock_unit_id = su.id
        JOIN warehouses w_to          ON gt.to_warehouse_id = w_to.id
        WHERE su.product_id           = p_product_id
          AND gt.from_warehouse_id    = p_warehouse_id
        GROUP BY gt.id, gt.sequence_number, gt.transfer_date, gt.status, w_to.name

        UNION ALL

        -- 4. TRANSFER IN: Product received INTO this warehouse from another
        SELECT
            gt.id                                                               AS event_id,
            'transfer_in'::TEXT                                                 AS event_type,
            gt.transfer_date                                                    AS event_date,
            'GT-' || gt.sequence_number::TEXT                                  AS reference_number,
            gt.id                                                               AS reference_id,
            w_from.name                                                         AS counterparty_name,
            SUM(gti.quantity_transferred)                                       AS quantity,
            gt.status::TEXT                                                     AS status
        FROM goods_transfers gt
        JOIN goods_transfer_items gti ON gti.transfer_id     = gt.id
        JOIN stock_units su           ON gti.stock_unit_id   = su.id
        JOIN warehouses w_from        ON gt.from_warehouse_id = w_from.id
        WHERE su.product_id           = p_product_id
          AND gt.to_warehouse_id      = p_warehouse_id
        GROUP BY gt.id, gt.sequence_number, gt.transfer_date, gt.status, w_from.name

        UNION ALL

        -- 5. CONVERT IN: Product was produced as OUTPUT of a goods convert
        SELECT
            gc.id                                                               AS event_id,
            'convert_in'::TEXT                                                  AS event_type,
            COALESCE(gc.completion_date, gc.start_date)                        AS event_date,
            'GC-' || gc.sequence_number::TEXT                                  AS reference_number,
            gc.id                                                               AS reference_id,
            COALESCE(v.company_name, v.first_name || ' ' || v.last_name)       AS counterparty_name,
            SUM(su.initial_quantity)                                            AS quantity,
            gc.status::TEXT                                                     AS status
        FROM goods_converts gc
        JOIN stock_units su  ON su.origin_convert_id = gc.id
        LEFT JOIN partners v ON gc.vendor_id         = v.id
        WHERE su.product_id  = p_product_id
          AND gc.warehouse_id = p_warehouse_id
          AND su.deleted_at   IS NULL
        GROUP BY gc.id, gc.sequence_number, gc.completion_date, gc.start_date,
                 gc.status, v.company_name, v.first_name, v.last_name

        UNION ALL

        -- 6. CONVERT OUT: Product used as INPUT into a goods convert
        SELECT
            gc.id                                                               AS event_id,
            'convert_out'::TEXT                                                 AS event_type,
            gc.start_date                                                       AS event_date,
            'GC-' || gc.sequence_number::TEXT                                  AS reference_number,
            gc.id                                                               AS reference_id,
            COALESCE(v.company_name, v.first_name || ' ' || v.last_name)       AS counterparty_name,
            SUM(gci.quantity_consumed)                                          AS quantity,
            gc.status::TEXT                                                     AS status
        FROM goods_converts gc
        JOIN goods_convert_input_items gci ON gci.convert_id   = gc.id
        JOIN stock_units su                ON gci.stock_unit_id = su.id
        LEFT JOIN partners v               ON gc.vendor_id      = v.id
        WHERE su.product_id                = p_product_id
          AND gc.warehouse_id              = p_warehouse_id
        GROUP BY gc.id, gc.sequence_number, gc.start_date, gc.status,
                 v.company_name, v.first_name, v.last_name
    ),
    filtered_events AS (
        SELECT *
        FROM all_events
        WHERE p_type_filter = 'all' OR event_type = p_type_filter
    )
    SELECT
        fe.event_id,
        fe.event_type,
        fe.event_date,
        fe.reference_number,
        fe.reference_id,
        fe.counterparty_name,
        fe.quantity,
        fe.status,
        COUNT(*) OVER()::BIGINT AS total_count
    FROM filtered_events fe
    ORDER BY fe.event_date DESC, fe.reference_number DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_product_activity(UUID, UUID, TEXT, INTEGER, INTEGER) TO authenticated;
```

### Notes

- Groups stock units by their parent event (GI, GO, GT, GC) to avoid duplicate rows per stock unit.
- `COUNT(*) OVER()` returns the total unfiltered count for pagination without a second query.
- `SECURITY DEFINER` — RLS on tables still applies via the caller's JWT; this is consistent with other RPCs in the codebase.
- Run `npx supabase db reset` then `npm run db:types` after adding this migration.

---

## Step 2: TypeScript Types

**File to create:** `src/types/product-activity.types.ts`

```typescript
// ============================================================================
// PRODUCT ACTIVITY TYPES
// ============================================================================

export type ProductActivityEventType =
  | "inward"
  | "outward"
  | "transfer_out"
  | "transfer_in"
  | "convert_in"
  | "convert_out";

/**
 * A single activity event for a product in a warehouse.
 * Returned by the get_product_activity RPC.
 * Used in: products/[product_number]/activity page
 */
export interface ProductActivityEvent {
  event_id: string;
  event_type: ProductActivityEventType;
  event_date: string; // DATE as ISO string
  reference_number: string; // e.g. "GI-42", "GO-7", "GT-3", "GC-11"
  reference_id: string; // UUID of the parent document
  counterparty_name: string | null;
  quantity: number;
  status: string;
  total_count: number; // window count for pagination
}

export type ProductActivityTypeFilter = "all" | ProductActivityEventType;
```

---

## Step 3: Query Builder + Query Function

**File to create:** `src/lib/queries/product-activity.ts`

```typescript
import { createClient } from "@/lib/supabase/browser";
import type {
  ProductActivityEvent,
  ProductActivityTypeFilter,
} from "@/types/product-activity.types";

/**
 * Fetch paginated activity events for a product in a warehouse.
 * Calls the get_product_activity RPC (0071 migration).
 *
 * Event types: inward | outward | transfer_out | transfer_in | convert_in | convert_out
 */
export async function getProductActivity(
  productId: string,
  warehouseId: string,
  typeFilter: ProductActivityTypeFilter = "all",
  page: number = 1,
  pageSize: number = 20,
): Promise<{ data: ProductActivityEvent[]; totalCount: number }> {
  const supabase = createClient();

  const offset = (page - 1) * pageSize;

  const { data, error } = await supabase.rpc("get_product_activity", {
    p_product_id: productId,
    p_warehouse_id: warehouseId,
    p_type_filter: typeFilter,
    p_limit: pageSize,
    p_offset: offset,
  });

  if (error) throw error;

  const rows = (data as ProductActivityEvent[]) || [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;

  return { data: rows, totalCount };
}
```

---

## Step 4: TanStack Query Hook

**File to create:** `src/lib/query/hooks/product-activity.ts`

```typescript
"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getProductActivity,
  type ProductActivityTypeFilter,
} from "@/lib/queries/product-activity";

/**
 * Fetch activity events for a product in a warehouse.
 * Uses pagination and type filtering.
 */
export function useProductActivity(
  productId: string | null | undefined,
  warehouseId: string,
  typeFilter: ProductActivityTypeFilter = "all",
  page: number = 1,
  pageSize: number = 20,
) {
  return useQuery({
    queryKey: queryKeys.productActivity.byProduct(
      productId ?? "",
      warehouseId,
      typeFilter,
      page,
    ),
    queryFn: () =>
      getProductActivity(productId!, warehouseId, typeFilter, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled: !!productId && !!warehouseId,
  });
}
```

---

## Step 5: Add Query Key

**File to modify:** `src/lib/query/keys.ts`

Add the following entry inside the `queryKeys` object, after `stockFlow`:

```typescript
// Product Activity (product-level movement feed)
productActivity: {
  byProduct: (
    productId: string,
    warehouseId: string,
    typeFilter?: string,
    page?: number,
  ) =>
    ["product-activity", productId, warehouseId, typeFilter, page] as const,
},
```

---

## Step 6: Layout Header Redesign

**File to modify:** `src/app/(protected)/warehouse/[warehouse_slug]/products/[product_number]/layout.tsx`

### What changes

1. **Remove** both info cards (`Total stock in inventory` and `Order request quantity`).
2. **Move GlowIndicator** from the right side (inside the flex row) to the **left**, as a small indicator positioned above/beside the product image.
3. **Replace attribute badges** with a dot-separated text string below the product name:
   `PROD-{sequence} • Material1, Material2 • Color1 • Tag1`
   Use the existing `getProductInfo()` utility which already does `product_code • materials • colors`.
   Since we want product code too, build it as:
   ```
   PROD-{sequence_number} • {materials joined by comma} • {colors joined by comma}
   ```
   (Tags are secondary — keep them out of the compact view for now, or show as a third dot-section.)
4. **Add status badges** on a new line below the compact attributes row. Show only if non-zero:
   - `Order: X mtr` — `color="blue"` — from `product.sales_orders?.active_pending_quantity`
   - `Purchase: X mtr` — `color="green"` — from `product.purchase_orders?.active_pending_quantity`
   - `QR: X` — `color="gray"` — from `product.inventory.pending_qr_units`
   - `In transit: X mtr` — `color="amber"` — from `product.inventory.in_transit_quantity`
   - `Processing: X mtr` — `color="purple"` — from `product.inventory.processing_quantity`
5. **Show available quantity** on the right side of the header row (similar to inventory page):
   ```tsx
   <div className="flex flex-col items-end shrink-0">
     {lowStock && <IconAlertTriangle className="size-4 text-yellow-700" />}
     <p
       className={`text-sm font-semibold ${lowStock ? "text-yellow-700" : "text-gray-700"}`}
     >
       {getAvailableStockText(product)}
     </p>
     <p className="text-xs text-gray-500">available</p>
   </div>
   ```
6. **Update tabs** — rename and add:
   ```tsx
   tabs={[
     { value: "overview", label: "Overview" },
     { value: "stock-units", label: "Stock units" },
     { value: "activity", label: "Activity" },
     { value: "orders", label: "Orders" },
   ]}
   ```
7. **Update `getActiveTab()`** function:
   ```typescript
   const getActiveTab = () => {
     if (pathname.endsWith("/overview")) return "overview";
     if (pathname.endsWith("/stock-units")) return "stock-units";
     if (pathname.endsWith("/activity")) return "activity";
     if (pathname.endsWith("/orders")) return "orders";
     return "overview"; // default
   };
   ```

### Resulting header structure (pseudo-JSX)

```tsx
<div className="p-4 pb-2">
  <div className="flex items-start gap-3">
    {/* Catalog live indicator — LEFT of image */}
    <GlowIndicator size="sm" isActive={product.show_on_catalog || false} className="mt-1 shrink-0" />

    {/* Product Image */}
    <ImageWrapper size="xl" shape="square" ... />

    {/* Middle: name + compact info + badges */}
    <div className="flex-1 min-w-0">
      <h1 className="text-xl font-bold text-gray-900 truncate">{product.name}</h1>
      <p className="text-sm text-gray-500 truncate mt-0.5">
        PROD-{product.sequence_number}
        {product.materials?.length ? ` • ${product.materials.map(m => m.name).join(", ")}` : ""}
        {product.colors?.length    ? ` • ${product.colors.map(c => c.name).join(", ")}` : ""}
      </p>
      {/* Status badges — show only if > 0 */}
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {orderRequest > 0    && <Badge color="blue">Order: {orderRequest} {unitAbbr}</Badge>}
        {purchasePending > 0 && <Badge color="green">Purchase: {purchasePending} {unitAbbr}</Badge>}
        {qrPending > 0       && <Badge color="gray">QR: {qrPending}</Badge>}
        {inTransit > 0       && <Badge color="amber">In transit: {inTransit} {unitAbbr}</Badge>}
        {processing > 0      && <Badge color="purple">Processing: {processing} {unitAbbr}</Badge>}
      </div>
    </div>

    {/* Right: available quantity */}
    <div className="flex flex-col items-end shrink-0">
      {lowStock && <IconAlertTriangle className="size-4 text-yellow-700" />}
      <p className={`text-sm font-semibold ${lowStock ? "text-yellow-700" : "text-gray-700"}`}>
        {getAvailableStockText(product)}
      </p>
      <p className="text-xs text-gray-500">available</p>
    </div>
  </div>
</div>
```

**Derived values to compute from `product` before the JSX:**

```typescript
const unitAbbr = getMeasuringUnitAbbreviation(
  product.measuring_unit as MeasuringUnit,
);
const orderRequest = product.sales_orders?.active_pending_quantity ?? 0;
const purchasePending = product.purchase_orders?.active_pending_quantity ?? 0;
const qrPending = product.inventory.pending_qr_units ?? 0;
const inTransit = product.inventory.in_transit_quantity ?? 0;
const processing = product.inventory.processing_quantity ?? 0;
const lowStock =
  product.min_stock_alert &&
  (product.min_stock_threshold ?? 0) >=
    (product.inventory.available_quantity ?? 0);
```

**Imports to add/remove in layout.tsx:**

- Add: `IconAlertTriangle` from `@tabler/icons-react`
- Add: `getMeasuringUnitAbbreviation` from `@/lib/utils/measuring-units`
- Add: `getAvailableStockText` from `@/lib/utils/product`
- Remove: `IconBuildingWarehouse`
- Remove: `formatCurrency` (no longer needed for cards)
- Remove: `IconStore` import

---

## Step 7: File Structure Changes

### Files to CREATE (new directories/pages)

```
src/app/(protected)/warehouse/[warehouse_slug]/products/[product_number]/
  ├── overview/
  │   └── page.tsx          ← COPY content from summary/page.tsx (rename tab reference only)
  ├── activity/
  │   └── page.tsx          ← NEW (see Step 8)
  └── orders/
      └── page.tsx          ← NEW (see Step 9)
```

### Files to DELETE

```
src/app/(protected)/warehouse/[warehouse_slug]/products/[product_number]/
  ├── summary/              ← DELETE entire directory (replaced by overview/)
  │   └── page.tsx
  └── stock-flow/           ← DELETE entire directory (replaced by activity/)
      └── page.tsx
```

> **Important:** After deleting `summary/`, update `layout.tsx` default tab from `"summary"` to `"overview"`.
> The navigation links from outside this page (if any exist) that point to `.../summary` also need updating — do a global search for `/summary` to confirm.

---

## Step 8: Activity Tab Page

**File to create:** `src/app/(protected)/warehouse/[warehouse_slug]/products/[product_number]/activity/page.tsx`

```tsx
"use client";

import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconBox,
  IconArrowDown,
  IconArrowUp,
  IconArrowsLeftRight,
  IconTransform,
} from "@tabler/icons-react";
import { TabPills } from "@/components/ui/tab-pills";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Badge } from "@/components/ui/badge";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { useSession } from "@/contexts/session-context";
import { useProductWithInventoryAndOrdersByNumber } from "@/lib/query/hooks/products";
import { useProductActivity } from "@/lib/query/hooks/product-activity";
import type { MeasuringUnit } from "@/types/database/enums";
import type { ProductActivityTypeFilter } from "@/types/product-activity.types";

interface PageParams {
  params: Promise<{ warehouse_slug: string; product_number: string }>;
}

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "inward", label: "Inward" },
  { value: "outward", label: "Outward" },
  { value: "transfer_out", label: "Transfer out" },
  { value: "transfer_in", label: "Transfer in" },
  { value: "convert_in", label: "Convert in" },
  { value: "convert_out", label: "Convert out" },
];

// Visual config per event type
const EVENT_CONFIG: Record<
  string,
  {
    label: string;
    badgeColor: "blue" | "teal" | "amber" | "purple" | "gray";
    quantityLabel: string;
    isPositive: boolean;
  }
> = {
  inward: {
    label: "Inward",
    badgeColor: "blue",
    quantityLabel: "In",
    isPositive: true,
  },
  outward: {
    label: "Outward",
    badgeColor: "teal",
    quantityLabel: "Out",
    isPositive: false,
  },
  transfer_out: {
    label: "Transfer out",
    badgeColor: "amber",
    quantityLabel: "Sent",
    isPositive: false,
  },
  transfer_in: {
    label: "Transfer in",
    badgeColor: "amber",
    quantityLabel: "Received",
    isPositive: true,
  },
  convert_in: {
    label: "Convert in",
    badgeColor: "purple",
    quantityLabel: "Produced",
    isPositive: true,
  },
  convert_out: {
    label: "Convert out",
    badgeColor: "purple",
    quantityLabel: "Used",
    isPositive: false,
  },
};

// Navigation paths per event type
function getEventPath(
  warehouseSlug: string,
  eventType: string,
  referenceNumber: string,
): string {
  // reference_number format: "GI-42", "GO-7", "GT-3", "GC-11"
  const seqNum = referenceNumber.split("-")[1];
  switch (eventType) {
    case "inward":
      return `/warehouse/${warehouseSlug}/goods-inward/${seqNum}`;
    case "outward":
      return `/warehouse/${warehouseSlug}/goods-outward/${seqNum}`;
    case "transfer_out":
    case "transfer_in":
      return `/warehouse/${warehouseSlug}/goods-transfer/${seqNum}`;
    case "convert_in":
    case "convert_out":
      return `/warehouse/${warehouseSlug}/goods-convert/${seqNum}`;
    default:
      return "#";
  }
}

export default function ActivityPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { product_number, warehouse_slug } = use(params);
  const { warehouse } = useSession();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const selectedFilter = (searchParams.get("filter") ||
    "all") as ProductActivityTypeFilter;
  const PAGE_SIZE = 20;

  // Product from cache (fetched by layout)
  const { data: product } = useProductWithInventoryAndOrdersByNumber(
    product_number,
    warehouse.id,
  );

  const { data, isLoading, isError, refetch } = useProductActivity(
    product?.id,
    warehouse.id,
    selectedFilter,
    currentPage,
    PAGE_SIZE,
  );

  const events = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const unitAbbr = product
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "";

  const handleFilterChange = (filter: string) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/activity?filter=${filter}&page=1`,
    );
  };

  const handlePageChange = (page: number) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/activity?filter=${selectedFilter}&page=${page}`,
    );
  };

  if (isLoading) return <LoadingState message="Loading activity..." />;
  if (isError)
    return (
      <ErrorState
        title="Failed to load activity"
        message="Unable to fetch product activity"
        onRetry={refetch}
      />
    );

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <IconBox className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No activity</h3>
        <p className="text-sm text-gray-500 text-center">
          No {selectedFilter === "all" ? "" : selectedFilter} activity found for
          this product
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Filter Pills */}
      <div className="flex gap-4 px-4 py-4 overflow-x-auto scrollbar-hide">
        <TabPills
          options={TYPE_FILTER_OPTIONS}
          value={selectedFilter}
          onValueChange={handleFilterChange}
        />
      </div>

      {/* Event List */}
      <div className="flex flex-col">
        {events.map((event) => {
          const config = EVENT_CONFIG[event.event_type];
          const path = getEventPath(
            warehouse_slug,
            event.event_type,
            event.reference_number,
          );

          return (
            <button
              key={`${event.event_type}-${event.event_id}`}
              onClick={() => router.push(path)}
              className="flex items-center gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-base font-medium text-gray-700 truncate">
                    {event.counterparty_name || "—"}
                  </p>
                  <Badge color={config.badgeColor} className="shrink-0">
                    {config.label}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {event.reference_number}
                  <span> &nbsp;•&nbsp; </span>
                  {formatAbsoluteDate(event.event_date)}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p
                  className={`text-sm font-semibold ${
                    config.isPositive ? "text-yellow-700" : "text-teal-700"
                  }`}
                >
                  {event.quantity.toFixed(2)} {unitAbbr}
                </p>
                <p className="text-xs text-gray-500">{config.quantityLabel}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationWrapper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
```

---

## Step 9: Orders Tab Page

**File to create:** `src/app/(protected)/warehouse/[warehouse_slug]/products/[product_number]/orders/page.tsx`

Uses existing `useSalesOrders` and `usePurchaseOrders` hooks with `productId` filter. The filter toggling between sales/purchase is done via a URL param `?type=sales` (default) or `?type=purchase`.

```tsx
"use client";

import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import { TabPills } from "@/components/ui/tab-pills";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Badge } from "@/components/ui/badge";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/financial";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { useSession } from "@/contexts/session-context";
import { useProductWithInventoryAndOrdersByNumber } from "@/lib/query/hooks/products";
import { useSalesOrders } from "@/lib/query/hooks/sales-orders";
import { usePurchaseOrders } from "@/lib/query/hooks/purchase-orders";
import type { MeasuringUnit } from "@/types/database/enums";

interface PageParams {
  params: Promise<{ warehouse_slug: string; product_number: string }>;
}

const ORDER_TYPE_OPTIONS = [
  { value: "sales", label: "Sales orders" },
  { value: "purchase", label: "Purchase orders" },
];

// Status badge color mapping for sales orders
const SALES_STATUS_COLOR: Record<string, "blue" | "teal" | "gray" | "red"> = {
  approval_pending: "blue",
  in_progress: "teal",
  completed: "gray",
  cancelled: "red",
};

// Status badge color mapping for purchase orders
const PURCHASE_STATUS_COLOR: Record<string, "blue" | "teal" | "gray" | "red"> =
  {
    approval_pending: "blue",
    in_progress: "teal",
    completed: "gray",
    cancelled: "red",
  };

export default function OrdersPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { product_number, warehouse_slug } = use(params);
  const { warehouse } = useSession();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const orderType = (searchParams.get("type") || "sales") as
    | "sales"
    | "purchase";
  const PAGE_SIZE = 20;

  const isSalesView = orderType === "sales";

  // Product from cache
  const { data: product } = useProductWithInventoryAndOrdersByNumber(
    product_number,
    warehouse.id,
  );

  // Sales orders filtered by this product
  const {
    data: salesResponse,
    isLoading: salesLoading,
    isError: salesError,
    refetch: refetchSales,
  } = useSalesOrders({
    filters: { productId: product?.id, warehouseId: warehouse.id },
    page: isSalesView ? currentPage : 1,
    pageSize: PAGE_SIZE,
    enabled: isSalesView && !!product?.id,
  });

  // Purchase orders filtered by this product
  const {
    data: purchaseResponse,
    isLoading: purchaseLoading,
    isError: purchaseError,
    refetch: refetchPurchase,
  } = usePurchaseOrders({
    filters: { productId: product?.id, warehouseId: warehouse.id },
    page: !isSalesView ? currentPage : 1,
    pageSize: PAGE_SIZE,
    enabled: !isSalesView && !!product?.id,
  });

  const loading = isSalesView ? salesLoading : purchaseLoading;
  const isError = isSalesView ? salesError : purchaseError;
  const refetch = isSalesView ? refetchSales : refetchPurchase;
  const totalCount = isSalesView
    ? salesResponse?.totalCount || 0
    : purchaseResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const unitAbbr = product
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "";

  const handleTypeChange = (type: string) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/orders?type=${type}&page=1`,
    );
  };

  const handlePageChange = (page: number) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/orders?type=${orderType}&page=${page}`,
    );
  };

  if (loading) return <LoadingState message="Loading orders..." />;
  if (isError)
    return (
      <ErrorState
        title="Failed to load orders"
        message="Unable to fetch orders for this product"
        onRetry={refetch}
      />
    );

  const salesOrders = salesResponse?.data || [];
  const purchaseOrders = purchaseResponse?.data || [];
  const orders = isSalesView ? salesOrders : purchaseOrders;

  return (
    <div className="flex flex-col flex-1">
      {/* Filter Pills */}
      <div className="flex gap-4 px-4 py-4">
        <TabPills
          options={ORDER_TYPE_OPTIONS}
          value={orderType}
          onValueChange={handleTypeChange}
        />
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <IconBox className="size-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No orders</h3>
          <p className="text-sm text-gray-500 text-center">
            No {isSalesView ? "sales" : "purchase"} orders found for this
            product
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col">
            {isSalesView
              ? salesOrders.map((order) => {
                  // Find the line item for this product
                  const item = order.sales_order_items.find(
                    (i) => i.product?.id === product?.id,
                  );
                  const statusColor =
                    SALES_STATUS_COLOR[order.status] || "gray";
                  const customerName =
                    order.customer?.display_name ||
                    order.customer?.company_name ||
                    [order.customer?.first_name, order.customer?.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    "—";

                  return (
                    <button
                      key={order.id}
                      onClick={() =>
                        router.push(
                          `/warehouse/${warehouse_slug}/sales-orders/${order.sequence_number}`,
                        )
                      }
                      className="flex items-center gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-medium text-gray-700 truncate">
                            {customerName}
                          </p>
                          <Badge
                            color={statusColor}
                            className="shrink-0 capitalize"
                          >
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          SO-{order.sequence_number}
                          <span> &nbsp;•&nbsp; </span>
                          {formatAbsoluteDate(order.order_date)}
                        </p>
                      </div>
                      {item && (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-gray-700">
                            {item.required_quantity} {unitAbbr}
                          </p>
                          <p className="text-xs text-gray-500">
                            ₹{formatCurrency(item.unit_rate || 0)}/{unitAbbr}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })
              : purchaseOrders.map((order) => {
                  const item = order.purchase_order_items.find(
                    (i) => i.product?.id === product?.id,
                  );
                  const statusColor =
                    PURCHASE_STATUS_COLOR[order.status] || "gray";
                  const supplierName =
                    order.supplier?.display_name ||
                    order.supplier?.company_name ||
                    [order.supplier?.first_name, order.supplier?.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    "—";

                  return (
                    <button
                      key={order.id}
                      onClick={() =>
                        router.push(
                          `/warehouse/${warehouse_slug}/purchase-orders/${order.sequence_number}`,
                        )
                      }
                      className="flex items-center gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-medium text-gray-700 truncate">
                            {supplierName}
                          </p>
                          <Badge
                            color={statusColor}
                            className="shrink-0 capitalize"
                          >
                            {order.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          PO-{order.sequence_number}
                          <span> &nbsp;•&nbsp; </span>
                          {formatAbsoluteDate(order.order_date)}
                        </p>
                      </div>
                      {item && (
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-gray-700">
                            {item.required_quantity} {unitAbbr}
                          </p>
                          <p className="text-xs text-gray-500">
                            ₹{formatCurrency(item.unit_rate || 0)}/{unitAbbr}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
          </div>

          {totalPages > 1 && (
            <PaginationWrapper
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
```

**Note:** `usePurchaseOrders` hook signature — check `src/lib/query/hooks/purchase-orders.ts`.
If it doesn't have the same object-param signature as `useSalesOrders`, align them. The call pattern should match `useSalesOrders({ filters, page, pageSize, enabled })`.

---

## Step 10: Overview Page (rename from summary)

**Action:** Copy `summary/page.tsx` to a new `overview/` directory, keeping content identical. The only change needed is the file location. No code changes inside the page are required since it reads product data from TanStack Query cache.

```bash
# In project root
mkdir -p src/app/\(protected\)/warehouse/\[warehouse_slug\]/products/\[product_number\]/overview
cp src/app/\(protected\)/warehouse/\[warehouse_slug\]/products/\[product_number\]/summary/page.tsx \
   src/app/\(protected\)/warehouse/\[warehouse_slug\]/products/\[product_number\]/overview/page.tsx
```

Then delete `summary/` directory once `overview/` is working.

---

## Step 11: Verify `usePurchaseOrders` Hook

**File to check:** `src/lib/query/hooks/purchase-orders.ts`

Ensure the hook exists and accepts `{ filters, page, pageSize, enabled }` similar to `useSalesOrders`. If not, add it following the same pattern.

---

## Implementation Checklist

Run these in order:

- [ ] 1. Create `supabase/migrations/0071_product_activity_function.sql`
- [ ] 2. Run `npx supabase db reset` to apply the migration
- [ ] 3. Run `npm run db:types` to regenerate TypeScript types
- [ ] 4. Create `src/types/product-activity.types.ts`
- [ ] 5. Create `src/lib/queries/product-activity.ts`
- [ ] 6. Create `src/lib/query/hooks/product-activity.ts`
- [ ] 7. Add `productActivity` key to `src/lib/query/keys.ts`
- [ ] 8. Create `overview/page.tsx` (copy from summary/page.tsx)
- [ ] 9. Create `activity/page.tsx`
- [ ] 10. Create `orders/page.tsx`
- [ ] 11. Update `layout.tsx` — header redesign + new tabs
- [ ] 12. Delete `summary/page.tsx` and `stock-flow/page.tsx`
- [ ] 13. Run `npm run ts` to confirm zero type errors
- [ ] 14. Test each tab manually

---

## Important Notes

### `Badge` color values

Check `src/components/ui/badge.tsx` for available color values. Currently confirmed: `blue`, `green`, `gray`, `teal`.
If `amber` and `purple` don't exist, either:

- Add them to the `Badge` component's variant map, OR
- Use className overrides: `<Badge className="bg-amber-100 text-amber-800">` etc.

### `getAvailableStockText` function

Located in `src/lib/utils/product.ts`. Accepts `ProductWithInventoryListView`. This is already imported in some layout files but needs to be added to the product detail layout.

### `in_transit_quantity` and `processing_quantity`

These are new columns added in the `0019_product_inventory_aggregates.sql` rewrite. They are accessible via `product.inventory.in_transit_quantity` and `product.inventory.processing_quantity`. Make sure `ProductInventoryView` Pick type in `src/types/products.types.ts` includes these fields.

### Navigation from layout default tab

When a user navigates to `/warehouse/x/products/123` (no trailing path), the layout's `getActiveTab()` returns `"overview"` as default, but the route won't auto-redirect. Add a redirect to `overview` in a `page.tsx` at the product number level if needed, OR Next.js will render the layout without children (blank content). Consider adding:

```
src/app/(protected)/warehouse/[warehouse_slug]/products/[product_number]/page.tsx
```

With a redirect to `./overview`.
