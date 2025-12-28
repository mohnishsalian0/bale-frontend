# Bale - Bills, Payments & Accounting Requirements

## Overview
Complete accounting solution for fabric inventory management with **TallyPrime XML export** integration. Handles sales/purchase invoicing, credit/debit notes, bill-wise payment allocation, and comprehensive chart of accounts with **financial year-aware numbering** (April 1 - March 31).

---

## 1. Chart of Accounts

### Parent Groups (28 Tally Standard Groups)
Hierarchical account classification matching TallyPrime standards:

**Assets:**
- Current Assets
  - Bank Accounts
  - Cash-in-Hand
  - Deposits (Asset)
  - Loans & Advances (Asset)
  - Stock-in-Hand
  - Sundry Debtors
- Fixed Assets
- Investments

**Liabilities:**
- Current Liabilities
  - Duties & Taxes
  - Provisions
  - Sundry Creditors
- Loans (Liability)
- Capital Account
- Reserves & Surplus
- Suspense A/c

**Income:**
- Direct Income
  - Sales Accounts
- Indirect Income

**Expense:**
- Direct Expenses
  - Purchase Accounts
- Indirect Expenses

### Ledgers
Company-specific account ledgers with:
- **Bill-wise tracking** for party ledgers (Sundry Debtors/Creditors)
- **GST configuration** (rate, type: CGST/SGST/IGST)
- **TDS/TCS configuration** (applicable, rate)
- **Opening balance** (Debit/Credit)
- **Party linkage** (for customer/vendor/supplier/agent ledgers)
- **Default ledgers** auto-created on company setup

#### Default Ledgers Seeded:
1. **Sales** (Sales Accounts) - is_default
2. **Sales Return** (Sales Accounts) - contra to Sales, used for credit notes
3. **Purchase** (Purchase Accounts) - is_default
4. **Purchase Return** (Purchase Accounts) - contra to Purchase, used for debit notes
5. **CGST** (Duties & Taxes) - gst_rate: 0, gst_type: CGST
6. **SGST** (Duties & Taxes) - gst_rate: 0, gst_type: SGST
7. **IGST** (Duties & Taxes) - gst_rate: 0, gst_type: IGST
8. **TDS Payable** (Duties & Taxes) - tds_rate: 0.1%
9. **TCS Receivable** (Duties & Taxes) - tds_rate: 0.1%
10. **Cash** (Cash-in-Hand) - is_default
11. **Bank Account** (Bank Accounts) - is_default
12. **Sales Discount** (Indirect Expenses)
13. **Purchase Discount** (Indirect Income)
14. **Freight Outward** (Indirect Expenses)
15. **Freight Inward** (Direct Expenses)
16. **Round Off** (Indirect Expenses)

#### Party Ledgers (Auto-created on Partner Creation):
- **Customer** → Sundry Debtors (bill-wise enabled)
- **Vendor/Supplier/Agent** → Sundry Creditors (bill-wise enabled)

---

## 2. Invoicing System

### Sales Invoice
**Number Format:** `INV/2024-25/0001` (FY-aware, April-March)

**Fields:**
- Party Ledger (Sundry Debtor)
- Warehouse
- Invoice Date, Due Date
- **GST Type:** `GST` (same state) or `IGST` (different state) - **selected by user on frontend**
- Payment Terms
- Supplier Invoice Number/Date (for purchase invoices)
- Notes, Attachments

**Financial Calculations:**
1. **Subtotal** = Sum of (quantity × rate) for all items
2. **Discount:**
   - Type: `none`, `percentage`, `fixed`
   - Value: Percentage or fixed amount
   - **Discount Amount = calculated** based on type and value
3. **Taxable Amount** = Subtotal - Discount Amount
4. **GST Breakdown (per item):**
   - **Item GST rate** comes from **frontend** (user confirms if product.gst_rate is null)
   - Proportional discount applied to each item
   - If GST Type = `GST`: **CGST** + **SGST** (split equally, e.g., 18% → 9% + 9%)
   - If GST Type = `IGST`: **IGST** (full rate, e.g., 18%)
5. **Total Tax** = Sum of CGST + SGST + IGST
6. **Pre-Roundoff Total** = Taxable Amount + Total Tax
7. **Round-off Amount** = ROUND(Pre-Roundoff Total) - Pre-Roundoff Total (auto-calculated)
8. **Total Amount** = ROUND(Pre-Roundoff Total)
9. **Outstanding Amount** = Total Amount (initially, reduced by payments)

**Status Tracking:**
- `open` - No payments made (outstanding = total)
- `partially_paid` - Some payments made (0 < outstanding < total)
- `settled` - Fully paid (outstanding = 0)

**IMPORTANT: No Overpaid Status**
- Outstanding amount **MUST NEVER** go below zero
- Prevents overpayment errors and maintains financial data integrity
- Payment allocations that would cause negative outstanding are **rejected with error**
- Credit notes that exceed outstanding are **rejected with error**

