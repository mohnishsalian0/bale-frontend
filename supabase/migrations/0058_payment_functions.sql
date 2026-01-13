-- Bale Backend - Accounting: Payment Functions
-- RPC functions for payment management

-- =====================================================
-- CREATE PAYMENT WITH ALLOCATIONS FUNCTION
-- =====================================================

-- Function to create payment with allocations atomically
CREATE OR REPLACE FUNCTION create_payment_with_allocations(
    p_voucher_type VARCHAR(10), -- 'payment' or 'receipt'
    p_party_ledger_id UUID,
    p_counter_ledger_id UUID, -- Bank or Cash ledger
    p_payment_date DATE,
    p_payment_mode VARCHAR(20), -- 'cash', 'cheque', 'neft', 'rtgs', 'upi', 'card'
    p_total_amount DECIMAL(10,2),
    p_tds_applicable BOOLEAN,
    p_allocations JSONB, -- Array of {allocation_type: 'advance'|'against_ref', invoice_id: UUID (if against_ref), amount_applied: DECIMAL}
    p_reference_number VARCHAR(50) DEFAULT NULL,
    p_reference_date DATE DEFAULT NULL, -- Instrument date (e.g., cheque date)
    p_tds_rate DECIMAL(5,2) DEFAULT NULL,
    p_tds_ledger_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_attachments TEXT[] DEFAULT NULL,
    p_company_id UUID DEFAULT NULL
)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_payment_id UUID;
    v_sequence_number INTEGER;
    v_payment_number VARCHAR(50);
    v_slug VARCHAR(50);
    v_slug_prefix VARCHAR(10);
    v_financial_year VARCHAR(10);
    v_allocation JSONB;
    v_tds_amount DECIMAL(10,2) := 0;
    v_net_amount DECIMAL(10,2);
    v_total_allocated DECIMAL(10,2) := 0;
    v_invoice_outstanding DECIMAL(10,2);
