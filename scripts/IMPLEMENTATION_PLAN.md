# Scripts Refactoring Implementation Plan

## Status: In Progress (70% Complete)

This document outlines the plan for refactoring `load-setup.ts` and `setup.ts` into modular, idempotent components.

---

## ✅ Completed (Phase 1)

### Core Modules
- [x] **shared.ts** - Environment config, Supabase client, helper functions (randomInt, randomFloat, getRandomDate, etc.)
- [x] **company.ts** - Company, catalog configuration, admin user creation
- [x] **warehouse.ts** - Warehouse creation with distribution weights
- [x] **partners.ts** - Partner creation (customers, suppliers, vendors, agents)
- [x] **attributes.ts** - Attributes creation (materials, colors, tags)
- [x] **products.ts** - Template-based product generation with attribute assignments

### Order Modules
- [x] **sales-orders.ts** - Sales order generation with seasonal variance
  - 500 orders for load-setup, 50 for setup
  - Proportional monthly distribution (no rounding)
  - Discount logic, payment terms, agents
- [x] **purchase-orders.ts** - Purchase order generation with seasonal variance
  - 400 orders for load-setup, 40 for setup
  - Proportional monthly distribution (no rounding)
  - Agent assignments (30% of orders)

### Inventory Modules
- [x] **goods-inwards.ts** - Goods inward from purchase orders
  - 80% fulfillment rate
  - Stock units with lot numbers, quality grades, warehouse locations
  - RPC: `create_goods_inward_with_units`
- [x] **goods-outwards.ts** - Goods outward from sales orders
  - 60% fulfillment rate
  - Uses pending_quantity for partial dispatches
  - FIFO/LIFO stock allocation strategy
  - RPC: `create_goods_outward_with_items`

### Configuration Files
- [x] **warehouses.config.ts** - 5 warehouses with distribution weights [60,20,10,5,5]
- [x] **partners.config.ts** - 9 test partners (3 customers, 2 suppliers, 2 vendors, 2 agents)
- [x] **attributes.config.ts** - 6 materials, 6 colors, 19 tags
- [x] **product-templates.config.ts** - 100 product templates across 5 categories
- [x] **lot-numbers.config.ts** - 20 lot numbers for stock units
- [x] **goods-inwards.config.ts** - fulfillmentRate: 0.8
- [x] **goods-outwards.config.ts** - fulfillmentRate: 0.6

### Setup Scripts
- [x] **setup-phase1.ts** - Minimal test data setup (50 SO, 40 PO, inventory)
- [x] **load-setup-phase1.ts** - Placeholder for bulk data setup

---

## ✅ Completed (Phase 2)

### Inventory Module

#### 1. Goods Transfers Module
**File:** `scripts/modules/goods-transfers.ts` ✅
**Config:** `scripts/config/goods-transfers.config.ts` ✅

**Reference:** load-setup.ts lines 1422-1743

**Key Features:**
- ✅ Transfers between business warehouses and vendor factories
- ✅ Two directions: warehouse→factory and factory→warehouse
- ✅ Contextual notes based on warehouse types:
  - Main → Factory: "Sent for dyeing/knitting/weaving"
  - Factory → Main: "Finished dyeing/knitting/weaving"
  - Main → Regional: "Stock distribution"
  - Regional → Main: "Consolidation"
- ✅ Status distribution: 60% completed, 30% in_transit, 10% cancelled
- ✅ Transfer dates respect stock unit updated_at (within 1 week)
- ✅ Uses generic record-status module for status updates
- ✅ RPC: `create_goods_transfer_with_items`

**Completed Implementation:**
1. ✅ Fetch existing goods transfers for idempotency
2. ✅ Separate warehouses into business vs factory
3. ✅ Create transfers based on direction (warehouse→factory or factory→warehouse)
4. ✅ Select 5-10 stock units per transfer from same source warehouse
5. ✅ Generate transfer dates after latest stock unit updated_at
6. ✅ Generate contextual notes based on warehouse types
7. ✅ Apply status distribution using record-status module
8. ✅ Integrated into setup-phase1.ts with dual runs (both directions)

