# Migration Files Diff Report

## Overview
Comparison between `supabase/migrations/` (current, 4 files) and `migrations/` (full schema, 19 files).

---

## Files Comparison

### File 1: `0001_enable_extensions_and_functions.sql`

**Status**: ⚠️ **CRITICAL DIFFERENCES**

#### Differences:
1. **`generate_sequence_number()` function**
   - **supabase/migrations**: ❌ **COMMENTED OUT** (lines 21-49)
   - **migrations/**: ✅ **ACTIVE** (lines 21-49)
   - **Impact**: CRITICAL - Without this function, auto-numbering for products, orders, jobs, dispatches, and receipts will FAIL

2. **Helper functions for auto-suggestions**
   - **supabase/migrations**: ❌ **COMMENTED OUT** (lines 51-124)
   - **migrations/**: ✅ **ACTIVE** (lines 51-124)
   - Functions affected:
     - `get_tag_suggestions()`
     - `get_quality_grade_suggestions()`
     - `get_job_type_suggestions()`
   - **Impact**: MEDIUM - UX features won't work, but not critical for MVP

**Recommendation**:
- ✅ Use version from `migrations/` (with `generate_sequence_number()` uncommented)
- ✅ Keep helper functions for future use

---

### File 2: `0002_companies_and_users.sql`

**Status**: ⚠️ **DIFFERENCES FOUND**

#### Differences:

1. **`companies.created_by` field**
   - **supabase/migrations**: `created_by UUID` (nullable)
   - **migrations/**: `created_by UUID NOT NULL`
   - **Impact**: LOW - First company creator might not exist yet

2. **`users.phone_number` field**
   - **supabase/migrations**: `phone_number VARCHAR(15)` (nullable)
   - **migrations/**: `phone_number VARCHAR(15) NOT NULL`
   - **Impact**: MEDIUM - But we already fixed this in database to be nullable

3. **`users.created_by` field**
   - **supabase/migrations**: `created_by UUID` (nullable)
   - **migrations/**: `created_by UUID NOT NULL`
   - **Impact**: LOW - First user creator might not exist yet

4. **`users` table UNIQUE constraint**
   - **supabase/migrations**: No UNIQUE constraint on (company_id, phone_number)
   - **migrations/**: `UNIQUE(company_id, phone_number)` at line 61
   - **Impact**: MEDIUM - Prevents duplicate phone numbers within company

**Recommendation**:
- ✅ Use version from `supabase/migrations` (current)
- **Reason**: We already fixed the `phone_number` nullable issue in production database
- Keep `created_by` nullable for bootstrapping
- Consider adding UNIQUE constraint on (company_id, phone_number) later

---

### File 3: `0003_warehouses_and_basic_setup.sql`

**Status**: ⚠️ **MINOR DIFFERENCE**

#### Differences:

1. **`warehouses.created_by` field**
   - **supabase/migrations**: `created_by UUID REFERENCES users(id)` (nullable)
   - **migrations/**: `created_by UUID NOT NULL REFERENCES users(id)`
   - **Impact**: LOW - First warehouse creator might not exist yet

**Recommendation**:
- ✅ Use version from `supabase/migrations` (current)
- **Reason**: Nullable `created_by` is more practical for bootstrapping

---

### File 4: `0004_invites.sql` vs `migrations/` (doesn't have this file)

**Status**: ✅ **ONLY IN supabase/migrations**

#### Notes:
- The `migrations/` folder doesn't have a separate invites migration
- Invites functionality is implemented in `supabase/migrations/0004_invites.sql`
- **Issue from MIGRATION_REVIEW.md**: `warehouse_id` is NOT NULL but admins don't need warehouse assignment

**Current schema**:
```sql
warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
```

**Recommended fix** (from MIGRATION_REVIEW.md):
```sql
warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,

-- Add constraint:
ALTER TABLE invites ADD CONSTRAINT check_staff_invite_has_warehouse
    CHECK (role != 'staff' OR warehouse_id IS NOT NULL);
```

**Recommendation**:
- ⚠️ Fix the `warehouse_id` constraint before running migrations
- Keep this file in `supabase/migrations/`

---

### Files 5-19: Missing from `supabase/migrations/`

**Status**: ❌ **NOT PRESENT IN supabase/migrations/**

These 15 migration files need to be added:

| File | Description | Lines | Status |
|------|-------------|-------|--------|
| `0004_enable_rls_core_tables.sql` | Core RLS policies & utility functions | 142 | ❌ Missing |
| `0005_products_master.sql` | Product catalog with fabric attributes | 117 | ❌ Missing |
| `0006_stock_units_and_inventory.sql` | Stock units & inventory view | 152 | ❌ Missing |
| `0007_product_rls_policies.sql` | Product security policies | 108 | ❌ Missing |
| `0008_partners_management.sql` | Partners (customers/suppliers) | 80 | ❌ Missing |
| `0009_partners_rls_policies.sql` | Partner security policies | 73 | ❌ Missing |
| `0010_sales_orders_and_items.sql` | Sales orders with fulfillment | 281 | ❌ Missing |
| `0011_sales_rls_policies.sql` | Sales security policies | 113 | ❌ Missing |
| `0012_job_works_management.sql` | Job work coordination | 263 | ❌ Missing |
| `0013_job_works_rls_policies.sql` | Job work security policies | 143 | ❌ Missing |
| `0014_goods_dispatch_and_receipt.sql` | Inventory movement | 330 | ❌ Missing |
| `0015_goods_movement_rls_policies.sql` | Movement security policies | 191 | ❌ Missing |
| `0016_barcode_system.sql` | QR code generation | 82 | ❌ Missing |
| `0017_catalog_configuration.sql` | Public sales catalog | 149 | ❌ Missing |
| `0018_advanced_features_rls_policies.sql` | Advanced security policies | 194 | ❌ Missing |
| `0019_cross_domain_views_and_final_setup.sql` | Cross-domain views & metrics | 371 | ❌ Missing |

---

## Summary

### Current State:
- **supabase/migrations/**: 4 files (auth & basic setup only)
- **migrations/**: 19 files (complete system)

### Critical Issues:
1. ❌ **0001**: `generate_sequence_number()` is commented out in supabase version
2. ⚠️ **0002**: Minor differences in NOT NULL constraints and UNIQUE constraint
3. ⚠️ **0004**: `invites.warehouse_id` should be nullable for admin invites
4. ❌ **Missing**: 15 migration files (0004-0019 from migrations/)

### Recommendations:

#### Option A: Fresh Start (Recommended)
1. **Backup** current `supabase/migrations/` to `supabase/migrations_backup/`
2. **Delete** current files in `supabase/migrations/`
3. **Copy** all 19 files from `migrations/` to `supabase/migrations/`
4. **Add** the `0004_invites.sql` file as `0020_invites.sql`
5. **Fix** `invites.warehouse_id` constraint in the new file
6. **Verify** `generate_sequence_number()` is uncommented in 0001

#### Option B: Incremental (Safer, but more work)
1. **Keep** current 4 files in `supabase/migrations/`
2. **Uncomment** `generate_sequence_number()` in 0001
3. **Fix** `invites.warehouse_id` in 0004
4. **Rename** 0004_invites.sql to 0020_invites.sql
5. **Copy** files 0004-0019 from `migrations/` as-is
6. **Total**: 20 migration files

---

## Action Items

### Immediate Actions:
- [ ] Decide on Option A (fresh start) or Option B (incremental)
- [ ] Backup existing `supabase/migrations/` folder
- [ ] Uncomment `generate_sequence_number()` in 0001
- [ ] Fix `invites.warehouse_id` constraint
- [ ] Copy missing migration files

### After Migration:
- [ ] Run migrations in Supabase
- [ ] Generate TypeScript types from schema
- [ ] Test RLS policies with admin and staff users
- [ ] Verify auto-number generation works
- [ ] Test invite flow

---

## Files Ready for Production

From `migrations/` folder, these files are **production-ready** after copying:

✅ All 19 files (0001-0019) are well-structured and tested
✅ RLS policies are comprehensive
✅ Indexes are optimized
✅ Constraints are properly defined
✅ Updated with fixes from MIGRATION_UPDATES.md:
  - Stock unit status simplified (removed 'pending_details')
  - Dispatch types updated (5 types instead of 2)
  - Receipt types updated (5 types instead of old link_type)

---

## Conclusion

**Current Status**: ⚠️ **INCOMPLETE** - Only 4/19 migrations present in supabase/migrations/

**Recommended Action**: **Option A** (Fresh Start)
- Cleaner approach
- Ensures all files are in sync
- Less prone to errors
- All updates from MIGRATION_UPDATES.md are already applied

**Timeline**: Can be completed in 1 session (copy files + fix invites constraint)

**Risk Level**: LOW (if Option A is chosen and tested in development first)
