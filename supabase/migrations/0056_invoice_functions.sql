-- Bale Backend - Accounting: Invoice Functions
-- RPC functions for invoice management

-- =====================================================
-- CREATE INVOICE WITH ITEMS FUNCTION (UNIFIED)
-- =====================================================

-- Unified function to create sales or purchase invoice with items atomically
CREATE OR REPLACE FUNCTION create_invoice_with_items(
    p_invoice_type VARCHAR(10), -- 'sales' or 'purchase'
    p_party_ledger_id UUID,
    p_counter_ledger_id UUID, -- Sales/Purchase ledger
    p_warehouse_id UUID,
    p_invoice_date DATE,
    p_tax_type VARCHAR(10), -- 'no_tax', 'gst', or 'igst' - selected by user on frontend
    p_discount_type VARCHAR(10), -- 'none', 'percentage', 'flat_amount'
    p_items JSONB, -- Array of {product_id, quantity, rate} - tax_type and gst_rate pulled from product
    p_payment_terms VARCHAR(100) DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_discount_value DECIMAL(10,2) DEFAULT NULL, -- Percentage value or fixed amount
    p_supplier_invoice_number VARCHAR(50) DEFAULT NULL, -- Only for purchase invoices (pass NULL for sales)
    p_supplier_invoice_date DATE DEFAULT NULL,           -- Only for purchase invoices (pass NULL for sales)
    p_notes TEXT DEFAULT NULL,
    p_attachments TEXT[] DEFAULT NULL,
    p_source_sales_order_id UUID DEFAULT NULL, -- Source sales order reference
    p_source_purchase_order_id UUID DEFAULT NULL, -- Source purchase order reference
    p_goods_movement_ids UUID[] DEFAULT NULL, -- Array of goods_outward IDs (sales) or goods_inward IDs (purchase)
    p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_invoice_id UUID;
    v_sequence_number INTEGER;
    v_invoice_number VARCHAR(50);
    v_slug VARCHAR(50);
    v_invoice_prefix VARCHAR(10);
    v_slug_prefix VARCHAR(10);
    v_financial_year VARCHAR(10);
    v_fy_start_year INTEGER;

    -- Totals
    v_subtotal_amount DECIMAL(10,2) := 0;
    v_discount_amount DECIMAL(10,2) := 0;
    v_taxable_amount DECIMAL(10,2) := 0;
    v_total_cgst DECIMAL(10,2) := 0;
    v_total_sgst DECIMAL(10,2) := 0;
    v_total_igst DECIMAL(10,2) := 0;
    v_round_off DECIMAL(10,2) := 0;
    v_grand_total DECIMAL(10,2) := 0;

    -- Snapshot holders
		v_company_rec RECORD;
    v_warehouse_rec RECORD;
    v_partner_rec RECORD;
    v_party_ledger_name VARCHAR(200);
    v_counter_ledger_name VARCHAR(200);
BEGIN
    v_company_id := COALESCE(p_company_id, get_jwt_company_id());
    -- =====================================================
    -- 1. Validations
    -- =====================================================
    IF p_invoice_type NOT IN ('sales', 'purchase') THEN
        RAISE EXCEPTION 'Invalid invoice_type: %. Must be sales or purchase', p_invoice_type;
    END IF;

    IF p_tax_type NOT IN ('no_tax', 'gst', 'igst') THEN
        RAISE EXCEPTION 'Invalid tax_type: %. Must be no_tax, gst, or igst', p_tax_type;
    END IF;

    -- =====================================================
    -- 2. Fetch Snapshots (Fail fast if missing)
    -- =====================================================
    SELECT * INTO v_company_rec FROM companies WHERE id = v_company_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company not found: %', v_company_id;
    END IF;

    SELECT * INTO v_warehouse_rec FROM warehouses WHERE id = p_warehouse_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Warehouse not found: %', p_warehouse_id;
    END IF;

    SELECT p.*, l.id as ledger_id, l.name as ledger_name
    INTO v_partner_rec
    FROM ledgers l
    JOIN partners p ON l.partner_id = p.id
    WHERE l.id = p_party_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Party ledger not found: %', p_party_ledger_id;
    END IF;

    -- Store party ledger name for snapshot
    v_party_ledger_name := v_partner_rec.ledger_name;

    -- Fetch counter ledger (Sales/Purchase account)
    SELECT name INTO v_counter_ledger_name
    FROM ledgers
    WHERE id = p_counter_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Counter ledger not found: %', p_counter_ledger_id;
    END IF;

    -- =====================================================
    -- 3. Calculate Financial Year & Sequence
    -- =====================================================
    v_fy_start_year := CASE
        WHEN EXTRACT(MONTH FROM p_invoice_date) >= 4 THEN EXTRACT(YEAR FROM p_invoice_date)
        ELSE EXTRACT(YEAR FROM p_invoice_date) - 1
    END;
    v_financial_year := v_fy_start_year::TEXT || '-' || RIGHT((v_fy_start_year + 1)::TEXT, 2);

    -- Set prefix and sequence based on invoice type
    IF p_invoice_type = 'sales' THEN
        v_invoice_prefix := 'INV';
        v_slug_prefix := 'sinv';
    ELSE
        v_invoice_prefix := 'PINV';
        v_slug_prefix := 'pinv';
    END IF;

    v_sequence_number := get_next_sequence('invoices_' || p_invoice_type, v_company_id);
    v_invoice_number := v_invoice_prefix || '/' || v_financial_year || '/' || LPAD(v_sequence_number::TEXT, 4, '0');
    v_slug := v_slug_prefix || '-' || v_sequence_number::TEXT;

    -- =====================================================
    -- 4. Process Items via CTE (The "Brain" of the function)
    -- =====================================================
    -- This unrolls JSON, joins products, calculates line totals, taxes, and proportional discount
    CREATE TEMPORARY TABLE temp_invoice_calculations ON COMMIT DROP AS
    WITH
    -- Step 4.1: Extract items from JSONB with row numbers
    raw_items AS (
        SELECT
            ROW_NUMBER() OVER () as item_seq,
            (elem->>'product_id')::UUID as product_id,
            ROUND((elem->>'quantity')::DECIMAL, 2) as qty,
            ROUND((elem->>'rate')::DECIMAL, 2) as rate
        FROM jsonb_array_elements(p_items) as elem
    ),
    -- Step 4.2: Calculate line gross amounts and total count
    initial_calc AS (
        SELECT
            ri.*,
            (ri.qty * ri.rate) as line_gross_amount,
            COUNT(*) OVER () as total_items
        FROM raw_items ri
    ),
    -- Step 4.3: Calculate total gross for discount apportionment
    summary_stats AS (
        SELECT SUM(line_gross_amount) as total_gross FROM initial_calc
    ),
    -- Step 4.4: Calculate global discount amount
    calc_discount AS (
        SELECT
            total_gross,
            CASE
                WHEN p_discount_type = 'percentage' THEN ROUND(total_gross * (p_discount_value / 100), 2)
                WHEN p_discount_type = 'fixed' THEN p_discount_value
                ELSE 0
            END as global_discount_amount
        FROM summary_stats
    ),
    -- Step 4.5: Calculate proportional discount for each line
    with_proportional_discount AS (
        SELECT
            i.*,
            cd.global_discount_amount,
            ROUND(
                 CASE WHEN cd.total_gross > 0
                      THEN (i.line_gross_amount / cd.total_gross) * cd.global_discount_amount
                      ELSE 0 END, 2
            ) as calculated_discount
        FROM initial_calc i
        CROSS JOIN calc_discount cd
    ),
    -- Step 4.6: Fix penny gap - give remainder to last item
    with_adjusted_discount AS (
        SELECT
            *,
            CASE
                -- Last item gets the remainder to ensure exact match
                WHEN item_seq = total_items THEN
                    global_discount_amount - (SUM(calculated_discount) OVER (ORDER BY item_seq ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING))
                ELSE
                    calculated_discount
            END as line_discount_amount
        FROM with_proportional_discount
    )
    -- Step 4.7: Join products and calculate final taxable value
    -- Pull tax_type and gst_rate from product
    SELECT
        wd.product_id,
        wd.qty,
        wd.rate,
        COALESCE(pr.gst_rate, 0) as gst_rate,
        pr.tax_type,
        wd.line_gross_amount,
        wd.line_discount_amount,
        ROUND(wd.line_gross_amount - wd.line_discount_amount, 2) as line_taxable_value,
        pr.name as product_name,
        pr.hsn_code
    FROM with_adjusted_discount wd
    JOIN products pr ON wd.product_id = pr.id;

    -- =====================================================
    -- 5. Aggregate Header Totals from the Temp Table
    -- =====================================================
    -- We calculate taxes *after* rounding the taxable value per line to ensure consistency
    SELECT
        SUM(line_gross_amount),
        SUM(line_discount_amount),
        SUM(line_taxable_value),

        -- Calculate Taxes on the Rounded Taxable Value
        -- Only calculate tax if invoice tax_type is not 'no_tax' AND product tax_type is 'gst'
        SUM(ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2)), -- CGST
        SUM(ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2)), -- SGST
        SUM(ROUND(CASE WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100) ELSE 0 END, 2))     -- IGST
    INTO
        v_subtotal_amount,
        v_discount_amount,
        v_taxable_amount,
        v_total_cgst,
        v_total_sgst,
        v_total_igst
    FROM temp_invoice_calculations;

    -- Handle nulls if item list was empty
    v_subtotal_amount := COALESCE(v_subtotal_amount, 0);
    v_discount_amount := COALESCE(v_discount_amount, 0);
    v_taxable_amount := COALESCE(v_taxable_amount, 0);
    v_total_cgst := COALESCE(v_total_cgst, 0);
    v_total_sgst := COALESCE(v_total_sgst, 0);
    v_total_igst := COALESCE(v_total_igst, 0);

    -- =====================================================
    -- 6. Final Rounding
    -- =====================================================
    v_grand_total := ROUND(v_taxable_amount + v_total_cgst + v_total_sgst + v_total_igst);
    v_round_off := v_grand_total - (v_taxable_amount + v_total_cgst + v_total_sgst + v_total_igst);

    -- =====================================================
    -- 7. Insert Header with Complete Snapshots
    -- =====================================================
    INSERT INTO invoices (
        company_id, invoice_type, sequence_number, invoice_number, slug,
        party_ledger_id, party_ledger_name, counter_ledger_id, counter_ledger_name,
        warehouse_id, invoice_date, payment_terms, due_date, tax_type,
        subtotal_amount, discount_type, discount_value, discount_amount, taxable_amount,
        total_cgst_amount, total_sgst_amount, total_igst_amount, total_tax_amount,
        round_off_amount, total_amount, notes, attachments,
        -- Source order references
        source_sales_order_id, source_purchase_order_id,
        -- Purchase-specific fields (NULL for sales invoices)
        supplier_invoice_number, supplier_invoice_date,
        -- Warehouse snapshot (complete)
        warehouse_name, warehouse_address_line1, warehouse_address_line2, warehouse_city,
        warehouse_state, warehouse_country, warehouse_pincode,
        -- Party snapshot (complete)
        party_name, party_display_name, party_email, party_phone,
        -- Party billing address
        party_billing_address_line1, party_billing_address_line2, party_billing_city, party_billing_state,
        party_billing_country, party_billing_pincode,
        -- Party shipping address
        party_shipping_address_line1, party_shipping_address_line2, party_shipping_city, party_shipping_state,
        party_shipping_country, party_shipping_pincode,
        party_gst_number, party_pan_number,
        -- Company snapshot (complete)
        company_name, company_address_line1, company_address_line2, company_city,
        company_state, company_country, company_pincode, company_gst_number,
        company_pan_number, company_email, company_phone, company_logo_url, company_website_url
    ) VALUES (
        v_company_id, p_invoice_type::invoice_type_enum, v_sequence_number, v_invoice_number, v_slug,
        p_party_ledger_id, v_party_ledger_name, p_counter_ledger_id, v_counter_ledger_name,
        p_warehouse_id, p_invoice_date, p_payment_terms, p_due_date, p_tax_type::tax_type_enum,
        v_subtotal_amount, p_discount_type::discount_type_enum, p_discount_value, v_discount_amount, v_taxable_amount,
        v_total_cgst, v_total_sgst, v_total_igst, (v_total_cgst + v_total_sgst + v_total_igst),
        v_round_off, v_grand_total, p_notes, p_attachments,
        -- Source order references
        p_source_sales_order_id, p_source_purchase_order_id,
        -- Purchase-specific (NULL for sales)
        p_supplier_invoice_number, p_supplier_invoice_date,
        -- Warehouse Snapshot (complete with NULL handling)
        v_warehouse_rec.name,
        v_warehouse_rec.address_line1,
        v_warehouse_rec.address_line2,
        v_warehouse_rec.city,
        v_warehouse_rec.state,
        v_warehouse_rec.country,
        v_warehouse_rec.pin_code,
        -- Party Snapshot
        v_partner_rec.company_name,
        v_partner_rec.display_name,
        v_partner_rec.email,
        v_partner_rec.phone_number,
        -- Party billing address
        v_partner_rec.billing_address_line1,
        v_partner_rec.billing_address_line2,
        v_partner_rec.billing_city,
        v_partner_rec.billing_state,
        v_partner_rec.billing_country,
        v_partner_rec.billing_pin_code,
        -- Party shipping address (use billing if shipping_same_as_billing = TRUE)
        CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_address_line1 ELSE v_partner_rec.shipping_address_line1 END,
        CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_address_line2 ELSE v_partner_rec.shipping_address_line2 END,
        CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_city ELSE v_partner_rec.shipping_city END,
        CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_state ELSE v_partner_rec.shipping_state END,
        CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_country ELSE v_partner_rec.shipping_country END,
        CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_pin_code ELSE v_partner_rec.shipping_pin_code END,
        v_partner_rec.gst_number,
        v_partner_rec.pan_number,
        -- Company Snapshot
        v_company_rec.name,
        v_company_rec.address_line1,
        v_company_rec.address_line2,
        v_company_rec.city,
        v_company_rec.state,
        v_company_rec.country,
        v_company_rec.pin_code,
        v_company_rec.gst_number,
        v_company_rec.pan_number,
        v_company_rec.email,
        v_company_rec.phone_number,
        v_company_rec.logo_url,
        v_company_rec.website_url
    ) RETURNING id INTO v_invoice_id;

    -- =====================================================
    -- 8. Bulk Insert Items from Temp Table
    -- =====================================================
    INSERT INTO invoice_items (
        company_id, warehouse_id, invoice_id, product_id, quantity, rate, discount_amount, taxable_amount,
        product_name, product_hsn_code, tax_type, gst_rate,
        cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_tax_amount
    )
    SELECT
        v_company_id, p_warehouse_id, v_invoice_id, product_id, qty, rate, line_discount_amount, line_taxable_value,
        product_name, hsn_code,
        tax_type::product_tax_applicability_enum, -- Use tax_type from product
        gst_rate,
        -- CGST (only if invoice tax_type='gst' AND product tax_type='gst')
        CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2),
        -- SGST (only if invoice tax_type='gst' AND product tax_type='gst')
        CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2),
        -- IGST (only if invoice tax_type='igst' AND product tax_type='gst')
        CASE WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN gst_rate ELSE 0 END,
        ROUND(CASE WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100) ELSE 0 END, 2),
        -- Total Tax
        ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100)
                   WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100)
                   ELSE 0 END, 2)
    FROM temp_invoice_calculations;

    -- =====================================================
    -- 9. Link Goods Movements (Bulk Insert)
    -- =====================================================
    IF p_goods_movement_ids IS NOT NULL AND array_length(p_goods_movement_ids, 1) > 0 THEN
        IF p_invoice_type = 'sales' THEN
            -- Link to goods_outwards
            INSERT INTO invoice_outwards (company_id, invoice_id, goods_outward_id)
            SELECT v_company_id, v_invoice_id, UNNEST(p_goods_movement_ids);
        ELSE
            -- Link to goods_inwards
            INSERT INTO invoice_inwards (company_id, invoice_id, goods_inward_id)
            SELECT v_company_id, v_invoice_id, UNNEST(p_goods_movement_ids);
        END IF;
    END IF;

    RETURN v_slug;