**Config:**
```typescript
export const GOODS_TRANSFERS_CONFIG = {
  stockUnitsPerTransfer: { min: 5, max: 10 },
  transferDateOffsetDays: { min: 1, max: 7 },
  statusDistribution: { completed: 0.6, in_transit: 0.3, cancelled: 0.1 },
  expectedDeliveryDays: { min: 3, max: 10 },
  transportTypes: ["road", "rail", "air"],
} as const;
```

### Transaction Modules

#### 2. Invoices Module
**File:** `scripts/modules/invoices.ts` ✅
**Config:** `scripts/config/invoices.config.ts` ✅

**Reference:** load-setup.ts lines 1749-2372

**Key Features:**
- ✅ **Sales Invoices:** 100% of sales orders get invoices
  - Creates invoice with line items from sales order
  - Tax calculations (GST/IGST/no_tax)
  - Discount logic (percentage/flat/none)
  - Payment terms
  - RPC: `create_invoice_with_items`
  - **Additional charges integrated** into RPC call

- ✅ **Purchase Invoices:** 100% of purchase orders get invoices
  - Creates invoice with line items from purchase order
  - Tax calculations (GST/IGST/no_tax)
  - Discount logic (percentage/flat/none)
  - Payment terms
  - Supplier invoice details
  - RPC: `create_invoice_with_items`
  - **Additional charges integrated** into RPC call

- ✅ **Additional Charges:** 30% of invoices get additional charges
  - **Generated inline** and passed to RPC (no separate function)
  - Sales: Freight outward, packaging, agent commission, handling
  - Purchase: Freight inward, loading/unloading, labour, handling, packaging
  - Configurable probabilities in config file

**Completed Implementation:**
1. ✅ Split into two separate functions: `generateSalesInvoices()` and `generatePurchaseInvoices()`
2. ✅ Fetch existing invoices by type (sales/purchase)
3. ✅ Fetch all sales/purchase orders internally
4. ✅ Create invoices from orders using deduplicated `createSingleInvoice()` helper
5. ✅ Generate additional charges data inline via `generateAdditionalChargesData()` helper
6. ✅ Pass additional charges directly to RPC (no separate insert)
7. ✅ Return array of created invoices
8. ✅ `fetchChargeLedgers()` helper for reusable ledger fetching

**Config:**
```typescript
export const INVOICES_CONFIG = {
  salesInvoiceRate: 1.0,      // 100%
  purchaseInvoiceRate: 1.0,   // 100%
  additionalChargesRate: 0.3, // 30%

  // Tax distribution
  taxDistribution: { gst: 0.5, igst: 0.3, no_tax: 0.2 },

  // Discount configuration (separate for sales/purchase)
  sales: { discountDistribution, discountRanges },
  purchase: { discountDistribution, discountRanges },

  // Goods movement linkage
  goodsMovementLinkRate: 0.4,

  // Additional charges probabilities
  additionalCharges: { sales: {...}, purchase: {...} }
} as const;
```

**Improvements Made:**
- ✅ Removed duplicate `generateInvoiceAdditionalCharges()` function
- ✅ Deduplicated 90% of sales/purchase code via shared helper
- ✅ Moved all hardcoded probabilities to config
- ✅ Integrated additional charges into single RPC call
- ✅ Removed year filter inconsistency
- ✅ Better error handling and progress tracking

---

## ✅ Completed (Phase 2 - Continued)

### 3. Adjustment Notes Module
**File:** `scripts/modules/adjustment-notes.ts` ✅
**Config:** `scripts/config/adjustment-notes.config.ts` ✅

**Reference:** load-setup.ts lines 2517-2708

**Key Features:**
- ✅ **Sales Invoices:** 80% credit notes, 20% debit notes
  - Only eligible invoices with outstanding > 0
  - 22.5% of eligible sales invoices get adjustment notes
  - Item-level adjustments with quantity, rate, GST
  - RPC: `create_adjustment_note_with_items`

