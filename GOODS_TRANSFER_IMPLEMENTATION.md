# Goods Transfer Feature Implementation Plan

## Overview
Implement a dedicated "Goods Transfer" feature for warehouse-to-warehouse stock unit transfers, replacing the previous flawed implementation that created duplicate stock units.

## Implementation Phases

### ✅ Phase 1: Remove warehouse transfer from goods inward/outward database schema
**Status:** Completed

**Tasks:**
- Removed `from_warehouse_id` and `to_warehouse_id` columns from goods_inwards table
- Removed `to_warehouse_id` column from goods_outwards table
- Removed warehouse transfer related constraints and indexes
- Updated RPC functions to remove warehouse transfer logic

**Files Modified:**
- `supabase/migrations/0029_goods_inwards.sql`
- `supabase/migrations/0030_goods_outwards.sql`

---

### ✅ Phase 2: Create goods transfer database tables and functions
**Status:** Completed

**Tasks:**
- Created `goods_transfers` table with:
  - Basic fields: id, sequence_number, company_id, created_by
  - Transfer fields: from_warehouse_id, to_warehouse_id, transfer_date
  - Status field: status (in_transit, completed, cancelled)
  - Transport fields: expected_delivery_date, transport_type, transport_reference_number
  - Metadata: notes, attachments, search_vector
  - Soft delete support: deleted_at, cancellation_reason
- Created `goods_transfer_items` table linking transfers to stock_units
- Created RPC function `create_goods_transfer_with_items` for atomic creation
- Added full-text search with weighted tsvector
- Created triggers for search vector updates and sequence number generation

**Files Created:**
- `supabase/migrations/0068_goods_transfers.sql`

---

### ✅ Phase 3: Remove warehouse transfer from goods inward/outward frontend
**Status:** Completed

**Tasks:**
- Removed warehouse transfer options from goods inward/outward forms
- Removed warehouse selection fields from create flows
- Updated type definitions to remove warehouse transfer types
- Cleaned up validation schemas

**Files Modified:**
- Goods inward/outward create pages
- Form components
- Type definitions

---

### ✅ Phase 4: Create goods transfer queries and types
**Status:** Completed

**Tasks:**
- Created comprehensive TypeScript types:
  - `GoodsTransfer`, `GoodsTransferItem` base types
  - `TransferListView`, `TransferDetailView` with query inference
  - `TransferFilters`, `UpdateTransferData`, etc.
- Created query functions:
  - `getGoodsTransfers` - paginated list with filters
  - `getGoodsTransferByNumber` - single transfer detail
  - `createGoodsTransferWithItems` - atomic creation
  - `updateGoodsTransfer` - metadata updates
  - `completeGoodsTransfer` - status change to completed
  - `cancelGoodsTransfer` - status change to cancelled
  - `deleteGoodsTransfer` - soft delete
- Created TanStack Query hooks:
  - `useGoodsTransfers` - list query with pagination
  - `useGoodsTransferBySequenceNumber` - detail query
  - `useGoodsTransferMutations` - all mutations
- Added utility functions:
  - `getTransferWarehousesName` - format "From → To"
  - `getTransferProductsSummary` - aggregate products
  - `getTransferQuantitiesByUnit` - aggregate by measuring unit
- Updated query keys in centralized factory
- Added `.is("deleted_at", null)` filter to stock-flow queries for consistency

**Files Created:**
- `src/types/goods-transfers.types.ts`
- `src/lib/queries/goods-transfers.ts`
- `src/lib/query/hooks/goods-transfers.ts`

**Files Modified:**
- `src/lib/query/keys.ts` - added stockFlow.transfers keys
- `src/lib/queries/stock-flow.ts` - added deleted_at filter
- `src/lib/utils/stock-flow.ts` - added transfer utility functions

---

### ✅ Phase 5: Add Transfer tab to stock-flow page
**Status:** Completed

**Tasks:**
- [x] Create IconGoodsTransfer component
- [x] Add Transfer tab to TabPills (Inward, Outward, Transfer)
- [x] Add transfer option to FAB dropdown
- [x] Integrate useGoodsTransfers hook
- [x] Add transfer filters and state management
- [x] Add transfer utility function imports
- [x] Add transfer item transformation and rendering
- [x] Update click handler for transfer navigation
- [x] Update item display logic for all three types

**Files Created:**
- `src/components/icons/IconGoodsTransfer.tsx`

**Files Modified:**
- `src/app/(protected)/warehouse/[warehouse_slug]/stock-flow/page.tsx`

**Notes:**
- Transfer tab shows transfers where warehouse is either source or destination
- Transfers display as "From Warehouse → To Warehouse" format
- Blue color scheme for transfers (yellow for inward, teal for outward)
- Partner filter not applicable for transfers (no partner involved)

---

### ✅ Phase 6: Create goods transfer create flow
**Status:** Completed

**Tasks:**
- [x] Create Zod validation schema for goods transfer
- [x] Create warehouse selection step (destination warehouse picker)
- [x] Create stock unit selection step (reused StockUnitScannerStep)
- [x] Create transfer details step (dates, transport, notes)
- [x] Create main goods transfer create page with 3-step flow
- [x] Integrate with createTransferWithItems mutation
- [x] Add success/error handling with navigation
- [x] Add helper functions (set_completed_at, set_completed_by) to migration

