# Database Migration Schema Review

## Overview
Total Migration Files: **23 files** (~5,773 lines of SQL)
- **migrations_temp/**: 4 files (auth & basic setup)
- **migrations/**: 19 files (full schema with RLS)

---

## ✅ STRENGTHS

### 1. **Excellent Multi-Tenancy Design**
- **Company-level isolation**: Every table has `company_id` with proper foreign keys
- **Warehouse scoping**: Staff users limited to single warehouse via `warehouse_id`
- **Complete RLS implementation**: Row-level security on all tables with helper functions
- **Proper indexing**: All `company_id` columns indexed for query performance

### 2. **Comprehensive Schema Structure**
The schema covers all requirements from PRD:

#### Core Tables (migrations_temp):
- ✅ `companies` - Tenant isolation
- ✅ `users` - Role-based access (admin/staff)
- ✅ `warehouses` - Location management
- ✅ `invites` - Staff onboarding system

#### Business Tables (migrations):
- ✅ `products` - Fabric master catalog with 30+ material types
- ✅ `stock_units` - Individual roll/piece tracking
- ✅ `partners` - Customers, vendors, suppliers, agents
- ✅ `sales_orders` + `sales_order_items` - Order management
- ✅ `job_works` - Job work tracking
- ✅ `goods_dispatches` + `goods_receipts` - Stock movement
- ✅ `barcode_generations` - QR code management
- ✅ `catalog_configurations` - Public catalog settings

### 3. **Smart Automation**
- **Auto-generated numbers**: Products, orders, jobs, dispatches with company-scoped sequences
- **Auto-updated timestamps**: `updated_at` triggers on all tables
- **Calculated fields**: `pending_quantity`, `line_total`, `completion_percentage`
- **QR code generation**: Automatic from `unit_number`
- **Price population**: Auto-fetch selling price from product master

### 4. **Security & Data Integrity**
- **RLS Policies**: Separate files for each domain (products, partners, sales, job works, etc.)
- **Helper functions**: `get_user_company_id()`, `get_user_role()`, `is_company_admin()`
- **Validation constraints**:
  - Staff must have warehouse assignment
  - Material types enumerated
  - Status fields with CHECK constraints
  - Prevent quantity reduction below dispatched
- **Soft deletes**: `deleted_at` on all tables
- **Audit trail**: `created_by`, `modified_by` on all tables

### 5. **Performance Optimization**
- **Strategic indexes**: Multi-column indexes for common queries
- **GIN indexes**: For array fields (tags, product_images, attachments)
- **Summary views**: `inventory_summary`, `sales_order_status`
- **Warehouse-scoped indexes**: Most queries filtered by warehouse

### 6. **Fabric-Specific Features**
- **Material types**: 30+ options (Cotton, Silk, Polyester, blends, etc.)
- **Fabric attributes**: GSM, thread count, color hex codes
- **Stock unit details**: Quality grade, wastage, manufacturing date
- **Measuring units**: Meters, Yards, Kg, Pieces
- **Product images**: Array support for multiple images

---

## ⚠️ ISSUES & RECOMMENDATIONS

### 1. **CRITICAL: Missing Sequence Generator Function**
**Problem**: Multiple migrations reference `generate_sequence_number()` but it's **commented out** in `0001_enable_extensions_and_functions.sql`

**Affected Triggers**:
- `auto_generate_product_number()` - Line 100 in products
- `auto_generate_order_number()` - Line 142 in sales orders
- Similar functions in job_works, dispatches, receipts

**Solution**: **UNCOMMENT** lines 22-49 in `migrations/0001_enable_extensions_and_functions.sql`

```sql
CREATE OR REPLACE FUNCTION generate_sequence_number(prefix TEXT, table_name TEXT, company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_seq INTEGER;
    result TEXT;
    column_name TEXT;
BEGIN
    column_name := CASE
        WHEN table_name = 'products' THEN 'product_number'
        WHEN table_name = 'sales_orders' THEN 'order_number'
        WHEN table_name = 'job_works' THEN 'job_number'
        WHEN table_name = 'goods_dispatches' THEN 'dispatch_number'
        WHEN table_name = 'goods_receipts' THEN 'receipt_number'
        WHEN table_name = 'stock_units' THEN 'unit_number'
        ELSE 'number'
    END;

    EXECUTE format('SELECT COALESCE(MAX(CAST(SUBSTRING(%I FROM ''^%s-(\d+)$'') AS INTEGER)), 0) + 1 FROM %I WHERE company_id = $1',
                   column_name, prefix, table_name)
    INTO next_seq
    USING company_uuid;

    result := prefix || '-' || LPAD(next_seq::TEXT, 6, '0');
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### 2. **Helper Functions Commented Out**
**Problem**: Auto-suggestion functions are commented out in `0001`:
- `get_tag_suggestions()` - Line 55-76
- `get_quality_grade_suggestions()` - Line 78-100
- `get_job_type_suggestions()` - Line 102-124

**Impact**: These provide UX features like tag auto-complete and quality grade suggestions

**Recommendation**:
- ✅ **Keep commented for MVP** - Not critical for core functionality
- 📝 **Uncomment in Phase 4** when building UI components
- Update file: `migrations/0001_enable_extensions_and_functions.sql`

### 3. **migrations vs migrations_temp Redundancy**
**Problem**: Files are duplicated:
- `migrations_temp/0001_enable_extensions_and_functions.sql`
- `migrations/0001_enable_extensions_and_functions.sql`
- Same for 0002 and 0003

**Impact**: Confusing which version is authoritative

**Recommendations**:
1. **For initial auth setup**: Use `migrations_temp/` (0001-0004)
2. **For full system**: Use `migrations/` (0001-0019)
3. **After auth is working**:
   - Delete `migrations_temp/` folder
   - Keep only `migrations/` as single source of truth

### 4. **Missing Foreign Key in Stock Units**
**Note**: `stock_units.created_from_receipt_id` FK will be added in goods movement migration (0014) - this is **intentional** and **correct**

### 5. **Invites Table Issue**
**Problem**: `invites.warehouse_id` is `NOT NULL` but admins don't have warehouse assignments

**Fix in `migrations_temp/0004_invites.sql`**:
```sql
-- Change line 16 from:
warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

-- To:
warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,

-- Add constraint:
ALTER TABLE invites ADD CONSTRAINT check_staff_invite_has_warehouse
    CHECK (role != 'staff' OR warehouse_id IS NOT NULL);
```

---

## 🎯 MIGRATION STRATEGY

### Phase 1: Auth & Basic Setup (Use migrations_temp)
```bash
# Run in Supabase SQL Editor or via Supabase CLI
1. migrations_temp/0001_enable_extensions_and_functions.sql (UNCOMMENT generate_sequence_number!)
2. migrations_temp/0002_companies_and_users.sql
3. migrations_temp/0003_warehouses_and_basic_setup.sql
4. migrations_temp/0004_invites.sql (AFTER fixing warehouse_id constraint)
```

**This gives you**:
- ✅ User authentication
- ✅ Company creation
- ✅ Warehouse management
- ✅ Staff invites

### Phase 2: Full System Migration (Use migrations/)
Once auth is working and you're ready for full system:

```bash
# Run all migrations in order 0001-0019
1. Enable extensions and functions
2. Companies and users
3. Warehouses
4. Core RLS policies
5. Products master
6. Stock units and inventory
7. Product RLS policies
8. Partners management
9. Partners RLS policies
10. Sales orders
11. Sales RLS policies
12. Job works
13. Job works RLS policies
14. Goods dispatch/receipt
15. Goods movement RLS policies
16. Barcode system
17. Catalog configuration
18. Advanced features RLS
19. Cross-domain views and final setup
```

**Then**:
- ✅ Delete `migrations_temp/` folder
- ✅ Keep `migrations/` as single source of truth

---

## 📋 PRE-MIGRATION CHECKLIST

### Before Running migrations_temp/:
- [ ] Fix `invites.warehouse_id` constraint (line 16 in 0004)
- [ ] **UNCOMMENT** `generate_sequence_number()` in 0001 (lines 22-49)
- [ ] Verify Supabase project is created
- [ ] Verify you have SUPERUSER access

### Before Running migrations/:
- [ ] **UNCOMMENT** `generate_sequence_number()` in migrations/0001 (if using this path)
- [ ] Review RLS policies match your requirements
- [ ] Backup migrations_temp/ if needed for reference
- [ ] Run in test environment first

### After Running Migrations:
- [ ] Test RLS policies with admin user
- [ ] Test RLS policies with staff user
- [ ] Verify auto-number generation works
- [ ] Test invite flow
- [ ] Verify warehouse scoping for staff

---

## 💡 SCHEMA HIGHLIGHTS

### Stock Unit Lifecycle
```
pending_details → in_stock → dispatched → removed
```

### Sales Order Workflow
```
approval_pending → in_progress → completed/cancelled
```

### Partner Types
```
customer | vendor | supplier | agent
```

### Material Types (30+)
Natural fibers, synthetic fibers, semi-synthetic, specialty fabrics, blends

---

## 🔐 RLS POLICY SUMMARY

### Admin Permissions:
- ✅ Full CRUD on all tables within their company
- ✅ Access to all warehouses
- ✅ Manage users and invites
- ✅ View all sales orders, stock units, job works

### Staff Permissions:
- ✅ READ: Products, Partners
- ✅ CRUD: Stock units (warehouse-scoped)
- ✅ CRUD: Dispatches/Receipts (warehouse-scoped)
- ✅ CRUD: Job works (warehouse-scoped)
- ❌ NO ACCESS: Company, Warehouses, Users management

---

## 🚀 NEXT STEPS

1. **Immediate**:
   - [ ] Fix critical issues (generate_sequence_number, invites constraint)
   - [ ] Run migrations_temp/ in Supabase
   - [ ] Create TypeScript types from schema

2. **Phase 2**:
   - [ ] Transition to full migrations/
   - [ ] Set up Supabase CLI for version control
   - [ ] Create seed data for testing

3. **Phase 3**:
   - [ ] Build authentication UI
   - [ ] Implement invite flow
   - [ ] Test multi-tenancy isolation

---

## 📝 OVERALL ASSESSMENT

### Rating: ⭐⭐⭐⭐⭐ (9.5/10)

**Excellent work!** The schema is:
- ✅ Well-structured and normalized
- ✅ Comprehensive RLS implementation
- ✅ Production-ready security model
- ✅ Proper indexing and performance optimization
- ✅ Complete audit trail
- ✅ Fabric industry-specific features

**Minor issues**:
- ⚠️ Commented out critical function (easy fix)
- ⚠️ invites constraint needs adjustment
- ⚠️ Folder structure cleanup needed

Once the critical function is uncommented, this schema is **ready for production**.