- ✅ **Purchase Invoices:** 80% debit notes, 20% credit notes
  - Only eligible invoices with outstanding > 0
  - 22.5% of eligible purchase invoices get adjustment notes
  - Item-level adjustments with quantity, rate, GST
  - RPC: `create_adjustment_note_with_items`

- ✅ **Cancellations:** 8% of adjustment notes are cancelled
  - Random cancellation reasons
  - Updates `is_cancelled`, `cancelled_at`, `cancelled_by`, `cancellation_reason`

**Completed Implementation:**
1. ✅ Split into two separate functions: `generateSalesAdjustmentNotes()` and `generatePurchaseAdjustmentNotes()`
2. ✅ Fetch existing adjustment notes by invoice type internally
3. ✅ Fetch all invoices internally and filter by outstanding > 0
4. ✅ Select 22.5% of eligible invoices for adjustment notes
5. ✅ Generate random items (1-3 items per note) with quantity, rate, GST
6. ✅ Create adjustment notes using RPC with items
7. ✅ Apply cancellations (8% rate) with random reasons
8. ✅ Return array of created adjustment notes
9. ✅ `fetchReturnLedgers()` helper for reusable ledger fetching
10. ✅ Integrated into setup-phase1.ts with both sales and purchase

**Config:**
```typescript
export const ADJUSTMENT_NOTES_CONFIG = {
  adjustmentRate: 0.225, // 22.5% (between 20-25%)
  salesCreditRate: 0.8, // 80% credit, 20% debit
  purchaseDebitRate: 0.8, // 80% debit, 20% credit
  cancellationRate: 0.08, // 8% cancelled
  adjustmentAmountRange: [0.1, 0.3], // 10-30% of outstanding
  itemQuantityRange: [1, 10],
  itemRateRange: [50, 500],
  itemsPerNote: [1, 3],
  adjustmentDateOffsetDays: { min: 1, max: 30 },
  gstRates: [0, 5, 12, 18],
  reasons: { credit: [...], debit: [...] },
  cancellationReasons: [...],
} as const;
```

**Improvements Made:**
- ✅ Split into focused functions for sales/purchase
- ✅ Move all hardcoded probabilities to config
- ✅ Deduplicated code via shared helpers
- ✅ Integrated cancellation logic
- ✅ Only eligible invoices (outstanding > 0)
- ✅ Better error handling and progress tracking
- ✅ Tested successfully: 19 adjustment notes created (11 sales + 8 purchase)

---

### 4. Payments Module
**File:** `scripts/modules/payments.ts` ✅
**Config:** `scripts/config/payments.config.ts` ✅

**Reference:** load-setup.ts lines 2714-3240

**Key Features:**
- ✅ **Payment Receipts:** Customer payments for sales invoices
  - 100% of sales invoices get payment receipts
  - 70% full payment, 30% partial payment (30-80% of outstanding)
  - Payment modes: cash (10%), cheque (15%), neft (40%), rtgs (10%), upi (20%), card (5%)
  - Realistic payment instrument details (cheque numbers, transaction IDs, UPI VPA, card last 4, IFSC codes)
  - Single invoice allocation (against_ref)
  - RPC: `create_payment_with_allocations`

- ✅ **Payment Made:** Supplier payments for purchase invoices
  - 87.5% of purchase invoices get payments
  - 70% full payment, 30% partial payment (30-80% of outstanding)
  - Payment modes: same distribution as receipts
  - TDS applicable: 15% of payments with rates [0.1%, 1%, 2%]
  - Realistic payment instrument details
  - Single invoice allocation (against_ref)
  - RPC: `create_payment_with_allocations`

- ✅ **Cancellations:** 5% of payments are cancelled
  - Random cancellation reasons
  - Updates `is_cancelled`, `cancelled_at`, `cancelled_by`, `cancellation_reason`