BEGIN
    v_company_id := COALESCE(p_company_id, get_jwt_company_id());

    -- Round amounts to handle JavaScript floating point precision
    p_total_amount := ROUND(p_total_amount, 2);
    p_tds_rate := ROUND(p_tds_rate, 2);

    -- Validate voucher_type
    IF p_voucher_type NOT IN ('payment', 'receipt') THEN
        RAISE EXCEPTION 'Invalid voucher_type: %. Must be payment or receipt', p_voucher_type;
    END IF;

    -- Calculate financial year (April 1 - March 31)
    IF EXTRACT(MONTH FROM p_payment_date) >= 4 THEN
        v_financial_year := EXTRACT(YEAR FROM p_payment_date)::TEXT || '-' ||
                           RIGHT((EXTRACT(YEAR FROM p_payment_date) + 1)::TEXT, 2);
    ELSE
        v_financial_year := (EXTRACT(YEAR FROM p_payment_date) - 1)::TEXT || '-' ||
                           RIGHT(EXTRACT(YEAR FROM p_payment_date)::TEXT, 2);
    END IF;

    -- Get next sequence number for payments table
    v_sequence_number := get_next_sequence('payments', v_company_id);

    -- Generate payment number (PMT for payment, RCT for receipt)
    IF p_voucher_type = 'payment' THEN
        v_payment_number := 'PMT/' || v_financial_year || '/' || LPAD(v_sequence_number::TEXT, 4, '0');
        v_slug_prefix := 'pmt';
    ELSE
        v_payment_number := 'RCT/' || v_financial_year || '/' || LPAD(v_sequence_number::TEXT, 4, '0');
        v_slug_prefix := 'rcpt';
    END IF;

    -- Generate URL-safe slug
    v_slug := v_slug_prefix || '-' || v_sequence_number::TEXT;

    -- Validate TDS ledger is provided when TDS is applicable
    IF p_tds_applicable AND p_tds_ledger_id IS NULL THEN
        RAISE EXCEPTION 'TDS ledger is required when TDS is applicable';
    END IF;

    -- Calculate TDS amount if applicable
    IF p_tds_applicable AND p_tds_rate > 0 THEN
        v_tds_amount := ROUND(p_total_amount * (p_tds_rate / 100), 2);
    END IF;

    -- Calculate net amount (total - TDS)
    v_net_amount := p_total_amount - v_tds_amount;

    -- Validate allocations sum <= total_amount
    -- Round each allocation to 2 decimal places to handle JavaScript floating point precision
    FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_total_allocated := v_total_allocated + ROUND((v_allocation->>'amount_applied')::DECIMAL, 2);
    END LOOP;

    IF v_total_allocated > p_total_amount THEN
        RAISE EXCEPTION 'Total allocations (%) exceed payment amount (%)', v_total_allocated, p_total_amount;
    END IF;

    -- Create payment with snapshot fields
    INSERT INTO payments (
        company_id,
        voucher_type,
        sequence_number,
        payment_number,
        slug,
        party_ledger_id,
        counter_ledger_id,
        payment_date,
        payment_mode,
        reference_number,
        reference_date,
        total_amount,
        tds_applicable,
        tds_rate,
        tds_ledger_id,
        tds_amount,
        net_amount,
        notes,
        attachments,
        -- Party snapshot fields
        party_name,
        party_display_name,
        party_gst_number,
        party_pan_number,
        -- Counter ledger snapshot
        counter_ledger_name
    )
    SELECT
        v_company_id,
        p_voucher_type::voucher_type_enum,
        v_sequence_number,
        v_payment_number,
        v_slug,
        p_party_ledger_id,
        p_counter_ledger_id,
        p_payment_date,
        p_payment_mode::payment_mode_enum,
        p_reference_number,
        p_reference_date,
        p_total_amount,
        p_tds_applicable,
        p_tds_rate,
        p_tds_ledger_id,
        v_tds_amount,
        v_net_amount,
        p_notes,
        p_attachments,
        -- Party snapshot
        p.company_name,
        p.display_name,
        p.gst_number,
        p.pan_number,
        -- Counter ledger snapshot
        cl.name
    FROM ledgers l
    JOIN partners p ON l.partner_id = p.id
    CROSS JOIN ledgers cl
    WHERE l.id = p_party_ledger_id AND cl.id = p_counter_ledger_id
    RETURNING id INTO v_payment_id;

    -- Insert payment allocations
    FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        -- Validate allocation type
        IF (v_allocation->>'allocation_type')::TEXT NOT IN ('advance', 'against_ref') THEN
            RAISE EXCEPTION 'Invalid allocation_type: %', v_allocation->>'allocation_type';
        END IF;

        -- Validate against_ref has invoice_id
        IF (v_allocation->>'allocation_type')::TEXT = 'against_ref' AND
           (v_allocation->>'invoice_id') IS NULL THEN
            RAISE EXCEPTION 'allocation_type against_ref requires invoice_id';
        END IF;

        -- Validate advance has no invoice_id
        IF (v_allocation->>'allocation_type')::TEXT = 'advance' AND
           (v_allocation->>'invoice_id') IS NOT NULL THEN
            RAISE EXCEPTION 'allocation_type advance must not have invoice_id';
        END IF;

        -- If against_ref, validate amount_applied <= invoice outstanding
        IF (v_allocation->>'allocation_type')::TEXT = 'against_ref' THEN
            SELECT outstanding_amount INTO v_invoice_outstanding
            FROM invoices
            WHERE id = (v_allocation->>'invoice_id')::UUID;

            IF v_invoice_outstanding IS NULL THEN
                RAISE EXCEPTION 'Invoice not found: %', v_allocation->>'invoice_id';
            END IF;

            IF (v_allocation->>'amount_applied')::DECIMAL > v_invoice_outstanding THEN
                RAISE EXCEPTION 'Allocation amount (%) exceeds invoice outstanding (%)',
                    v_allocation->>'amount_applied', v_invoice_outstanding;
            END IF;
        END IF;

        -- Insert allocation
        INSERT INTO payment_allocations (
            company_id,
            payment_id,
            invoice_id,
            allocation_type,
            amount_applied
        )
        VALUES (
            v_company_id,
            v_payment_id,
            CASE
                WHEN (v_allocation->>'invoice_id') IS NOT NULL
                THEN (v_allocation->>'invoice_id')::UUID
                ELSE NULL
            END,
            (v_allocation->>'allocation_type')::allocation_type_enum,
            ROUND((v_allocation->>'amount_applied')::DECIMAL, 2)
        );
    END LOOP;

    -- Auto-create advance allocation for any unallocated remainder
    IF v_total_allocated < p_total_amount THEN
        INSERT INTO payment_allocations (
            company_id,
            payment_id,
            invoice_id,
            allocation_type,
            amount_applied
        )
        VALUES (
            v_company_id,
            v_payment_id,
            NULL, -- No invoice for advance
            'advance'::allocation_type_enum,
            p_total_amount - v_total_allocated
        );
    END IF;

    RETURN v_slug;
