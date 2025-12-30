-- Bale Backend - Accounting: Adjustment Note Functions
-- RPC functions for credit/debit note management

-- =====================================================
-- CREATE ADJUSTMENT NOTE WITH ITEMS FUNCTION
-- =====================================================

-- Function to create adjustment note (credit/debit) with items atomically
CREATE OR REPLACE FUNCTION create_adjustment_note_with_items(
    p_invoice_id UUID,
    p_warehouse_id UUID,
    p_counter_ledger_id UUID, -- Sales Return/Purchase Return ledger
    p_adjustment_type VARCHAR(10), -- 'credit' or 'debit'
    p_adjustment_date DATE,
    p_reason TEXT,
    p_notes TEXT,
    p_attachments TEXT[],
    p_items JSONB, -- Array of {product_id, quantity, rate, gst_rate}
    p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_adjustment_note_id UUID;
    v_sequence_number INTEGER;
    v_adjustment_number VARCHAR(50);
    v_slug VARCHAR(50);
    v_slug_prefix VARCHAR(10);
    v_financial_year VARCHAR(10);
    v_fy_start_year INTEGER;

    -- Totals
    v_subtotal_amount DECIMAL(10,2) := 0;
    v_total_cgst DECIMAL(10,2) := 0;
    v_total_sgst DECIMAL(10,2) := 0;
    v_total_igst DECIMAL(10,2) := 0;
    v_total_tax DECIMAL(10,2) := 0;
    v_round_off DECIMAL(10,2) := 0;
    v_grand_total DECIMAL(10,2) := 0;

    -- Invoice context
    v_gst_type VARCHAR(10);
    v_invoice_type VARCHAR(10);
    v_party_ledger_id UUID;

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
    IF p_adjustment_type NOT IN ('credit', 'debit') THEN
        RAISE EXCEPTION 'Invalid adjustment_type: %. Must be credit or debit', p_adjustment_type;
    END IF;

    -- =====================================================
    -- 2. Fetch Invoice Context & Snapshots (Fail fast if missing)
    -- =====================================================
    SELECT tax_type, invoice_type, party_ledger_id
    INTO v_gst_type, v_invoice_type, v_party_ledger_id
    FROM invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    IF v_gst_type IS NULL THEN
        RAISE EXCEPTION 'Invoice has invalid tax_type (NULL)';
    END IF;

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
    WHERE l.id = v_party_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Party ledger not found: %', v_party_ledger_id;
    END IF;

    -- Store party ledger name for snapshot
    v_party_ledger_name := v_partner_rec.ledger_name;

    -- Fetch counter ledger (Sales Return/Purchase Return account)
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
        WHEN EXTRACT(MONTH FROM p_adjustment_date) >= 4 THEN EXTRACT(YEAR FROM p_adjustment_date)
        ELSE EXTRACT(YEAR FROM p_adjustment_date) - 1
    END;
    v_financial_year := v_fy_start_year::TEXT || '-' || RIGHT((v_fy_start_year + 1)::TEXT, 2);

    v_sequence_number := get_next_sequence('adjustment_notes_' || p_adjustment_type, v_company_id);

    -- Generate adjustment number (CN for credit, DN for debit)
    IF p_adjustment_type = 'credit' THEN
        v_adjustment_number := 'CN/' || v_financial_year || '/' || LPAD(v_sequence_number::TEXT, 4, '0');
        v_slug_prefix := 'cn';
    ELSE
        v_adjustment_number := 'DN/' || v_financial_year || '/' || LPAD(v_sequence_number::TEXT, 4, '0');
        v_slug_prefix := 'dn';
    END IF;

    -- Generate URL-safe slug
    v_slug := v_slug_prefix || '-' || v_sequence_number::TEXT;

    -- =====================================================
    -- 4. Process Items via CTE (Performance Optimized)
    -- =====================================================
    -- This unrolls JSON, joins products, calculates line totals and taxes
    CREATE TEMPORARY TABLE temp_adjustment_calculations ON COMMIT DROP AS
    WITH
    -- Step 4.1: Extract items from JSONB
    raw_items AS (
        SELECT
            (elem->>'product_id')::UUID as product_id,
            ROUND((elem->>'quantity')::DECIMAL, 2) as qty,
            ROUND((elem->>'rate')::DECIMAL, 2) as rate,
            ROUND(COALESCE((elem->>'gst_rate')::DECIMAL, 0), 2) as gst_rate
        FROM jsonb_array_elements(p_items) as elem
    ),
    -- Step 4.2: Calculate line amounts
    initial_calc AS (
        SELECT
            ri.*,
            (ri.qty * ri.rate) as line_amount
        FROM raw_items ri
    )
    -- Step 4.3: Join products for snapshots
    SELECT
        i.*,
        pr.name as product_name,
        pr.hsn_code
    FROM initial_calc i
    JOIN products pr ON i.product_id = pr.id;

    -- =====================================================
    -- 5. Aggregate Header Totals from the Temp Table
    -- =====================================================
    -- Calculate taxes based on inherited gst_type from invoice
    SELECT
        SUM(line_amount),

        -- Calculate Taxes on the Amount
        SUM(ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2)), -- CGST
        SUM(ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2)), -- SGST
        SUM(ROUND(CASE WHEN v_gst_type = 'igst' THEN line_amount * (gst_rate / 100) ELSE 0 END, 2))     -- IGST
    INTO
        v_subtotal_amount,
        v_total_cgst,
        v_total_sgst,
        v_total_igst
    FROM temp_adjustment_calculations;

    -- Handle nulls if item list was empty
    v_subtotal_amount := COALESCE(v_subtotal_amount, 0);
    v_total_cgst := COALESCE(v_total_cgst, 0);
    v_total_sgst := COALESCE(v_total_sgst, 0);
    v_total_igst := COALESCE(v_total_igst, 0);

    -- Calculate total tax
    v_total_tax := v_total_cgst + v_total_sgst + v_total_igst;

    -- =====================================================
    -- 6. Final Rounding
    -- =====================================================
    v_grand_total := ROUND(v_subtotal_amount + v_total_tax);
    v_round_off := v_grand_total - (v_subtotal_amount + v_total_tax);

    -- =====================================================
    -- 7. Insert Header with Complete Snapshots
    -- =====================================================
    INSERT INTO adjustment_notes (
        company_id, adjustment_type, sequence_number, adjustment_number, slug,
        invoice_id, party_ledger_id, party_ledger_name, counter_ledger_id, counter_ledger_name,
        warehouse_id, adjustment_date, reason, tax_type,
        subtotal_amount, total_cgst_amount, total_sgst_amount, total_igst_amount,
        total_tax_amount, round_off_amount, total_amount, notes,
        -- Warehouse snapshot (complete)
        warehouse_name, warehouse_address_line1, warehouse_address_line2, warehouse_city,
        warehouse_state, warehouse_country, warehouse_pincode,
        -- Party snapshot (complete)
        party_name, party_display_name, party_email, party_phone,
        party_address_line1, party_address_line2, party_city, party_state,
        party_country, party_pincode, party_gst_number, party_pan_number,
        -- Company snapshot (complete)
        company_name, company_address_line1, company_address_line2, company_city,
        company_state, company_country, company_pincode, company_gst_number,
        company_pan_number, company_email, company_phone
    ) VALUES (
        v_company_id, p_adjustment_type::adjustment_type_enum, v_sequence_number, v_adjustment_number, v_slug,
        p_invoice_id, v_party_ledger_id, v_party_ledger_name, p_counter_ledger_id, v_counter_ledger_name,
        p_warehouse_id, p_adjustment_date, p_reason, v_gst_type::tax_type_enum,
        v_subtotal_amount, v_total_cgst, v_total_sgst, v_total_igst,
        v_total_tax, v_round_off, v_grand_total, p_notes,
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
        v_partner_rec.address_line1,
        v_partner_rec.address_line2,
        v_partner_rec.city,
        v_partner_rec.state,
        v_partner_rec.country,
        v_partner_rec.pin_code,
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
        v_company_rec.phone_number
    ) RETURNING id INTO v_adjustment_note_id;

    -- =====================================================
    -- 8. Bulk Insert Items from Temp Table
    -- =====================================================
    INSERT INTO adjustment_note_items (
        adjustment_note_id, company_id, warehouse_id, product_id, quantity, rate,
        product_name, product_hsn_code, tax_type, gst_rate,
        cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_tax_amount
    )
    SELECT
        v_adjustment_note_id, v_company_id, p_warehouse_id, product_id, qty, rate,
        product_name, hsn_code,
        CASE WHEN gst_rate > 0 THEN 'gst'::tax_type_enum ELSE 'no_tax'::tax_type_enum END,
        gst_rate,
        -- CGST
        CASE WHEN v_gst_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2),
        -- SGST
        CASE WHEN v_gst_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2),
        -- IGST
        CASE WHEN v_gst_type = 'igst' THEN gst_rate ELSE 0 END,
        ROUND(CASE WHEN v_gst_type = 'igst' THEN line_amount * (gst_rate / 100) ELSE 0 END, 2),
        -- Total Tax
        ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 100)
                   WHEN v_gst_type = 'igst' THEN line_amount * (gst_rate / 100)
                   ELSE 0 END, 2)
    FROM temp_adjustment_calculations;

    RETURN v_slug;