**Completed Implementation:**
1. ✅ Split into two separate functions: `generatePaymentReceipts()` and `generatePaymentMade()`
2. ✅ Fetch existing payments by voucher type internally
3. ✅ Fetch all invoices internally and filter by outstanding > 0
4. ✅ Generate payment mode using configured distribution
5. ✅ Generate realistic payment instrument details per payment mode
6. ✅ Create payments using RPC with allocations
7. ✅ Apply cancellations (5% rate) with random reasons
8. ✅ Return array of created payments
9. ✅ `fetchPaymentLedgers()` helper for reusable ledger fetching
10. ✅ Integrated into setup-phase1.ts with both receipts and payments made

**Config:**
```typescript
export const PAYMENTS_CONFIG = {
  paymentReceiptRate: 1.0,      // 100%
  paymentMadeRate: 0.875,       // 87.5%
  fullPaymentRate: 0.7,         // 70% full, 30% partial
  partialPaymentRange: [0.3, 0.8], // 30-80% of outstanding

  // Payment mode distribution
  paymentModeDistribution: {
    cash: 0.1, cheque: 0.15, neft: 0.4, rtgs: 0.1, upi: 0.2, card: 0.05
  },

  // TDS configuration (purchase only)
  tdsApplicableRate: 0.15,      // 15%
  tdsRates: [0.1, 1, 2],        // 0.1%, 1%, 2%

  // Cancellation
  cancellationRate: 0.05,       // 5%

  // Instrument detail probabilities
  instrumentDetailProbabilities: { ... },

  // Banks, branches, IFSC codes, UPI handles
  banks: [...], branches: [...], ifscPrefixes: [...], upiHandles: [...]
} as const;
```

**Improvements Made:**
- ✅ Split into focused functions for receipts/payments made
- ✅ Move all hardcoded probabilities to config
- ✅ Realistic payment instrument details generation
- ✅ TDS handling for purchase payments only
- ✅ Integrated cancellation logic
- ✅ Only eligible invoices (outstanding > 0)
- ✅ Better error handling and progress tracking
- ✅ Tested successfully: 82 payments created (50 receipts + 32 payments made)

---

## 📋 Pending (Phase 2 - Continued)

### 5. QR Batches Module
**File:** `scripts/modules/qr-batches.ts`
**Config:** `scripts/config/qr-batches.config.ts`

**Reference:** load-setup.ts lines 3034-3127

**Key Features:**
- Groups of QR codes for printing
- 10-20 batches per warehouse
- Batch size: 50-200 QR codes per batch
- Status: pending, printed, cancelled
- Links stock units to batches via qr_batch_items

**Implementation Steps:**
1. Fetch existing QR batches
2. Fetch all stock units
3. Create 10-20 batches per warehouse
4. Randomly select 50-200 stock units per batch
5. Assign random status (80% pending, 15% printed, 5% cancelled)
6. Return all batches

**Config:**
```typescript
export const QR_BATCHES_CONFIG = {
  batchesPerWarehouse: 15,
  minBatchSize: 50,
  maxBatchSize: 200,
} as const;
```

---

### 6. Record Status Module
**File:** `scripts/modules/record-status.ts`
**Config:** `scripts/config/record-status.config.ts`

**Reference:** load-setup.ts lines 3133-3240

**Key Features:**
- **Cancellations:** Mark records as cancelled
  - 5% of orders cancelled
  - 3% of invoices cancelled
  - Updates `deleted_at` timestamp

- **Completions:** Mark records as completed
  - Sales orders → completed
  - Purchase orders → completed
  - Goods inwards → completed
  - Goods outwards → completed
  - Updates `status` field

**Implementation Steps:**
1. Fetch all orders and invoices
2. Randomly select records for cancellation based on rates
3. Update `deleted_at` for cancelled records
4. Randomly select fulfilled records for completion
5. Update `status` to 'completed'
6. Return summary statistics

**Config:**
```typescript
export const RECORD_STATUS_CONFIG = {
  orderCancellationRate: 0.05,   // 5%
  invoiceCancellationRate: 0.03, // 3%
} as const;
```

