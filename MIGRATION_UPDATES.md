# Migration Schema Updates

## Changes Made

### 1. **Goods Dispatch Type Updated** ✅

**File**: `migrations/0014_goods_dispatch_and_receipt.sql`

**Old**:
```sql
dispatch_type IN ('partner', 'warehouse')
```

**New**:
```sql
dispatch_type IN ('sales', 'job_work', 'purchase_return', 'warehouse_transfer', 'other')
```

**Fields Updated**:
- `dispatch_type` - Now supports 5 types instead of 2
- `other_reason` - NEW field, required when `dispatch_type = 'other'`
- `partner_id` - Renamed from `dispatch_to_partner_id`
- `to_warehouse_id` - Renamed from `dispatch_to_warehouse_id`
- `sales_order_id` - REQUIRED when `dispatch_type = 'sales'`
- `job_work_id` - REQUIRED when `dispatch_type = 'job_work'`
- `agent_id` - Optional, only for `dispatch_type = 'sales'`
- `other_reference` - Kept for additional notes

**Constraints**:
```sql
CHECK (
    (dispatch_type = 'sales' AND partner_id IS NOT NULL AND sales_order_id IS NOT NULL) OR
    (dispatch_type = 'job_work' AND partner_id IS NOT NULL AND job_work_id IS NOT NULL) OR
    (dispatch_type = 'purchase_return' AND partner_id IS NOT NULL) OR
    (dispatch_type = 'warehouse_transfer' AND to_warehouse_id IS NOT NULL AND to_warehouse_id != warehouse_id) OR
    (dispatch_type = 'other' AND other_reason IS NOT NULL)
)
```

### 2. **Goods Receipt Type Updated** ✅

**File**: `migrations/0014_goods_dispatch_and_receipt.sql`

**Old**:
```sql
-- No receipt_type field, only link_type
link_type IN ('sales_order', 'job_work', 'other')
```

**New**:
```sql
receipt_type IN ('purchase', 'job_work', 'sales_return', 'warehouse_transfer', 'other')
```

**Fields Updated**:
- `receipt_type` - NEW field
- `other_reason` - NEW field, required when `receipt_type = 'other'`
- `partner_id` - Renamed from `issued_by_partner_id`
- `from_warehouse_id` - Renamed from `issued_by_warehouse_id`
- `sales_order_id` - NEW field, REQUIRED when `receipt_type = 'sales_return'`
- `job_work_id` - REQUIRED when `receipt_type = 'job_work'`
- `agent_id` - Optional
- `other_reference` - Kept for additional notes

**Constraints**:
```sql
CHECK (
    (receipt_type = 'purchase' AND partner_id IS NOT NULL) OR
    (receipt_type = 'job_work' AND partner_id IS NOT NULL AND job_work_id IS NOT NULL) OR
    (receipt_type = 'sales_return' AND partner_id IS NOT NULL AND sales_order_id IS NOT NULL) OR
    (receipt_type = 'warehouse_transfer' AND from_warehouse_id IS NOT NULL AND from_warehouse_id != warehouse_id) OR
    (receipt_type = 'other' AND other_reason IS NOT NULL)
)
```

### 3. **Stock Unit Status Simplified** ✅

**File**: `migrations/0006_stock_units_and_inventory.sql`

**Old**:
```sql
status VARCHAR(20) NOT NULL DEFAULT 'pending_details'
    CHECK (status IN ('pending_details', 'in_stock', 'dispatched', 'removed'))
```

**New**:
```sql
status VARCHAR(20) NOT NULL DEFAULT 'in_stock'
    CHECK (status IN ('in_stock', 'dispatched', 'removed'))
```

**Reason**: `pending_details` status was unnecessary - stock units are created from receipts and should default to `in_stock`

### 4. **User Role** ✅

**Decision**: Kept as `'admin' | 'staff'` (not changed to 'owner')

---

## Use Case Examples