**Files Created:**
- `src/lib/validations/goods-transfer.ts` - Validation schema
- `src/app/(protected)/warehouse/[warehouse_slug]/goods-transfer/create/page.tsx` - Main create page
- `src/app/(protected)/warehouse/[warehouse_slug]/goods-transfer/create/WarehouseSelectionStep.tsx` - Destination warehouse picker
- `src/app/(protected)/warehouse/[warehouse_slug]/goods-transfer/create/TransferDetailsStep.tsx` - Transfer details form

**Files Modified:**
- `supabase/migrations/0001_enable_extensions_and_functions.sql` - Added set_completed_at/set_completed_by functions

**Implementation Details:**
- Source warehouse auto-selected from session context
- Destination warehouse selection with search and filtering
- Reused StockUnitScannerStep component (full quantity transfers)
- Transfer date required, other fields optional
- Date fields use ISO string format (YYYY-MM-DD) pattern from goods-outward
- Status defaults to 'in_transit' (no user selection)
- 3-step flow: Warehouse → Scanner → Details
- Auto-advance after warehouse selection (300ms delay)

**Notes:**
- No TypeScript errors in goods transfer implementation
- Pre-existing errors from Phase 1 cleanup remain in other files
- All validation follows project patterns (single schema, no step-specific schemas)

---

### ⏳ Phase 7: Create goods transfer detail page
**Status:** Pending

**Planned Tasks:**
- Create goods transfer detail page
- Display transfer header with warehouses and status
- Show transfer items list with products and quantities
- Display transport and delivery information
- Add status badge (in_transit, completed, cancelled)
- Implement complete transfer action
- Implement cancel transfer action (with reason)
- Implement edit metadata (dates, transport, notes)
- Add delete action (soft delete)
- Show audit trail (created by, dates)

**Files to Create:**
- `src/app/(protected)/warehouse/[warehouse_slug]/goods-transfer/[transfer_number]/page.tsx`

**Notes:**
- Complete action triggers stock unit location updates via database triggers
- Cancel action requires cancellation reason
- Edit only allowed for in_transit status
- Delete only allowed for in_transit status

---

### ⏳ Phase 8: Add movement history to stock unit modal
**Status:** Pending

**Planned Tasks:**
- Add movement history section to stock unit detail modal
- Show chronological history:
  - Goods Inward (creation)
  - Goods Outward (dispatches)
  - Goods Transfer (warehouse movements)
- Display movement type, date, and destination/source
- Add links to movement detail pages
- Handle different movement types with appropriate icons/colors

**Files to Modify:**
- Stock unit detail modal component
- Add queries for movement history if needed

**Notes:**
- Movement history helps track stock unit journey
- Important for transfer reconciliation

---

### ⏳ Phase 9: Add goods transfer quick action to inventory page
**Status:** Pending

**Planned Tasks:**
- Add transfer quick action to inventory page
- Allow selecting multiple stock units for transfer
- Quick transfer flow:
  - Select stock units from inventory
  - Select destination warehouse
  - Confirm and create transfer
- Update inventory table to support multi-select
- Add transfer button to bulk actions

**Files to Modify:**
- Inventory page component
- Add transfer quick action UI

**Notes:**
- Useful for quick transfers without full flow
- Consider batch transfer creation

---

### ⏳ Phase 10: Testing and validation
**Status:** Pending

**Planned Tasks:**
- Test complete transfer creation flow
- Test transfer detail page actions (complete, cancel, edit, delete)
- Test transfer list filtering and pagination
- Test stock unit location updates on transfer completion
- Verify database triggers and constraints
- Test edge cases:
  - Transfer to same warehouse (should be blocked)
  - Transferring already transferred units
  - Cancelling completed transfers
- Test search functionality
- Test movement history display
- Validate form inputs and error handling
- Test permissions (admin vs staff)

**Notes:**
- Database reset might be needed for testing: `npx supabase db reset`
- Verify RLS policies for transfers

---

## Technical Notes

### Database Schema
- Goods transfers are completely separate from inward/outward
- Stock units track current_warehouse_id for location
- Transfers don't create duplicate stock units (previous issue)
- Transfer completion triggers update stock_unit.current_warehouse_id

### Query Patterns
- Uses `!inner` on child table joins for proper filtering
- Follows exact pattern from stock-flow module
- Regular pagination with `keepPreviousData` (not infinite queries)
- Centralized query keys in `keys.ts`

### Type Safety
- Uses query builder pattern with type inference
- `QueryData<ReturnType<typeof buildQuery>>` pattern
- Separate ListView and DetailView types per domain

### Validation
- Zod schemas for all forms
- Reusable validators in `validations/common.ts`
- Transport type enum: road, rail, air, sea, courier

### UI/UX Considerations
- Blue color scheme for transfers (distinct from inward/outward)
- "From → To" format for warehouse display
- Full quantity selection (no partial transfers)
- Checkmark selection pattern for stock units
- Status badges: in_transit, completed, cancelled

---

## Current Status Summary

**Completed:** Phases 1-6 (Database, types, queries, hooks, stock-flow page, create flow)
**Pending:** Phases 7-10 (Detail page, movement history, quick actions, testing)

**Next Steps:**
1. Begin Phase 7: Create goods transfer detail page
2. Continue through remaining phases sequentially

**Testing Notes:**
- Database reset successful with all migrations applied
- Supabase types generated successfully
- Dev server running without errors
- No TypeScript errors in goods transfer implementation
- Ready for UI/functional testing
