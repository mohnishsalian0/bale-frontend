Here is the entire implementation plan converted into clean **Markdown format**:

---

# **Create Invoice from Sales/Purchase Order – Implementation Plan**

## **Overview**

Enable users to create invoices from orders by selecting goods movements (outwards/inwards) in a responsive dialog. The invoice creation flow will prefill data from the selected order and movements.

---

# **Database Changes**

## **1. Add `tax_type` to Orders Tables**

**Files**:

- `supabase/migrations/0022_sales_orders.sql`
- `supabase/migrations/0025_purchase_orders.sql`

```sql
-- Add tax_type to sales_orders
ALTER TABLE sales_orders
  ADD COLUMN tax_type invoice_tax_type_enum DEFAULT 'gst';

-- Add tax_type to purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN tax_type invoice_tax_type_enum DEFAULT 'gst';
```

## **2. Add Order References to Invoices**

**File**: `supabase/migrations/0048_invoices.sql`

```sql
ALTER TABLE invoices
  ADD COLUMN source_sales_order_id UUID REFERENCES sales_orders(id),
  ADD COLUMN source_purchase_order_id UUID REFERENCES purchase_orders(id);

CREATE INDEX idx_invoices_source_sales_order ON invoices(source_sales_order_id);
CREATE INDEX idx_invoices_source_purchase_order ON invoices(source_purchase_order_id);
```

## **3. Remove Legacy `invoice_number` from Orders**

```sql
ALTER TABLE sales_orders DROP COLUMN invoice_number;
ALTER TABLE purchase_orders DROP COLUMN invoice_number;
```

## **4. Rename & Update Invoice-Movement Junction Tables**

**File:** `0050_invoice_movements.sql`

✔ Keep existing `invoice_outwards` & `invoice_inwards`
✔ Triggers already handle:

- Setting `has_invoice = true` on insert
- Resetting it on delete if no remaining references

## **5. Update `create_invoice_with_items` RPC**

**File:** `0056_invoice_functions.sql`

Add new params:

```sql
CREATE OR REPLACE FUNCTION create_invoice_with_items(
  ...
  p_source_sales_order_id UUID DEFAULT NULL,
  p_source_purchase_order_id UUID DEFAULT NULL,
  p_goods_movement_ids UUID[] DEFAULT NULL
)
```

Core logic steps:

1. Insert invoice with sales/purchase order reference
2. Insert movement linkage records
3. Triggers update `has_invoice`

---

# **Frontend Changes**

## **1. Invoice Selection Dialog Component**

**File:** `src/components/layouts/invoice-selection-dialog.tsx`

```ts
interface InvoiceSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderType: "sales" | "purchase";
  orderNumber: string;
  movements: GoodsOutward[] | GoodsInward[];
  onConfirm: (selectedIds: string[], invoiceFullOrder: boolean) => void;
}
```

**Features**

- Multi-select movement rows
- "Invoiced" badge if already invoiced
- “Invoice entire order” option
- Continue disabled until selection

---

## **2. Update Order Detail Layouts**

Add state & fetch movements:

```ts
const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

const { data: movements } = useGoodsOutwardsBySalesOrder(sale_number);
```

Handle confirm:

```ts
const params = new URLSearchParams({
  order: order.sequence_number,
  ...(fullOrder
    ? { full_order: "true" }
    : { movements: selectedIds.join(",") }),
});
router.push(`${baseUrl}?${params}`);
```

---

## **3. Invoice Creation Page Prefill**

**URL Params**

```
?order=SO-123
&movements=id1,id2,id3
&full_order=true
```

Prefill from order:

```ts
setFormData({
  warehouseId: order.warehouse_id,
  partyLedgerId: getPartnerLedgerId(order.customer_id || order.supplier_id),
  invoiceDate: formatDate(new Date()),
  taxType: order.tax_type || "gst",
  notes: `Invoice for ${order.sequence_number}`,
});
```

Aggregate movement items:

```ts
aggregated[productId].quantity += item.quantity_dispatched;
```

**Tax Type Priority**

1. Use `order.tax_type` if present
2. Otherwise warehouse vs partner state logic
3. Then defaults

---

# **Query Updates**

### Fetch Sales Order by Number

```ts
from("sales_orders")
  .select(
    `*, customer:partners!customer_id(*), warehouse:warehouses(*), sales_order_items(*)`,
  )
  .eq("sequence_number", orderNumber);
```

### Updated Invoice RPC Call

```ts
await supabase.rpc("create_invoice_with_items", {
  p_source_sales_order_id: invoiceType === "sales" ? sourceOrderId : null,
  p_source_purchase_order_id: invoiceType === "purchase" ? sourceOrderId : null,
  p_goods_movement_ids: movementIds || null,
});
```

---

# **User Flow Summary**

| Step | Action                                  |
| ---- | --------------------------------------- |
| 1    | User opens sales/purchase order         |
| 2    | Clicks **Create Invoice**               |
| 3    | Select movements or invoice full order  |
| 4    | Redirect to invoice create form         |
| 5    | Auto-prefill with order + movement info |
| 6    | Submit to create invoice and references |

---

# **Edge Cases Handled**

- No movements → still invoice full order
- Movements already invoiced → re-invoice allowed
- Order-level tax_type overrides state-based tax
- Aggregated product quantities across movements
- Rates always from order items (not movements)

---

# **Testing Checklist**

- [ ] Invoice full order with no movements
- [ ] Single movement → invoice
- [ ] Multiple movements with same product → aggregated
- [ ] has_invoice flag updates via triggers
- [ ] Reference visible in invoice detail page
- [ ] Purchase flow: supplier invoice details
- [ ] Rates sourced from order items correctly

---

# **Key Notes**

- 🚫 No quantity-based tracking of invoice coverage
- 🔁 Re-invoicing allowed intentionally
- ⚙️ Triggers manage invoice flags automatically
- 🧾 `order.tax_type` takes highest priority
- 💰 Rate always from order items