END;
$$;

COMMENT ON FUNCTION create_invoice_with_items IS 'Creates a sales or purchase invoice with items atomically. Invoice type determines number prefix (INV/PINV) and goods movement linkage (outwards/inwards). Requires counter_ledger_id (Sales/Purchase account) for double-entry accounting. GST type and item GST rates come from frontend. Accepts optional source_sales_order_id or source_purchase_order_id to link invoice to originating order. Accepts optional goods_movement_ids array to link invoice to specific outwards/inwards. Uses CTE-based calculation for optimal performance. Calculates discount and round-off automatically. Snapshots party and counter ledger names for immutability.';

-- =====================================================
-- UPDATE INVOICE WITH ITEMS FUNCTION
-- =====================================================

-- Update existing invoice with new items atomically
-- Validates business rules: cannot update if cancelled, exported, has payments, or has adjustments
CREATE OR REPLACE FUNCTION update_invoice_with_items(
    p_invoice_id UUID,
    p_party_ledger_id UUID,
    p_counter_ledger_id UUID, -- Sales/Purchase ledger
    p_warehouse_id UUID,
    p_invoice_date DATE,
    p_tax_type VARCHAR(10), -- 'no_tax', 'gst', or 'igst'
    p_discount_type VARCHAR(10), -- 'none', 'percentage', 'flat_amount'
    p_items JSONB, -- Array of {product_id, quantity, rate}
    p_payment_terms VARCHAR(100) DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_discount_value DECIMAL(10,2) DEFAULT NULL,
    p_supplier_invoice_number VARCHAR(50) DEFAULT NULL,
    p_supplier_invoice_date DATE DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_attachments TEXT[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_invoice_type VARCHAR(10);
    v_is_cancelled BOOLEAN;
    v_exported_at TIMESTAMPTZ;
    v_has_payment BOOLEAN;
    v_has_adjustment BOOLEAN;

    -- Totals
    v_subtotal_amount DECIMAL(10,2) := 0;
    v_discount_amount DECIMAL(10,2) := 0;
    v_taxable_amount DECIMAL(10,2) := 0;
    v_total_cgst DECIMAL(10,2) := 0;
    v_total_sgst DECIMAL(10,2) := 0;
    v_total_igst DECIMAL(10,2) := 0;
    v_round_off DECIMAL(10,2) := 0;
    v_grand_total DECIMAL(10,2) := 0;

    -- Snapshot holders
    v_company_rec RECORD;
    v_warehouse_rec RECORD;
    v_partner_rec RECORD;
    v_party_ledger_name VARCHAR(200);
    v_counter_ledger_name VARCHAR(200);
BEGIN
    -- =====================================================
    -- 1. Fetch and Validate Invoice
    -- =====================================================
    SELECT
        company_id, invoice_type, is_cancelled, exported_to_tally_at,
        has_payment, has_adjustment
    INTO
        v_company_id, v_invoice_type, v_is_cancelled, v_exported_at,
        v_has_payment, v_has_adjustment
    FROM invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    -- Business rule validations
    IF v_is_cancelled THEN
        RAISE EXCEPTION 'Cannot update a cancelled invoice';
    END IF;

    IF v_exported_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot update an invoice that has been exported to Tally';
    END IF;

    IF v_has_payment THEN
        RAISE EXCEPTION 'Cannot update an invoice that has payments linked';
    END IF;

    IF v_has_adjustment THEN
        RAISE EXCEPTION 'Cannot update an invoice that has adjustments linked';
    END IF;

    -- Validate tax type
    IF p_tax_type NOT IN ('no_tax', 'gst', 'igst') THEN
        RAISE EXCEPTION 'Invalid tax_type: %. Must be no_tax, gst, or igst', p_tax_type;
    END IF;

    -- =====================================================
    -- 2. Fetch Snapshots (Fail fast if missing)
    -- =====================================================
    SELECT * INTO v_company_rec FROM companies WHERE id = v_company_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Company not found: %', v_company_id;
    END IF;

    SELECT * INTO v_warehouse_rec FROM warehouses WHERE id = p_warehouse_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Warehouse not found: %', p_warehouse_id;
    END IF;

    SELECT p.*, l.id as ledger_id, l.name as ledger_name
    INTO v_partner_rec
    FROM ledgers l
    JOIN partners p ON l.partner_id = p.id
    WHERE l.id = p_party_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Party ledger not found: %', p_party_ledger_id;
    END IF;

    v_party_ledger_name := v_partner_rec.ledger_name;

    SELECT name INTO v_counter_ledger_name
    FROM ledgers
    WHERE id = p_counter_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Counter ledger not found: %', p_counter_ledger_id;
    END IF;

    -- =====================================================
    -- 3. Delete Existing Items
    -- =====================================================
    DELETE FROM invoice_items WHERE invoice_id = p_invoice_id;

    -- =====================================================
    -- 4. Process Items (Same logic as create)
    -- =====================================================
    CREATE TEMPORARY TABLE temp_invoice_calculations ON COMMIT DROP AS
    WITH
    raw_items AS (
        SELECT
            ROW_NUMBER() OVER () as item_seq,
            (elem->>'product_id')::UUID as product_id,
            ROUND((elem->>'quantity')::DECIMAL, 2) as qty,
            ROUND((elem->>'rate')::DECIMAL, 2) as rate
        FROM jsonb_array_elements(p_items) as elem
    ),
    initial_calc AS (
        SELECT
            ri.*,
            (ri.qty * ri.rate) as line_gross_amount,
            COUNT(*) OVER () as total_items
        FROM raw_items ri
    ),
    summary_stats AS (
        SELECT SUM(line_gross_amount) as total_gross FROM initial_calc
    ),
    calc_discount AS (
        SELECT
            total_gross,
            CASE
                WHEN p_discount_type = 'percentage' THEN ROUND(total_gross * (p_discount_value / 100), 2)
                WHEN p_discount_type = 'fixed' THEN p_discount_value
                ELSE 0
            END as global_discount_amount
        FROM summary_stats
    ),
    with_proportional_discount AS (
        SELECT
            i.*,
            cd.global_discount_amount,
            ROUND(
                 CASE WHEN cd.total_gross > 0
                      THEN (i.line_gross_amount / cd.total_gross) * cd.global_discount_amount
                      ELSE 0 END, 2
            ) as calculated_discount
        FROM initial_calc i
        CROSS JOIN calc_discount cd
    ),
    with_adjusted_discount AS (
        SELECT
            *,
            CASE
                WHEN item_seq = total_items THEN
                    global_discount_amount - (SUM(calculated_discount) OVER (ORDER BY item_seq ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING))
                ELSE
                    calculated_discount
            END as line_discount_amount
        FROM with_proportional_discount
    )
    SELECT
        wd.product_id,
        wd.qty,
        wd.rate,
        COALESCE(pr.gst_rate, 0) as gst_rate,
        pr.tax_type,
        wd.line_gross_amount,
        wd.line_discount_amount,
        ROUND(wd.line_gross_amount - wd.line_discount_amount, 2) as line_taxable_value,
        pr.name as product_name,
        pr.hsn_code
    FROM with_adjusted_discount wd
    JOIN products pr ON wd.product_id = pr.id;

    -- =====================================================
    -- 5. Aggregate Header Totals
    -- =====================================================
    SELECT
        SUM(line_gross_amount),
        SUM(line_discount_amount),
        SUM(line_taxable_value),
        SUM(ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2)),
        SUM(ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2)),
        SUM(ROUND(CASE WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100) ELSE 0 END, 2))
    INTO
        v_subtotal_amount,
        v_discount_amount,
        v_taxable_amount,
        v_total_cgst,
        v_total_sgst,
        v_total_igst
    FROM temp_invoice_calculations;

    v_subtotal_amount := COALESCE(v_subtotal_amount, 0);
    v_discount_amount := COALESCE(v_discount_amount, 0);
    v_taxable_amount := COALESCE(v_taxable_amount, 0);
    v_total_cgst := COALESCE(v_total_cgst, 0);
    v_total_sgst := COALESCE(v_total_sgst, 0);
    v_total_igst := COALESCE(v_total_igst, 0);

    -- =====================================================
    -- 6. Final Rounding
    -- =====================================================
    v_grand_total := ROUND(v_taxable_amount + v_total_cgst + v_total_sgst + v_total_igst);
    v_round_off := v_grand_total - (v_taxable_amount + v_total_cgst + v_total_sgst + v_total_igst);

    -- =====================================================
    -- 7. Update Invoice Header with Snapshots
    -- =====================================================
    UPDATE invoices SET
        party_ledger_id = p_party_ledger_id,
        party_ledger_name = v_party_ledger_name,
        counter_ledger_id = p_counter_ledger_id,
        counter_ledger_name = v_counter_ledger_name,
        warehouse_id = p_warehouse_id,
        invoice_date = p_invoice_date,
        payment_terms = p_payment_terms,
        due_date = p_due_date,
        tax_type = p_tax_type::tax_type_enum,
        subtotal_amount = v_subtotal_amount,
        discount_type = p_discount_type::discount_type_enum,
        discount_value = p_discount_value,
        discount_amount = v_discount_amount,
        taxable_amount = v_taxable_amount,
        total_cgst_amount = v_total_cgst,
        total_sgst_amount = v_total_sgst,
        total_igst_amount = v_total_igst,
        total_tax_amount = (v_total_cgst + v_total_sgst + v_total_igst),
        round_off_amount = v_round_off,
        total_amount = v_grand_total,
        -- outstanding_amount will be auto-set by trigger_set_invoice_outstanding when total_amount changes
        notes = p_notes,
        attachments = p_attachments,
        supplier_invoice_number = p_supplier_invoice_number,
        supplier_invoice_date = p_supplier_invoice_date,
        -- Update warehouse snapshot
        warehouse_name = v_warehouse_rec.name,
        warehouse_address_line1 = v_warehouse_rec.address_line1,
        warehouse_address_line2 = v_warehouse_rec.address_line2,
        warehouse_city = v_warehouse_rec.city,
        warehouse_state = v_warehouse_rec.state,
        warehouse_country = v_warehouse_rec.country,
        warehouse_pincode = v_warehouse_rec.pin_code,
        -- Update party snapshot
        party_name = v_partner_rec.company_name,
        party_display_name = v_partner_rec.display_name,
        party_email = v_partner_rec.email,
        party_phone = v_partner_rec.phone_number,
        -- Party billing address
        party_billing_address_line1 = v_partner_rec.billing_address_line1,
        party_billing_address_line2 = v_partner_rec.billing_address_line2,
        party_billing_city = v_partner_rec.billing_city,
        party_billing_state = v_partner_rec.billing_state,
        party_billing_country = v_partner_rec.billing_country,
        party_billing_pincode = v_partner_rec.billing_pin_code,
        -- Party shipping address (use billing if shipping_same_as_billing = TRUE)
        party_shipping_address_line1 = CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_address_line1 ELSE v_partner_rec.shipping_address_line1 END,
        party_shipping_address_line2 = CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_address_line2 ELSE v_partner_rec.shipping_address_line2 END,
        party_shipping_city = CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_city ELSE v_partner_rec.shipping_city END,
        party_shipping_state = CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_state ELSE v_partner_rec.shipping_state END,
        party_shipping_country = CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_country ELSE v_partner_rec.shipping_country END,
        party_shipping_pincode = CASE WHEN v_partner_rec.shipping_same_as_billing THEN v_partner_rec.billing_pin_code ELSE v_partner_rec.shipping_pin_code END,
        party_gst_number = v_partner_rec.gst_number,
        party_pan_number = v_partner_rec.pan_number,
        -- Update company snapshot
        company_name = v_company_rec.name,
        company_address_line1 = v_company_rec.address_line1,
        company_address_line2 = v_company_rec.address_line2,
        company_city = v_company_rec.city,
        company_state = v_company_rec.state,
        company_country = v_company_rec.country,
        company_pincode = v_company_rec.pin_code,
        company_gst_number = v_company_rec.gst_number,
        company_pan_number = v_company_rec.pan_number,
        company_email = v_company_rec.email,
        company_phone = v_company_rec.phone_number,
        company_logo_url = v_company_rec.logo_url,
        company_website_url = v_company_rec.website_url
    WHERE id = p_invoice_id;

    -- =====================================================
    -- 8. Insert New Items
    -- =====================================================
    INSERT INTO invoice_items (
        company_id, warehouse_id, invoice_id, product_id, quantity, rate, discount_amount, taxable_amount,
        product_name, product_hsn_code, tax_type, gst_rate,
        cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_tax_amount
    )
    SELECT
        v_company_id,
        p_warehouse_id,
        p_invoice_id,
        product_id,
        qty,
        rate,
        line_discount_amount,
        line_taxable_value,
        product_name,
        hsn_code,
        tax_type::product_tax_applicability_enum,
        gst_rate,
        -- CGST rate and amount
        CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2),
        -- SGST rate and amount
        CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 2 / 100) ELSE 0 END, 2),
        -- IGST rate and amount
        CASE WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN gst_rate ELSE 0 END,
        ROUND(CASE WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100) ELSE 0 END, 2),
        -- Total Tax
        ROUND(CASE WHEN p_tax_type = 'gst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100)
                   WHEN p_tax_type = 'igst' AND tax_type = 'gst' THEN line_taxable_value * (gst_rate / 100)
                   ELSE 0 END, 2)
    FROM temp_invoice_calculations;
END;
$$;

COMMENT ON FUNCTION update_invoice_with_items IS 'Updates an existing invoice with new items atomically. Validates that invoice can be edited (not cancelled, not exported, no payments, no adjustments). Deletes old items and recalculates all totals. Updates all snapshots (party, warehouse, company) to latest values.';