---

## 🧪 Testing Plan

### Phase 1 Testing (Completed)
- [x] Fresh database setup: `npx supabase db reset && npx tsx scripts/setup-phase1.ts local`
- [x] Idempotency test: Run setup-phase1.ts multiple times, verify no duplicates
- [x] Verify all modules work together
- [x] Check data integrity (orders, inventory, stock units)

### Phase 2 Testing (Pending)
- [ ] Test goods transfers module independently
- [ ] Test invoices module independently
- [ ] Test adjustment notes module independently
- [ ] Test payments module independently
- [ ] Test QR batches module independently
- [ ] Test record status module independently
- [ ] Run all Phase 2 modules together in setup-phase1.ts
- [ ] Verify idempotency for all Phase 2 modules
- [ ] Test edge cases (no stock, no orders, etc.)

### Load Testing (Pending)
- [ ] Create `load-setup-phase2.ts` with bulk quantities
- [ ] Test with 500 sales orders, 400 purchase orders
- [ ] Test with 600 goods inwards, 400 goods outwards, 300 transfers
- [ ] Test with 900 invoices, 150 adjustment notes, 850 payments
- [ ] Verify performance (should complete in < 5 minutes)

---

## 📝 Final Steps

### 1. Type Safety Check
```bash
npm run ts
```
- Fix any TypeScript errors
- Ensure all types are properly imported from database.ts
- Verify all RPC function signatures match

### 2. Create Documentation
**File:** `scripts/README.md`

**Contents:**
- Overview of module structure
- Usage instructions for setup-phase1.ts and load-setup.ts
- Configuration guide
- Troubleshooting common issues
- Module dependencies diagram

### 3. Code Quality
- [ ] Remove unused imports
- [ ] Add JSDoc comments to all exported functions
- [ ] Ensure consistent error handling
- [ ] Verify all console logs are informative
- [ ] Check for code duplication

### 4. Migration Guide
**File:** `scripts/MIGRATION_GUIDE.md`

**Contents:**
- How to migrate from old setup.ts to new modular setup
- Breaking changes (if any)
- Configuration changes required
- Database schema dependencies

---

## 📊 Progress Summary

| Category | Total | Completed | Remaining | Progress |
|----------|-------|-----------|-----------|----------|
| Core Modules | 6 | 6 | 0 | 100% |
| Order Modules | 2 | 2 | 0 | 100% |
| Inventory Modules | 3 | 3 | 0 | 100% |
| Transaction Modules | 3 | 3 | 0 | 100% |
| Utility Modules | 2 | 0 | 2 | 0% |
| **Total** | **16** | **14** | **2** | **88%** |

---

## 🎯 Next Immediate Steps

1. ✅ Complete goods-outwards.ts
2. ✅ Implement goods-transfers.ts
3. ✅ Implement invoices.ts (sales + purchase + charges)
4. ✅ Implement adjustment-notes.ts
5. ✅ Implement payments.ts (receipts + made)
6. ⏳ Implement qr-batches.ts
7. ⏳ Implement record-status.ts
8. ⏳ Test all Phase 2 modules together
9. ⏳ Run TypeScript type check
10. ⏳ Create README.md documentation

---

## 📌 Notes

### Design Decisions
- **Idempotency Pattern:** All modules follow "fetch existing → compare → create difference → return all" pattern
- **No Rounding:** Monthly distribution uses simple proportional allocation without remainder distribution
- **Separate Configs:** Each module has its own config file for better maintainability
- **Type Safety:** All functions use TypeScript types from database.ts
- **RPC Functions:** Complex operations use database RPC functions for atomic transactions

### Known Issues
- Some goods outwards may fail due to insufficient stock (expected behavior)
- Monthly distribution may not sum to exact target due to no rounding (acceptable)
- Order statuses must be updated before creating dependent records

### Future Enhancements
- Add progress bars for long-running operations
- Add validation for config values
- Add rollback mechanism for failed operations
- Add detailed error logging to files
- Add performance metrics collection