END;
$$;

COMMENT ON FUNCTION create_payment_with_allocations IS 'Creates a payment/receipt with allocations atomically. Validates allocation amounts against invoice outstanding. Handles TDS calculation. Supports advance and against_ref allocations. Auto-creates advance allocation for any unallocated remainder. IMPORTANT: Allocations are validated against total_amount (gross), not net_amount. When TDS is applicable, allocations settle invoices at gross amount while net_amount represents actual cash flow.';

-- =====================================================
-- UPDATE PAYMENT WITH ALLOCATIONS FUNCTION
-- =====================================================

-- Function to update payment with allocations atomically
CREATE OR REPLACE FUNCTION update_payment_with_allocations(
    p_payment_id UUID,
    p_party_ledger_id UUID,
    p_counter_ledger_id UUID,
    p_payment_date DATE,
    p_payment_mode VARCHAR(20),
    p_total_amount DECIMAL(10,2),
    p_tds_applicable BOOLEAN,
    p_allocations JSONB,
    p_reference_number VARCHAR(50) DEFAULT NULL,
    p_reference_date DATE DEFAULT NULL,
    p_tds_rate DECIMAL(5,2) DEFAULT NULL,
    p_tds_ledger_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_attachments TEXT[] DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_allocation JSONB;
    v_tds_amount DECIMAL(10,2) := 0;
    v_net_amount DECIMAL(10,2);
    v_total_allocated DECIMAL(10,2) := 0;
    v_invoice_outstanding DECIMAL(10,2);
    v_is_cancelled BOOLEAN;
    v_exported_at TIMESTAMP;
BEGIN
    -- Check if payment exists and get status
    SELECT company_id, is_cancelled, exported_to_tally_at
    INTO v_company_id, v_is_cancelled, v_exported_at
    FROM payments
    WHERE id = p_payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;

    -- Validate payment can be edited
    IF v_is_cancelled THEN
        RAISE EXCEPTION 'Cannot edit cancelled payment';
    END IF;

    IF v_exported_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit payment that has been exported to Tally';
    END IF;

    -- Round amounts to handle JavaScript floating point precision
    p_total_amount := ROUND(p_total_amount, 2);
    p_tds_rate := ROUND(p_tds_rate, 2);

    -- Validate TDS ledger is provided when TDS is applicable
    IF p_tds_applicable AND p_tds_ledger_id IS NULL THEN
        RAISE EXCEPTION 'TDS ledger is required when TDS is applicable';
    END IF;

    -- Calculate TDS amount if applicable
    IF p_tds_applicable AND p_tds_rate > 0 THEN
        v_tds_amount := ROUND(p_total_amount * (p_tds_rate / 100), 2);
    END IF;

    -- Calculate net amount (total - TDS)
    v_net_amount := p_total_amount - v_tds_amount;

    -- Validate allocations sum <= total_amount
    -- Round each allocation to 2 decimal places to handle JavaScript floating point precision
    FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        v_total_allocated := v_total_allocated + ROUND((v_allocation->>'amount_applied')::DECIMAL, 2);
    END LOOP;

    IF v_total_allocated > p_total_amount THEN
        RAISE EXCEPTION 'Total allocations (%) exceed payment amount (%)', v_total_allocated, p_total_amount;
    END IF;

    -- Delete old allocations (triggers will restore invoice outstanding amounts)
    DELETE FROM payment_allocations WHERE payment_id = p_payment_id;

    -- Update payment with new values and refresh snapshot fields
    UPDATE payments
    SET
        party_ledger_id = p_party_ledger_id,
        counter_ledger_id = p_counter_ledger_id,
        payment_date = p_payment_date,
        payment_mode = p_payment_mode::payment_mode_enum,
        reference_number = p_reference_number,
        reference_date = p_reference_date,
        total_amount = p_total_amount,
        tds_applicable = p_tds_applicable,
        tds_rate = p_tds_rate,
        tds_ledger_id = p_tds_ledger_id,
        tds_amount = v_tds_amount,
        net_amount = v_net_amount,
        notes = p_notes,
        attachments = p_attachments,
        -- Refresh party snapshot fields
        party_name = p.company_name,
        party_display_name = p.display_name,
        party_gst_number = p.gst_number,
        party_pan_number = p.pan_number,
        -- Refresh counter ledger snapshot
        counter_ledger_name = cl.name
    FROM ledgers l
    JOIN partners p ON l.partner_id = p.id
    CROSS JOIN ledgers cl
    WHERE payments.id = p_payment_id
      AND l.id = p_party_ledger_id
      AND cl.id = p_counter_ledger_id;

    -- Insert new payment allocations
    FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        -- Validate allocation type
        IF (v_allocation->>'allocation_type')::TEXT NOT IN ('advance', 'against_ref') THEN
            RAISE EXCEPTION 'Invalid allocation_type: %', v_allocation->>'allocation_type';
        END IF;

        -- Validate against_ref has invoice_id
        IF (v_allocation->>'allocation_type')::TEXT = 'against_ref' AND
           (v_allocation->>'invoice_id') IS NULL THEN
            RAISE EXCEPTION 'allocation_type against_ref requires invoice_id';
        END IF;

        -- Validate advance has no invoice_id
        IF (v_allocation->>'allocation_type')::TEXT = 'advance' AND
           (v_allocation->>'invoice_id') IS NOT NULL THEN
            RAISE EXCEPTION 'allocation_type advance must not have invoice_id';
        END IF;

        -- If against_ref, validate amount_applied <= invoice outstanding
        IF (v_allocation->>'allocation_type')::TEXT = 'against_ref' THEN
            SELECT outstanding_amount INTO v_invoice_outstanding
            FROM invoices
            WHERE id = (v_allocation->>'invoice_id')::UUID;

            IF v_invoice_outstanding IS NULL THEN
                RAISE EXCEPTION 'Invoice not found: %', v_allocation->>'invoice_id';
            END IF;

            IF (v_allocation->>'amount_applied')::DECIMAL > v_invoice_outstanding THEN
                RAISE EXCEPTION 'Allocation amount (%) exceeds invoice outstanding (%)',
                    v_allocation->>'amount_applied', v_invoice_outstanding;
            END IF;
        END IF;

        -- Insert allocation
        INSERT INTO payment_allocations (
            company_id,
            payment_id,
            invoice_id,
            allocation_type,
            amount_applied
        )
        VALUES (
            v_company_id,
            p_payment_id,
            CASE
                WHEN (v_allocation->>'invoice_id') IS NOT NULL
                THEN (v_allocation->>'invoice_id')::UUID
                ELSE NULL
            END,
            (v_allocation->>'allocation_type')::allocation_type_enum,
            ROUND((v_allocation->>'amount_applied')::DECIMAL, 2)
        );
    END LOOP;

    -- Auto-create advance allocation for any unallocated remainder
    IF v_total_allocated < p_total_amount THEN
        INSERT INTO payment_allocations (
            company_id,
            payment_id,
            invoice_id,
            allocation_type,
            amount_applied
        )
        VALUES (
            v_company_id,
            p_payment_id,
            NULL,
            'advance'::allocation_type_enum,
            p_total_amount - v_total_allocated
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION update_payment_with_allocations IS 'Updates a payment/receipt with allocations atomically. Validates payment is not cancelled or exported to Tally. Deletes old allocations (restoring invoice outstanding amounts) and creates new ones. Refreshes all snapshot fields. Validates allocation amounts against invoice outstanding.';