### Goods Dispatch Examples

#### 1. Sales Dispatch
```sql
INSERT INTO goods_dispatches (
    dispatch_type,
    partner_id,          -- Customer
    sales_order_id,      -- REQUIRED
    agent_id,            -- Optional
    ...
) VALUES (
    'sales',
    'customer-uuid',
    'so-uuid',
    'agent-uuid',        -- Can be NULL
    ...
);
```

#### 2. Job Work Dispatch
```sql
INSERT INTO goods_dispatches (
    dispatch_type,
    partner_id,          -- Job work partner
    job_work_id,         -- REQUIRED
    ...
) VALUES (
    'job_work',
    'jobwork-partner-uuid',
    'jw-uuid',
    ...
);
```

#### 3. Purchase Return
```sql
INSERT INTO goods_dispatches (
    dispatch_type,
    partner_id,          -- Vendor
    other_reference,     -- Optional notes
    ...
) VALUES (
    'purchase_return',
    'vendor-uuid',
    'Returning defective items',
    ...
);
```

#### 4. Warehouse Transfer
```sql
INSERT INTO goods_dispatches (
    dispatch_type,
    to_warehouse_id,     -- REQUIRED, must be different from warehouse_id
    other_reference,     -- Optional
    ...
) VALUES (
    'warehouse_transfer',
    'warehouse-b-uuid',
    'Stock rebalancing',
    ...
);
```

#### 5. Other (Dead Stock, Donations, etc.)
```sql
INSERT INTO goods_dispatches (
    dispatch_type,
    other_reason,        -- REQUIRED
    other_reference,     -- Optional additional notes
    ...
) VALUES (
    'other',
    'Dead stock clearance',
    'Clearing old inventory',
    ...
);
```

### Goods Receipt Examples

#### 1. Purchase from Vendor
```sql
INSERT INTO goods_receipts (
    receipt_type,
    partner_id,          -- Vendor
    invoice_number,
    ...
) VALUES (
    'purchase',
    'vendor-uuid',
    'INV-12345',
    ...
);
```

#### 2. Job Work Return
```sql
INSERT INTO goods_receipts (
    receipt_type,
    partner_id,          -- Job work partner
    job_work_id,         -- REQUIRED
    ...
) VALUES (
    'job_work',
    'jobwork-partner-uuid',
    'jw-uuid',
    ...
);
```

#### 3. Sales Return from Customer
```sql
INSERT INTO goods_receipts (
    receipt_type,
    partner_id,          -- Customer
    sales_order_id,      -- REQUIRED
    ...
) VALUES (
    'sales_return',
    'customer-uuid',
    'so-uuid',
    ...
);
```

#### 4. Warehouse Transfer
```sql
INSERT INTO goods_receipts (
    receipt_type,
    from_warehouse_id,   -- REQUIRED, must be different
    ...
) VALUES (
    'warehouse_transfer',
    'warehouse-a-uuid',
    ...
);
```

#### 5. Other
```sql
INSERT INTO goods_receipts (
    receipt_type,
    other_reason,        -- REQUIRED
    ...
) VALUES (
    'other',
    'Receiving samples',
    ...
);
```

---

## TypeScript Types Created

**File**: `src/types/database/enums.ts`

```typescript
export type DispatchType = 'sales' | 'job_work' | 'purchase_return' | 'warehouse_transfer' | 'other';
export type ReceiptType = 'purchase' | 'job_work' | 'sales_return' | 'warehouse_transfer' | 'other';
export type StockUnitStatus = 'in_stock' | 'dispatched' | 'removed';
export type UserRole = 'admin' | 'staff';
```

---

## Next Steps

1. ✅ Complete remaining database type definitions
2. ✅ Update TODO.md to mark migration review as complete
3. ⏳ Set up Supabase project and run migrations
4. ⏳ Generate TypeScript types from Supabase schema
5. ⏳ Build authentication system