END;
$$;

COMMENT ON FUNCTION create_adjustment_note_with_items IS 'Creates a credit/debit note with items atomically. Inherits GST type from invoice. Requires counter_ledger_id (Sales Return/Purchase Return account) for double-entry accounting. Item GST rates come from frontend. Uses CTE-based calculation for optimal performance. Calculates round-off automatically. Snapshots party and counter ledger names for immutability.';

-- =====================================================
-- UPDATE ADJUSTMENT NOTE WITH ITEMS FUNCTION
-- =====================================================

-- Function to update adjustment note (credit/debit) with items atomically
CREATE OR REPLACE FUNCTION update_adjustment_note_with_items(
    p_adjustment_note_id UUID,
    p_invoice_id UUID,
    p_warehouse_id UUID,
    p_counter_ledger_id UUID,
    p_adjustment_date DATE,
    p_reason TEXT,
    p_notes TEXT,
    p_attachments TEXT[],
    p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_adjustment_type VARCHAR(10);
    v_is_cancelled BOOLEAN;
    v_exported_at TIMESTAMP;

    -- Totals
    v_subtotal_amount DECIMAL(10,2) := 0;
    v_total_cgst DECIMAL(10,2) := 0;
    v_total_sgst DECIMAL(10,2) := 0;
    v_total_igst DECIMAL(10,2) := 0;
    v_total_tax DECIMAL(10,2) := 0;
    v_round_off DECIMAL(10,2) := 0;
    v_grand_total DECIMAL(10,2) := 0;

    -- Invoice context
    v_gst_type VARCHAR(10);
    v_invoice_type VARCHAR(10);
    v_party_ledger_id UUID;

    -- Snapshot holders
    v_company_rec RECORD;
    v_warehouse_rec RECORD;
    v_partner_rec RECORD;
    v_party_ledger_name VARCHAR(200);
    v_counter_ledger_name VARCHAR(200);
BEGIN
    -- =====================================================
    -- 1. Fetch adjustment note and validate
    -- =====================================================
    SELECT company_id, adjustment_type, is_cancelled, exported_to_tally_at
    INTO v_company_id, v_adjustment_type, v_is_cancelled, v_exported_at
    FROM adjustment_notes
    WHERE id = p_adjustment_note_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Adjustment note not found';
    END IF;

    -- Validate can be edited
    IF v_is_cancelled THEN
        RAISE EXCEPTION 'Cannot edit cancelled adjustment note';
    END IF;

    IF v_exported_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit adjustment note that has been exported to Tally';
    END IF;

    -- =====================================================
    -- 2. Fetch Invoice Context & Snapshots
    -- =====================================================
    SELECT tax_type, invoice_type, party_ledger_id
    INTO v_gst_type, v_invoice_type, v_party_ledger_id
    FROM invoices
    WHERE id = p_invoice_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    IF v_gst_type IS NULL THEN
        RAISE EXCEPTION 'Invoice has invalid tax_type (NULL)';
    END IF;

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
    WHERE l.id = v_party_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Party ledger not found: %', v_party_ledger_id;
    END IF;

    v_party_ledger_name := v_partner_rec.ledger_name;

    SELECT name INTO v_counter_ledger_name
    FROM ledgers
    WHERE id = p_counter_ledger_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Counter ledger not found: %', p_counter_ledger_id;
    END IF;

    -- =====================================================
    -- 3. Delete old items (triggers will restore invoice outstanding)
    -- =====================================================
    DELETE FROM adjustment_note_items WHERE adjustment_note_id = p_adjustment_note_id;

    -- =====================================================
    -- 4. Process Items via CTE
    -- =====================================================
    CREATE TEMPORARY TABLE temp_adjustment_calculations ON COMMIT DROP AS
    WITH
    raw_items AS (
        SELECT
            (elem->>'product_id')::UUID as product_id,
            ROUND((elem->>'quantity')::DECIMAL, 2) as qty,
            ROUND((elem->>'rate')::DECIMAL, 2) as rate,
            ROUND(COALESCE((elem->>'gst_rate')::DECIMAL, 0), 2) as gst_rate
        FROM jsonb_array_elements(p_items) as elem
    ),
    initial_calc AS (
        SELECT
            ri.*,
            (ri.qty * ri.rate) as line_amount
        FROM raw_items ri
    )
    SELECT
        i.*,
        pr.name as product_name,
        pr.hsn_code
    FROM initial_calc i
    JOIN products pr ON i.product_id = pr.id;

    -- =====================================================
    -- 5. Aggregate Header Totals
    -- =====================================================
    SELECT
        SUM(line_amount),
        SUM(ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2)),
        SUM(ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2)),
        SUM(ROUND(CASE WHEN v_gst_type = 'igst' THEN line_amount * (gst_rate / 100) ELSE 0 END, 2))
    INTO
        v_subtotal_amount,
        v_total_cgst,
        v_total_sgst,
        v_total_igst
    FROM temp_adjustment_calculations;

    v_subtotal_amount := COALESCE(v_subtotal_amount, 0);
    v_total_cgst := COALESCE(v_total_cgst, 0);
    v_total_sgst := COALESCE(v_total_sgst, 0);
    v_total_igst := COALESCE(v_total_igst, 0);

    v_total_tax := v_total_cgst + v_total_sgst + v_total_igst;
    v_grand_total := ROUND(v_subtotal_amount + v_total_tax);
    v_round_off := v_grand_total - (v_subtotal_amount + v_total_tax);

    -- =====================================================
    -- 6. Update Header with Refreshed Snapshots
    -- =====================================================
    UPDATE adjustment_notes
    SET
        invoice_id = p_invoice_id,
        party_ledger_id = v_party_ledger_id,
        party_ledger_name = v_party_ledger_name,
        counter_ledger_id = p_counter_ledger_id,
        counter_ledger_name = v_counter_ledger_name,
        warehouse_id = p_warehouse_id,
        adjustment_date = p_adjustment_date,
        reason = p_reason,
        tax_type = v_gst_type::tax_type_enum,
        subtotal_amount = v_subtotal_amount,
        total_cgst_amount = v_total_cgst,
        total_sgst_amount = v_total_sgst,
        total_igst_amount = v_total_igst,
        total_tax_amount = v_total_tax,
        round_off_amount = v_round_off,
        total_amount = v_grand_total,
        notes = p_notes,
        attachments = p_attachments,
        -- Refresh warehouse snapshot
        warehouse_name = v_warehouse_rec.name,
        warehouse_address_line1 = v_warehouse_rec.address_line1,
        warehouse_address_line2 = v_warehouse_rec.address_line2,
        warehouse_city = v_warehouse_rec.city,
        warehouse_state = v_warehouse_rec.state,
        warehouse_country = v_warehouse_rec.country,
        warehouse_pincode = v_warehouse_rec.pin_code,
        -- Refresh party snapshot
        party_name = v_partner_rec.company_name,
        party_display_name = v_partner_rec.display_name,
        party_email = v_partner_rec.email,
        party_phone = v_partner_rec.phone_number,
        party_address_line1 = v_partner_rec.address_line1,
        party_address_line2 = v_partner_rec.address_line2,
        party_city = v_partner_rec.city,
        party_state = v_partner_rec.state,
        party_country = v_partner_rec.country,
        party_pincode = v_partner_rec.pin_code,
        party_gst_number = v_partner_rec.gst_number,
        party_pan_number = v_partner_rec.pan_number,
        -- Refresh company snapshot
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
        company_phone = v_company_rec.phone_number
    WHERE id = p_adjustment_note_id;

    -- =====================================================
    -- 7. Bulk Insert New Items
    -- =====================================================
    INSERT INTO adjustment_note_items (
        adjustment_note_id, company_id, warehouse_id, product_id, quantity, rate,
        product_name, product_hsn_code, tax_type, gst_rate,
        cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_tax_amount
    )
    SELECT
        p_adjustment_note_id, v_company_id, p_warehouse_id, product_id, qty, rate,
        product_name, hsn_code,
        CASE WHEN gst_rate > 0 THEN 'gst'::tax_type_enum ELSE 'no_tax'::tax_type_enum END,
        gst_rate,
        CASE WHEN v_gst_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2),
        CASE WHEN v_gst_type = 'gst' THEN gst_rate / 2 ELSE 0 END,
        ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 2 / 100) ELSE 0 END, 2),
        CASE WHEN v_gst_type = 'igst' THEN gst_rate ELSE 0 END,
        ROUND(CASE WHEN v_gst_type = 'igst' THEN line_amount * (gst_rate / 100) ELSE 0 END, 2),
        ROUND(CASE WHEN v_gst_type = 'gst' THEN line_amount * (gst_rate / 100)
                   WHEN v_gst_type = 'igst' THEN line_amount * (gst_rate / 100)
                   ELSE 0 END, 2)
    FROM temp_adjustment_calculations;
END;
$$;

COMMENT ON FUNCTION update_adjustment_note_with_items IS 'Updates a credit/debit note with items atomically. Validates adjustment note is not cancelled or exported to Tally. Deletes old items (restoring invoice outstanding amounts) and creates new ones. Refreshes all snapshot fields. Triggers automatically update invoice outstanding amounts based on new total.';