**Snapshot Fields (Captured at Invoice Creation):**
- **Warehouse:** name, address, state, GST number
- **Party:** name, company_name, email, phone, address, state, GST number, PAN number

**Linking:**
- **Goods Outward** → Invoice (many-to-many via `invoice_outwards`)
- **Goods Inward** → Invoice (many-to-many via `invoice_inwards`)
- Auto-updates `has_invoice` flag on goods movements

**Immutability Rules:**
- ❌ Cannot delete/edit critical fields if `has_payment = true`
- ❌ Cannot delete/edit if `exported_to_tally_at IS NOT NULL`
- ❌ Linked goods movements cannot be deleted if `has_invoice = true`

---

### Purchase Invoice
**Number Format:** `PINV/2024-25/0001`

**All fields same as Sales Invoice**, plus:
- **Supplier Invoice Number** (vendor's bill number)
- **Supplier Invoice Date** (vendor's bill date)

---

## 3. Adjustment Notes (Credit/Debit Notes)

### Credit Note
**Number Format:** `CN/2024-25/0001`

**Purpose:** Reduce invoice amount (sales returns, discounts, errors)

### Debit Note
**Number Format:** `DN/2024-25/0001`

**Purpose:** Document type based on invoice type (Indian Convention)

**Fields:**
- **Invoice Reference** (mandatory)
- **Warehouse**
- Adjustment Date
- Adjustment Type: `credit` or `debit`
- Reason (mandatory)
- Notes, Attachments
- **Cancellation Fields:**
  - `is_cancelled` (boolean, default false)
  - `cancelled_at` (timestamp)
  - `cancelled_by` (user UUID)
  - `cancellation_reason` (text, required for cancellation)

**Financial Calculations:**
1. **Inherits GST Type from Invoice** (GST or IGST)
2. **Subtotal** = Sum of (quantity × rate)
3. **GST Breakdown:**
   - **Tax Rate Versioning:** Credit/Debit notes MUST use the original invoice's tax rates (from invoice_items), NOT the current Product Master rates
   - This ensures historical accuracy even if product GST rates change after invoice creation
   - Same logic as invoices (CGST+SGST or IGST based on invoice's gst_type)
4. **Total Tax** = Sum of CGST + SGST + IGST
5. **Pre-Roundoff Total** = Subtotal + Total Tax
6. **Round-off Amount** = ROUND(Pre-Roundoff Total) - Pre-Roundoff Total
7. **Total Amount** = ROUND(Pre-Roundoff Total)

**Snapshot Fields:**
- Same as invoices (warehouse, party)

**Items:**
- **Independent of invoice items** (no FK to invoice_items)
- Product, Quantity, Rate, GST Rate
- Tax breakdown (CGST/SGST/IGST)

**Impact on Invoice (Indian Convention):**
The system follows **Indian Accounting Convention** where adjustment behavior depends on both invoice type AND adjustment type:

| Invoice Type | Adjustment Type | Effect on Outstanding | Sign | Typical Use Case |
|--------------|----------------|----------------------|------|------------------|
| **Sales** | Credit Note | **Reduce** (customer owes less) | -1 | Customer returns, discounts |
| **Sales** | Debit Note | **Increase** (customer owes more) | +1 | Additional charges to customer |
| **Purchase** | Debit Note | **Reduce** (we owe supplier less) | -1 | We return goods to supplier |
| **Purchase** | Credit Note | **Increase** (we owe supplier more) | +1 | Supplier additional charges (rare) |

**Business Logic:**
- **Credit Note**: Typically used for sales invoices to reduce receivables
- **Debit Note**: Typically used for purchase invoices to reduce payables
- Both can be used on either invoice type with different effects
- Trigger auto-updates `invoice.outstanding_amount` and `invoice.has_adjustment` flag

**Cancellation Rules:**
- ✅ Can cancel if `cancellation_reason` provided
- ✅ Cannot edit cancelled adjustment notes
- ✅ Cannot delete cancelled adjustment notes
- ✅ Cannot cancel if exported to Tally
- ✅ When cancelled: Outstanding restored to pre-adjustment state (reverses the original effect)
- ✅ When cancelled: `has_adjustment` flag updated based on remaining active adjustments
- ✅ Deleted adjustments that were already cancelled don't restore outstanding (prevents double-restoration)

---

## 4. Payment System

### Payment Voucher
**Number Format:** `PMT/2024-25/0001` (Payment Out)

### Receipt Voucher
**Number Format:** `RCT/2024-25/0001` (Payment In)

**Fields:**
- Voucher Type: `payment` or `receipt`
- **Party Ledger** (Sundry Debtor/Creditor)
- **Counter Ledger** (Bank or Cash) - renamed from bank_ledger_id
- Payment Date
- Payment Mode: `cash`, `cheque`, `neft`, `rtgs`, `upi`, `card`
- Reference Number (e.g., cheque number)
- **Reference Date** (instrument date, e.g., cheque date)
- Notes, Attachments

**TDS Handling:**
- **TDS Applicable:** Boolean
- **TDS Rate:** Percentage
- **TDS Amount** = Total Amount × (TDS Rate / 100)
- **Net Amount** = Total Amount - TDS Amount

**Bill-wise Allocation:**
Each payment can be allocated to:
1. **Against Reference** (`against_ref`):
   - Links to specific invoice
   - Amount ≤ Invoice Outstanding
   - Auto-reduces invoice outstanding
2. **Advance** (`advance`):
   - No invoice link
   - Can be used later against future invoices

**Auto-Advance Allocation:**
- **Automatic remainder handling:** Any unallocated amount automatically creates an `advance` allocation
- **Complete accounting:** Ensures `SUM(allocations) = net_amount` (every rupee is accounted for)
- **Matches TallyPrime behavior:** Similar to Tally's "On Account" feature for unallocated payments
- **User convenience:** No need to manually create advance entry for remaining amount

**Validations:**
- Sum of allocations ≤ Net Amount
- Against_ref must have invoice_id
- Advance must NOT have invoice_id
- Allocation amount ≤ invoice outstanding

**Snapshot Fields:**
- **Party:** name, company_name, GST number, PAN number
- **Counter Ledger:** name

**Triggers:**
- Auto-updates invoice.outstanding_amount on allocation
- Updates invoice.has_payment flag
- Updates invoice.status (open/partially_paid/settled/overpaid)

---

## 5. Financial Year & Sequence Numbering

### Financial Year
- **Start:** April 1
- **End:** March 31
- **Format:** `2024-25` (short form) or `2024-2025` (full)

### Sequence Number Generation
**Pattern:** `PREFIX/FY/SEQNO`

Examples:
- Invoice: `INV/2024-25/0001`, `INV/2024-25/0002`
- Purchase Invoice: `PINV/2024-25/0001`
- Credit Note: `CN/2024-25/0001`
- Debit Note: `DN/2024-25/0001`
- Payment: `PMT/2024-25/0001`
- Receipt: `RCT/2024-25/0001`

**Sequence Logic:**
- Auto-incremented per table per company
- Uses **PostgreSQL SEQUENCE objects** (native, atomic, thread-safe)
- Sequences auto-created on first use per company via `get_next_sequence()` function
- Format: `seq_{company_id}_{table_name}` (e.g., `seq_123abc_invoices_sales`)
- FY calculated from transaction date
- No locking required (atomic by design)

---

## 6. GST Compliance (Indian Tax System)

### GST Type Determination
**User-selected on frontend** (not auto-calculated):
- **GST (CGST + SGST):** When warehouse state = party state (intra-state)
- **IGST:** When warehouse state ≠ party state (inter-state)

### GST Rate Handling
- **Product-level default:** `products.gst_rate` (can be NULL)
- **Invoice-level override:** **User confirms/selects GST rate on frontend**
- **Item-level storage:** Each invoice_item stores final GST rate used

### GST Calculation
**For GST Type = GST:**
```
CGST Rate = GST Rate / 2 (e.g., 18% → 9%)
SGST Rate = GST Rate / 2 (e.g., 18% → 9%)
CGST Amount = Taxable Amount × (CGST Rate / 100)
SGST Amount = Taxable Amount × (SGST Rate / 100)
Total Tax = CGST Amount + SGST Amount
```

**For GST Type = IGST:**
```
IGST Rate = GST Rate (e.g., 18%)
IGST Amount = Taxable Amount × (IGST Rate / 100)
Total Tax = IGST Amount
```

### HSN Code
- Stored at product level
- Snapshotted in invoice items
- Required for GST compliance

### GST Number Validation
- **Format:** 15-character alphanumeric (e.g., `27AABCU9603R1ZM`)
- **Pattern:** `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
- **Database CHECK constraint** enforces validation on:
  - `companies.gst_number`
  - `partners.gst_number`
- Invalid GST numbers are rejected at database level

---

## 7. Data Integrity & Robustness

### Financial Data Criticality
**Accounting data is mission-critical and requires absolute accuracy:**

1. **Atomic Transactions:**
   - All RPC functions use database transactions
   - Invoice + Items + Junction records created atomically
   - Rollback on any failure

2. **Immutability Safeguards:**
   - Prevent edits to invoiced goods movements
   - Lock invoices after payment
   - Lock invoices after Tally export
   - Soft deletes preferred over hard deletes

3. **Referential Integrity:**
   - Foreign key constraints everywhere
   - Cascade deletes only where safe (e.g., invoice → items)
   - Restrict deletes where needed (e.g., invoice_outwards → goods_outwards)

4. **Validation Constraints:**
   - CHECK constraints for amounts (outstanding ≥ 0)
   - CHECK constraints for enums
   - Unique constraints on sequence numbers
   - NOT NULL on critical fields

5. **Audit Trail:**
   - created_at, updated_at (auto-managed)
   - created_by, modified_by (auto-populated from JWT)
   - deleted_at (soft deletes)
   - Never lose historical data

6. **Calculation Accuracy:**
   - DECIMAL(10,2) for all amounts (not FLOAT)
   - Rounding rules: Round to nearest rupee
   - **Proportional discount distribution with penny gap fix:**
     - Each item gets proportional share of invoice discount
     - Last item receives the remainder to ensure `SUM(line_discounts) = invoice_discount` exactly
     - Prevents rounding errors in accounting reconciliation
   - Tax calculated per-item, then aggregated

7. **State Management:**
   - Invoice status auto-updates based on payments
   - Outstanding amounts auto-calculated by triggers
   - has_invoice, has_payment flags auto-maintained

8. **Immutability Safeguards (Enhanced):**
   - **Critical fields locked after payment/export:**
     - `invoice_date`, `invoice_type`, `gst_type` (cannot be changed)
     - `total_amount`, `taxable_amount`, `party_ledger_id` (cannot be changed)
   - Trigger: `trigger_prevent_invoice_edit` enforces these restrictions
   - Create adjustment notes instead for corrections

9. **Soft Delete Filtering:**
   - RLS policies include `deleted_at IS NULL` filter
   - Applies to: invoices, adjustment_notes, payments, ledgers
   - Prevents soft-deleted records from appearing in queries
   - Maintains audit trail while hiding deleted records

---

## 8. TallyPrime XML Export Integration

### Purpose
Export all accounting transactions to **TallyPrime** for:
- Statutory compliance (GST returns, audit reports)
- Advanced accounting features (depreciation, payroll, etc.)
- Backup and data portability
- Professional financial reporting

### Export Scope
**All accounting entities must be exportable:**
1. **Ledgers** (Chart of Accounts)
2. **Sales Invoices** (Sales Vouchers)
3. **Purchase Invoices** (Purchase Vouchers)
4. **Credit Notes** (Credit Note Vouchers)
5. **Debit Notes** (Debit Note Vouchers)
6. **Payments** (Payment Vouchers)
7. **Receipts** (Receipt Vouchers)
8. **Stock Items** (Products)
9. **Stock Groups** (Product Categories)
10. **Party Ledgers** (Sundry Debtors/Creditors)

### TallyPrime XML Format
**Version:** TallyPrime Release 3.0 or higher
**Schema:** Tally XML Standard (ENVELOPE → HEADER → BODY → IMPORTDATA)

**Key Requirements:**
- **GUID mapping:** Each record gets unique Tally GUID
- **Master creation before transactions:** Ledgers, Stock Items must exist before vouchers
- **Party bill references:** Bill-wise details for party ledgers
- **GST compliance:** GST ledgers, GSTIN, place of supply, HSN codes
- **Multi-currency support:** (future, if needed)

### Export Tracking
**Fields on invoices/payments:**
- `tally_guid` - Unique identifier in Tally (mapped to Bale UUID as REMOTEID)
- `tally_export_status` - `pending`, `success`, `failed`
- `tally_export_error` - Error message if failed
- `exported_to_tally_at` - Timestamp of successful export

**Export Rules:**
1. **One-time export:** Once exported, records are **locked** (cannot edit/delete)
2. **Incremental sync:** Only export new/modified records
3. **Idempotency:** Re-exporting same record should be safe (use GUID for updates)
4. **Error handling:** Failed exports should be retryable without data corruption
5. **UUID Mapping:** Use Bale UUIDs mapped to Tally REMOTEID (not Tally-generated GUIDs)

### Data Mapping (Bale → Tally)

#### 1. Ledgers (Masters)
```xml
<LEDGER NAME="Acme Textiles" RESERVEDNAME="">
  <PARENT>Sundry Debtors</PARENT>
  <ISBILLWISEACTIVE>Yes</ISBILLWISEACTIVE>
  <OPENINGBALANCE>0</OPENINGBALANCE>
  <MAILINGNAME>Acme Textiles</MAILINGNAME>
  <ADDRESS.LIST>
    <ADDRESS>123 Main St, Mumbai</ADDRESS>
  </ADDRESS.LIST>
  <LEDSTATENAME>Maharashtra</LEDSTATENAME>
  <PARTYGSTIN>27AABCU9603R1ZM</PARTYGSTIN>
</LEDGER>
```

#### 2. Sales Invoice
```xml
<VOUCHER VOUCHERTYPENAME="Sales" ACTION="Create">
  <DATE>20240101</DATE>
  <VOUCHERNUMBER>INV/2024-25/0001</VOUCHERNUMBER>
  <PARTYLEDGERNAME>Acme Textiles</PARTYLEDGERNAME>
  <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>

  <!-- Line Items -->
  <ALLINVENTORYENTRIES.LIST>
    <STOCKITEMNAME>Cotton Fabric 100 GSM</STOCKITEMNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <RATE>500/Metre</RATE>
    <AMOUNT>-50000</AMOUNT>
    <BILLEDQTY>100 Mtr</BILLEDQTY>

    <!-- GST Breakdown -->
    <BATCHALLOCATIONS.LIST>
      <GODOWNNAME>Main Warehouse</GODOWNNAME>
      <BATCHNAME>Batch-001</BATCHNAME>
      <AMOUNT>-50000</AMOUNT>
    </BATCHALLOCATIONS.LIST>

    <ACCOUNTINGALLOCATIONS.LIST>
      <LEDGERNAME>CGST @ 9%</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>-4500</AMOUNT>
    </ACCOUNTINGALLOCATIONS.LIST>

    <ACCOUNTINGALLOCATIONS.LIST>
      <LEDGERNAME>SGST @ 9%</LEDGERNAME>
      <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
      <AMOUNT>-4500</AMOUNT>
    </ACCOUNTINGALLOCATIONS.LIST>
  </ALLINVENTORYENTRIES.LIST>

  <!-- Party Ledger Entry -->
  <LEDGERENTRIES.LIST>
    <LEDGERNAME>Acme Textiles</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>59000</AMOUNT>
    <BILLALLOCATIONS.LIST>
      <NAME>INV/2024-25/0001</NAME>
      <BILLTYPE>New Ref</BILLTYPE>
      <AMOUNT>59000</AMOUNT>
    </BILLALLOCATIONS.LIST>
  </LEDGERENTRIES.LIST>

  <!-- Sales Account Entry -->
  <LEDGERENTRIES.LIST>
    <LEDGERNAME>Sales</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>-50000</AMOUNT>
  </LEDGERENTRIES.LIST>

  <!-- GST Ledger Entries -->
  <LEDGERENTRIES.LIST>
    <LEDGERNAME>CGST @ 9%</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>-4500</AMOUNT>
  </LEDGERENTRIES.LIST>

  <LEDGERENTRIES.LIST>
    <LEDGERNAME>SGST @ 9%</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>-4500</AMOUNT>
  </LEDGERENTRIES.LIST>
</VOUCHER>
```

#### 3. Payment Voucher (with Bill Allocation)
```xml
<VOUCHER VOUCHERTYPENAME="Payment" ACTION="Create">
  <DATE>20240115</DATE>
  <VOUCHERNUMBER>PMT/2024-25/0001</VOUCHERNUMBER>
  <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>

  <!-- Party Ledger (Credit) -->
  <LEDGERENTRIES.LIST>
    <LEDGERNAME>Acme Textiles</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>-50000</AMOUNT>
    <BILLALLOCATIONS.LIST>
      <NAME>INV/2024-25/0001</NAME>
      <BILLTYPE>Agst Ref</BILLTYPE>
      <AMOUNT>-50000</AMOUNT>
    </BILLALLOCATIONS.LIST>
  </LEDGERENTRIES.LIST>

  <!-- Bank/Cash Ledger (Debit) -->
  <LEDGERENTRIES.LIST>
    <LEDGERNAME>HDFC Bank</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>50000</AMOUNT>
    <BANKALLOCATIONS.LIST>
      <DATE>20240115</DATE>
      <INSTRUMENTNUMBER>123456</INSTRUMENTNUMBER>
      <TRANSACTIONTYPE>Cheque</TRANSACTIONTYPE>
      <PAYMENTMODE>Transacted</PAYMENTMODE>
    </BANKALLOCATIONS.LIST>
  </LEDGERENTRIES.LIST>
</VOUCHER>
```

### Export Robustness Requirements

1. **Validation Before Export:**
   - Verify all required fields are present
   - Validate GST numbers (format check)
   - Ensure accounting equation balances (Debit = Credit)
   - Check for orphaned records (items without parent)

2. **Error Handling:**
   - Log all export attempts (success/failure)
   - Store error messages for debugging
   - Retry mechanism for transient failures
   - Manual retry option for failed exports

3. **Data Consistency:**
   - Export in dependency order: Masters → Vouchers
   - Handle duplicate prevention (use GUIDs)
   - Maintain referential integrity in export
   - Transaction-safe: All or nothing for batch exports

4. **Testing Requirements:**
   - Test roundtrip: Export → Import → Verify
   - Test edge cases: Zero amounts, negative amounts, multi-currency
   - Test with actual TallyPrime (not just XML validation)
   - Test large datasets (1000+ invoices)

5. **Documentation:**
   - XML schema documentation
   - Mapping table (Bale fields → Tally XML tags)
   - Export troubleshooting guide
   - Sample XML files for each voucher type

---

## 9. RPC Functions (Database Layer)

### 1. `seed_company_ledgers(p_company_id UUID)`
**Purpose:** Create default ledgers when new company is created

**Creates:**
- Sales, Purchase ledgers
- GST ledgers (CGST, SGST, IGST) - default rate 0
- TDS/TCS ledgers - default rate 0.1%
- Cash, Bank ledgers
- Discount ledgers (Sales Discount, Purchase Discount)
- Freight ledgers (Freight Outward - Indirect Expense, Freight Inward - Direct Expense)
- Round Off ledger

---

### 2. `create_party_ledger(p_company_id, p_partner_id, p_partner_name, p_partner_type)`
**Purpose:** Auto-create party ledger when partner is created

**Logic:**
- **Customer** → Sundry Debtors (bill-wise enabled)
- **Vendor/Supplier/Agent** → Sundry Creditors (bill-wise enabled)

**Returns:** Ledger ID

---

### 3. `create_invoice_with_items(...)`
**Purpose:** Atomically create sales or purchase invoice with items and link to goods movements

**Parameters:**
- `p_company_id` - Company UUID
- `p_invoice_type` - **'sales' or 'purchase'**
- `p_party_ledger_id` - Party ledger UUID (customer for sales, vendor for purchase)
- `p_warehouse_id` - Warehouse UUID
- `p_invoice_date` - Invoice date
- `p_payment_terms` - Payment terms text
- `p_due_date` - Payment due date
- `p_gst_type` - **'GST' or 'IGST' (from frontend)**
- `p_discount_type` - 'none', 'percentage', 'fixed'
- `p_discount_value` - Percentage or fixed amount
- `p_supplier_invoice_number` - Supplier's invoice number (NULL for sales, required for purchase)
- `p_supplier_invoice_date` - Supplier's invoice date (NULL for sales, required for purchase)
- `p_notes` - Optional notes
- `p_attachments` - Array of file URLs
- `p_items` - **JSONB array:** `[{product_id, quantity, rate, gst_rate}]` (gst_rate from frontend)
- `p_goods_movement_ids` - Array of goods_outward UUIDs (sales) or goods_inward UUIDs (purchase)

**Process:**
1. Validate invoice_type (must be 'sales' or 'purchase')
2. Validate gst_type (must be 'GST' or 'IGST')
3. Fetch warehouse and party snapshots (fail fast if missing)
4. Calculate financial year from invoice_date
5. Generate sequence number based on invoice_type
6. Generate invoice_number:
   - Sales: `INV/2024-25/0001`
   - Purchase: `PINV/2024-25/0001`
7. Process items via CTE (performance optimized):
   - Extract items from JSONB
   - Calculate line gross amounts
   - Apply proportional discount to each item
   - Calculate GST per item (CGST+SGST or IGST based on gst_type)
8. Aggregate header totals
9. Calculate round_off_amount (to nearest rupee)
10. Insert invoice with complete warehouse/party snapshots
11. Bulk insert invoice_items with product snapshots
12. Link to goods movements:
    - Sales: `invoice_outwards` → `goods_outwards`
    - Purchase: `invoice_inwards` → `goods_inwards`
13. Return invoice_id

**Returns:** Invoice UUID

---

### 4. `create_adjustment_note_with_items(...)`
**Purpose:** Create credit/debit note with items

**Parameters:**
- `p_company_id` - Company UUID
- `p_invoice_id` - Invoice UUID (mandatory reference)
- `p_warehouse_id` - Warehouse UUID
- `p_adjustment_type` - 'credit' or 'debit'
- `p_adjustment_date` - Adjustment date
- `p_reason` - Reason for adjustment (mandatory)
- `p_notes` - Optional notes
- `p_attachments` - Array of file URLs
- `p_items` - **JSONB array:** `[{product_id, quantity, rate, gst_rate}]` (gst_rate from frontend)

**Process:**
1. Validate adjustment_type ('credit' or 'debit')
2. Fetch invoice's gst_type (inherit from invoice)
3. Calculate financial year
4. Generate sequence number and adjustment_number (CN/ or DN/)
5. Calculate subtotal
6. Calculate GST per item using inherited gst_type
7. Calculate round_off_amount
8. Insert adjustment_note with snapshots
9. Insert adjustment_note_items
10. Trigger auto-updates invoice.outstanding_amount
11. Return adjustment_note_id

**Returns:** Adjustment Note UUID

---

### 5. `create_payment_with_allocations(...)`
**Purpose:** Create payment/receipt with bill-wise allocations

**Parameters:**
- `p_company_id` - Company UUID
- `p_voucher_type` - 'payment' or 'receipt'
- `p_party_ledger_id` - Party ledger UUID
- `p_counter_ledger_id` - Bank/Cash ledger UUID
- `p_payment_date` - Payment date
- `p_payment_mode` - 'cash', 'cheque', 'neft', 'rtgs', 'upi', 'card'
- `p_reference_number` - Cheque/transaction number
- `p_reference_date` - Instrument date
- `p_total_amount` - Total payment amount
- `p_tds_applicable` - Boolean
- `p_tds_rate` - TDS percentage
- `p_notes` - Optional notes
- `p_attachments` - Array of file URLs
- `p_allocations` - **JSONB array:** `[{allocation_type, invoice_id, amount_applied}]`

**Allocation Types:**
- `'advance'` - No invoice_id, for future use
- `'against_ref'` - Requires invoice_id, reduces outstanding

**Process:**
1. Validate voucher_type
2. Calculate financial year
3. Generate sequence number and payment_number (PMT/ or RCT/)
4. Calculate TDS amount (if applicable)
5. Calculate net_amount (total - TDS)
6. Validate: Sum of allocations ≤ net_amount
7. Insert payment with party/counter ledger snapshots
8. For each allocation:
   - Validate allocation_type
   - Validate against_ref has invoice_id
   - Validate advance has NO invoice_id
   - Validate amount_applied ≤ invoice.outstanding_amount
   - Insert payment_allocation
9. **Auto-create advance allocation for remainder:**
   - Calculate unallocated amount: `net_amount - SUM(allocations)`
   - If unallocated > 0, create `allocation_type='advance'` record automatically
   - Ensures complete accounting: every rupee is tracked
10. Triggers auto-update invoice.outstanding_amount and status
11. Return payment_id

**Returns:** Payment UUID

---

## 10. Security & RLS Policies

### Multi-Tenancy
- All tables have `company_id` (tenant isolation)
- RLS policies enforce: `company_id = get_jwt_company_id()`
- Users belong to single company (no cross-company access)

### Permission-Based Access
- Uses `authorize('permission.action')` function
- Permissions: `invoices.read`, `invoices.create`, `invoices.update`, `invoices.delete`
- Same for: `payments.*`, `ledgers.*`, `adjustment_notes.*`

### Warehouse-Level Access
- Some entities check `has_warehouse_access(warehouse_id)`
- Admins: Access all warehouses
- Staff: Access assigned warehouses only

### RLS on All Tables:
- `parent_groups` - System-wide, read-only
- `ledgers` - Company-scoped, permission-checked
- `invoices` - Company + permission-checked
- `invoice_items` - Inherited from invoice
- `invoice_outwards` - Company + permission-checked
- `invoice_inwards` - Company + permission-checked
- `adjustment_notes` - Company + permission-checked
- `adjustment_note_items` - Inherited from adjustment_note
- `payments` - Company + permission-checked
- `payment_allocations` - Inherited from payment

---

## 11. UI/UX Considerations (Future Phase)

### Invoice Creation Flow
1. **Select Party:** Customer/Vendor from ledgers (bill-wise enabled)
2. **Select Warehouse:** Determines place of supply
3. **Select GST Type:** User chooses GST or IGST (not auto-calculated)
4. **Add Items:**
   - Product, Quantity, Rate
   - **Confirm GST Rate:** If product.gst_rate is NULL, prompt user to enter
   - Show running subtotal
5. **Apply Discount:** Select type (%, fixed), enter value
6. **Review Calculation:** Show breakdown (subtotal, discount, GST, round-off, total)
7. **Link Goods Movements:** (optional) Select goods_outwards/inwards
8. **Save:** Creates invoice atomically

### Payment Allocation UI
1. **Select Party:** Show outstanding invoices
2. **Enter Amount:** Total payment amount
3. **TDS:** Toggle TDS, enter rate (if applicable)
4. **Allocate:**
   - Show list of open invoices with outstanding amounts
   - User selects invoices and allocates amounts
   - Option to leave as "Advance"
5. **Review:** Show net amount, allocations
6. **Save:** Creates payment with allocations

### Reports (Future)
- **Outstanding Receivables/Payables** (bill-wise)
- **GST Summary** (CGST/SGST/IGST totals)
- **Ledger Statement** (party-wise)
- **Profit & Loss** (income vs expense)
- **Balance Sheet** (assets vs liabilities)
- **Trial Balance**

---

## 12. Edge Cases & Business Rules

### Null Handling
- **GST Type:** User must select (validation on frontend + backend)
- **Product GST Rate:** User confirms on invoice creation if NULL
- **Warehouse/Party State:** If NULL, GST Type cannot be auto-determined (hence user-selected)

### Zero Amounts
- **Zero-value invoices:** Allowed (e.g., free samples)
- **Zero GST rate:** Allowed (e.g., exempt items)
- **Zero discount:** Default

### Negative Amounts
- **Credit Notes:** Reduce outstanding (**validation: cannot exceed current outstanding**)
- **Debit Notes:** Increase outstanding
- **Round-off:** Can be negative or positive

### Overpayment Prevention
- **Outstanding NEVER goes negative** - enforced at multiple levels:
  1. CHECK constraint: `outstanding_amount >= 0`
  2. Payment allocation trigger: Validates before reducing outstanding
  3. Credit note trigger: Validates credit amount ≤ current outstanding
  4. Invoice status trigger: Raises exception if outstanding < 0
- If user tries to overpay, system throws clear error with current outstanding amount

### Partial Allocations
- Payment can be partially allocated (remaining as advance)
- Multiple payments can settle one invoice
- One payment can settle multiple invoices

### Historical Data
- **Never hard delete financial records**
- Use `deleted_at` for soft deletes
- Keep audit trail forever

---

## 13. Future Enhancements (Not in Scope)

- **Bank Reconciliation:** Match bank statements with payment vouchers
- **Inventory Valuation:** FIFO/LIFO/Weighted Average
- **Multi-Currency:** Foreign exchange handling
- **Budgeting:** Budget vs Actual reports
- **Cost Centers:** Department-wise accounting
- **Payroll Integration:** Salary vouchers, TDS deductions
- **E-Way Bill Generation:** GST compliance for goods movement
- **GSTR Filing:** Direct GST return submission
- **Advanced Tally Sync:** Two-way sync (not just export)

---

## 14. Implementation Checklist

### Phase 1: Database Schema ✅
- [x] Parent groups migration
- [x] Ledgers migration with RLS
- [x] Invoices migration with gst_type field
- [x] Invoice items migration
- [x] Invoice outwards/inwards junction tables
- [x] Adjustment notes migration
- [x] Adjustment note items migration
- [x] Payments migration
- [x] Payment allocations migration
- [x] Update goods_inwards/outwards with has_invoice flag
- [x] Update products with tax_type and gst_rate

### Phase 2: RPC Functions ✅
- [x] seed_company_ledgers()
- [x] create_party_ledger()
- [x] create_invoice_with_items() - Unified function for sales and purchase invoices
- [x] create_adjustment_note_with_items()
- [x] create_payment_with_allocations()

### Phase 3: TypeScript Types ✅
- [x] Generate database.ts from schema
- [ ] Create invoices.types.ts (shared types)
- [ ] Create payments.types.ts
- [ ] Create ledgers.types.ts

### Phase 4: Query Layer
- [ ] Create Supabase query functions (queries/invoices.ts, queries/payments.ts)
- [ ] Create TanStack Query hooks (hooks/useInvoices.ts, hooks/usePayments.ts)
- [ ] Add query keys to keys.ts

### Phase 5: UI Components
- [ ] Ledger list/create/edit forms
- [ ] Invoice creation wizard
- [ ] Payment allocation UI
- [ ] Adjustment note forms
- [ ] Outstanding reports
- [ ] GST summary reports

### Phase 6: TallyPrime Integration
- [ ] XML generation logic (invoices → Tally XML)
- [ ] Master export (ledgers, products)
- [ ] Voucher export (invoices, payments)
- [ ] Export status tracking
- [ ] Error handling and retry mechanism
- [ ] Import validation (test roundtrip)
- [ ] Export UI (select date range, filter by status)

---

## 15. Technical Stack

**Database:** PostgreSQL (Supabase)
**Backend:** PostgreSQL Functions (PL/pgSQL)
**Frontend:** Next.js 14+ (App Router), TypeScript
**UI Library:** Shadcn/ui, Tailwind CSS
**Data Fetching:** TanStack Query
**Validation:** Zod
**Date Handling:** date-fns
**Toast Notifications:** Sonner
**Export Format:** TallyPrime XML (custom generation logic)

---

## 16. Success Criteria

### Functional
- ✅ All RPC functions execute without errors
- ✅ Database constraints enforce data integrity
- ✅ Financial calculations accurate to 2 decimal places
- ✅ Sequence numbers unique and FY-aware
- ✅ GST breakdown matches tax type
- ✅ Outstanding amounts auto-update correctly
- [ ] Tally XML exports successfully import into TallyPrime
- [ ] Roundtrip test passes (export → import → verify)

### Non-Functional
- **Performance:** Invoice creation < 500ms for 50 line items
- **Accuracy:** Zero tolerance for calculation errors
- **Reliability:** 99.9% uptime for financial data access
- **Security:** No data leakage across companies (RLS enforced)
- **Auditability:** All changes logged with user/timestamp
- **Compliance:** GST-ready, audit-ready reports

---

## Notes

- **Discount at invoice level only** (not per-item) - proportionally distributed
- **Round-off always to nearest rupee** (Indian standard)
- **Snapshot pattern** for warehouse/party data (immutable history)
- **Bill-wise tracking** is mandatory for party ledgers (Tally requirement)
- **Financial year is April-March** (Indian fiscal year)
- **GST type is user-selected** (not auto-calculated from states)
- **Item GST rates come from frontend** (user-confirmed during invoice creation)
- **TDS on payments, not invoices** (deducted at payment time)
- **Advance payments** are valid (can be allocated later)
- **TallyPrime integration is critical** - must be robust, tested with real Tally software

---

**Document Version:** 2.0
**Last Updated:** 2025-12-18
**Status:** Database schema and RPC functions complete. Ready for frontend implementation and Tally integration.
