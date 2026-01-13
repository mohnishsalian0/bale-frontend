-- Partner Sales Aggregates Table
-- Tracks sales order metrics per partner, segregated by order status

CREATE TABLE partner_sales_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Approval Pending metrics (status = 'approval_pending')
    approval_pending_count INTEGER DEFAULT 0,
    approval_pending_value NUMERIC(15,2) DEFAULT 0,

    -- In Progress metrics (status = 'in_progress')
    in_progress_count INTEGER DEFAULT 0,
    in_progress_value NUMERIC(15,2) DEFAULT 0,

    -- Completed metrics (status = 'completed')
    completed_count INTEGER DEFAULT 0,
    completed_value NUMERIC(15,2) DEFAULT 0,

    -- Cancelled metrics (status = 'cancelled')
    cancelled_count INTEGER DEFAULT 0,
    cancelled_value NUMERIC(15,2) DEFAULT 0,

    -- Lifetime totals (all statuses combined, excluding cancelled)
    total_orders INTEGER DEFAULT 0,
    lifetime_order_value NUMERIC(15,2) DEFAULT 0,

    -- Date tracking
    first_order_date TIMESTAMPTZ,
    last_order_date TIMESTAMPTZ,

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(partner_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_partner_sales_agg_partner ON partner_sales_aggregates(partner_id);
CREATE INDEX idx_partner_sales_agg_company ON partner_sales_aggregates(company_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE partner_sales_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view partner sales aggregates"
ON partner_sales_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('partners.read')
);

-- Function to recalculate partner sales aggregates
CREATE OR REPLACE FUNCTION recalculate_partner_sales_aggregates(
    p_partner_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
    v_approval_pending_count INTEGER;
    v_approval_pending_value NUMERIC(15,2);
    v_in_progress_count INTEGER;
    v_in_progress_value NUMERIC(15,2);
    v_completed_count INTEGER;
    v_completed_value NUMERIC(15,2);
    v_cancelled_count INTEGER;
    v_cancelled_value NUMERIC(15,2);
    v_total_orders INTEGER;
    v_lifetime_value NUMERIC(15,2);
    v_first_order_date TIMESTAMPTZ;
    v_last_order_date TIMESTAMPTZ;
BEGIN
    -- Get partner company_id
    SELECT company_id
    INTO v_company_id
    FROM partners
    WHERE id = p_partner_id;

    IF v_company_id IS NULL THEN
        RETURN; -- Partner doesn't exist or was deleted
    END IF;

    -- Calculate approval_pending metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_approval_pending_count, v_approval_pending_value
    FROM sales_orders
    WHERE customer_id = p_partner_id
        AND status = 'approval_pending'
        AND deleted_at IS NULL;

    -- Calculate in_progress metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_in_progress_count, v_in_progress_value
    FROM sales_orders
    WHERE customer_id = p_partner_id
        AND status = 'in_progress'
        AND deleted_at IS NULL;

    -- Calculate completed metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_completed_count, v_completed_value
    FROM sales_orders
    WHERE customer_id = p_partner_id
        AND status = 'completed'
        AND deleted_at IS NULL;

    -- Calculate cancelled metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_cancelled_count, v_cancelled_value
    FROM sales_orders
    WHERE customer_id = p_partner_id
        AND status = 'cancelled'
        AND deleted_at IS NULL;

    -- Calculate lifetime totals (all statuses)
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0),
        MIN(order_date),
        MAX(order_date)
    INTO v_total_orders, v_lifetime_value, v_first_order_date, v_last_order_date
    FROM sales_orders
    WHERE customer_id = p_partner_id
        AND deleted_at IS NULL;

    -- Upsert into aggregates table
    INSERT INTO partner_sales_aggregates (
        partner_id,
        company_id,
        approval_pending_count,
        approval_pending_value,
        in_progress_count,
        in_progress_value,
        completed_count,
        completed_value,
        cancelled_count,
        cancelled_value,
        total_orders,
        lifetime_order_value,
        first_order_date,
        last_order_date,
        last_updated_at
    ) VALUES (
        p_partner_id,
        v_company_id,
        v_approval_pending_count,
        v_approval_pending_value,
        v_in_progress_count,
        v_in_progress_value,
        v_completed_count,
        v_completed_value,
        v_cancelled_count,
        v_cancelled_value,
        v_total_orders,
        v_lifetime_value,
        v_first_order_date,
        v_last_order_date,
        NOW()
    )
    ON CONFLICT (partner_id)
    DO UPDATE SET
        approval_pending_count = EXCLUDED.approval_pending_count,
        approval_pending_value = EXCLUDED.approval_pending_value,
        in_progress_count = EXCLUDED.in_progress_count,
        in_progress_value = EXCLUDED.in_progress_value,
        completed_count = EXCLUDED.completed_count,
        completed_value = EXCLUDED.completed_value,
        cancelled_count = EXCLUDED.cancelled_count,
        cancelled_value = EXCLUDED.cancelled_value,
        total_orders = EXCLUDED.total_orders,
        lifetime_order_value = EXCLUDED.lifetime_order_value,
        first_order_date = EXCLUDED.first_order_date,
        last_order_date = EXCLUDED.last_order_date,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update aggregates when sales orders change
CREATE OR REPLACE FUNCTION trigger_update_partner_sales_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_partner_sales_aggregates(NEW.customer_id);
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_partner_sales_aggregates(OLD.customer_id);
    END IF;

    -- Handle UPDATE where customer changed (recalculate both old and new customer)
    IF TG_OP = 'UPDATE' AND OLD.customer_id != NEW.customer_id THEN
        PERFORM recalculate_partner_sales_aggregates(OLD.customer_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on sales_orders table
CREATE TRIGGER trg_update_partner_sales_aggregates
AFTER INSERT OR UPDATE OR DELETE ON sales_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_sales_aggregates();

-- Trigger function to create initial aggregates when a new partner is created
CREATE OR REPLACE FUNCTION trigger_create_partner_sales_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial aggregate record with zero values
    INSERT INTO partner_sales_aggregates (
        partner_id,
        company_id,
        approval_pending_count,
        approval_pending_value,
        in_progress_count,
        in_progress_value,
        completed_count,
        completed_value,
        cancelled_count,
        cancelled_value,
        total_orders,
        lifetime_order_value,
        first_order_date,
        last_order_date
    ) VALUES (
        NEW.id,
        NEW.company_id,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        NULL,
        NULL
    )
    ON CONFLICT (partner_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on partners table to initialize sales aggregates
CREATE TRIGGER trg_create_partner_sales_aggregates
AFTER INSERT ON partners
FOR EACH ROW
EXECUTE FUNCTION trigger_create_partner_sales_aggregates();

-- Add comment
COMMENT ON TABLE partner_sales_aggregates IS 'Aggregated sales order metrics per partner, segregated by order status. Updated automatically via triggers.';

-- =====================================================
-- PARTNER PURCHASE AGGREGATES TABLE
-- =====================================================

-- Partner Purchase Aggregates Table
-- Tracks purchase order metrics per partner, segregated by order status

CREATE TABLE partner_purchase_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Approval Pending metrics (status = 'approval_pending')
    approval_pending_count INTEGER DEFAULT 0,
    approval_pending_value NUMERIC(15,2) DEFAULT 0,

    -- In Progress metrics (status = 'in_progress')
    in_progress_count INTEGER DEFAULT 0,
    in_progress_value NUMERIC(15,2) DEFAULT 0,

    -- Completed metrics (status = 'completed')
    completed_count INTEGER DEFAULT 0,
    completed_value NUMERIC(15,2) DEFAULT 0,

    -- Cancelled metrics (status = 'cancelled')
    cancelled_count INTEGER DEFAULT 0,
    cancelled_value NUMERIC(15,2) DEFAULT 0,

    -- Lifetime totals (all statuses combined, excluding cancelled)
    total_orders INTEGER DEFAULT 0,
    lifetime_order_value NUMERIC(15,2) DEFAULT 0,

    -- Date tracking
    first_order_date TIMESTAMPTZ,
    last_order_date TIMESTAMPTZ,

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(partner_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_partner_purchase_agg_partner ON partner_purchase_aggregates(partner_id);
CREATE INDEX idx_partner_purchase_agg_company ON partner_purchase_aggregates(company_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE partner_purchase_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view partner purchase aggregates"
ON partner_purchase_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('partners.read')
);

-- Function to recalculate partner purchase aggregates
CREATE OR REPLACE FUNCTION recalculate_partner_purchase_aggregates(
    p_partner_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
    v_approval_pending_count INTEGER;
    v_approval_pending_value NUMERIC(15,2);
    v_in_progress_count INTEGER;
    v_in_progress_value NUMERIC(15,2);
    v_completed_count INTEGER;
    v_completed_value NUMERIC(15,2);
    v_cancelled_count INTEGER;
    v_cancelled_value NUMERIC(15,2);
    v_total_orders INTEGER;
    v_lifetime_value NUMERIC(15,2);
    v_first_order_date TIMESTAMPTZ;
    v_last_order_date TIMESTAMPTZ;
BEGIN
    -- Get partner company_id
    SELECT company_id
    INTO v_company_id
    FROM partners
    WHERE id = p_partner_id;

    IF v_company_id IS NULL THEN
        RETURN; -- Partner doesn't exist or was deleted
    END IF;

    -- Calculate approval_pending metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_approval_pending_count, v_approval_pending_value
    FROM purchase_orders
    WHERE supplier_id = p_partner_id
        AND status = 'approval_pending'
        AND deleted_at IS NULL;

    -- Calculate in_progress metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_in_progress_count, v_in_progress_value
    FROM purchase_orders
    WHERE supplier_id = p_partner_id
        AND status = 'in_progress'
        AND deleted_at IS NULL;

    -- Calculate completed metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_completed_count, v_completed_value
    FROM purchase_orders
    WHERE supplier_id = p_partner_id
        AND status = 'completed'
        AND deleted_at IS NULL;

    -- Calculate cancelled metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0)
    INTO v_cancelled_count, v_cancelled_value
    FROM purchase_orders
    WHERE supplier_id = p_partner_id
        AND status = 'cancelled'
        AND deleted_at IS NULL;

    -- Calculate lifetime totals (all statuses)
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(total_amount), 0),
        MIN(order_date),
        MAX(order_date)
    INTO v_total_orders, v_lifetime_value, v_first_order_date, v_last_order_date
    FROM purchase_orders
    WHERE supplier_id = p_partner_id
        AND deleted_at IS NULL;

    -- Upsert into aggregates table
    INSERT INTO partner_purchase_aggregates (
        partner_id,
        company_id,
        approval_pending_count,
        approval_pending_value,
        in_progress_count,
        in_progress_value,
        completed_count,
        completed_value,
        cancelled_count,
        cancelled_value,
        total_orders,
        lifetime_order_value,
        first_order_date,
        last_order_date,
        last_updated_at
    ) VALUES (
        p_partner_id,
        v_company_id,
        v_approval_pending_count,
        v_approval_pending_value,
        v_in_progress_count,
        v_in_progress_value,
        v_completed_count,
        v_completed_value,
        v_cancelled_count,
        v_cancelled_value,
        v_total_orders,
        v_lifetime_value,
        v_first_order_date,
        v_last_order_date,
        NOW()
    )
    ON CONFLICT (partner_id)
    DO UPDATE SET
        approval_pending_count = EXCLUDED.approval_pending_count,
        approval_pending_value = EXCLUDED.approval_pending_value,
        in_progress_count = EXCLUDED.in_progress_count,
        in_progress_value = EXCLUDED.in_progress_value,
        completed_count = EXCLUDED.completed_count,
        completed_value = EXCLUDED.completed_value,
        cancelled_count = EXCLUDED.cancelled_count,
        cancelled_value = EXCLUDED.cancelled_value,
        total_orders = EXCLUDED.total_orders,
        lifetime_order_value = EXCLUDED.lifetime_order_value,
        first_order_date = EXCLUDED.first_order_date,
        last_order_date = EXCLUDED.last_order_date,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update aggregates when purchase orders change
CREATE OR REPLACE FUNCTION trigger_update_partner_purchase_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_partner_purchase_aggregates(NEW.supplier_id);
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_partner_purchase_aggregates(OLD.supplier_id);
    END IF;

    -- Handle UPDATE where supplier changed (recalculate both old and new supplier)
    IF TG_OP = 'UPDATE' AND OLD.supplier_id != NEW.supplier_id THEN
        PERFORM recalculate_partner_purchase_aggregates(OLD.supplier_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on purchase_orders table
CREATE TRIGGER trg_update_partner_purchase_aggregates
AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_purchase_aggregates();

-- Trigger function to create initial purchase aggregates when a new partner is created
CREATE OR REPLACE FUNCTION trigger_create_partner_purchase_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial aggregate record with zero values
    INSERT INTO partner_purchase_aggregates (
        partner_id,
        company_id,
        approval_pending_count,
        approval_pending_value,
        in_progress_count,
        in_progress_value,
        completed_count,
        completed_value,
        cancelled_count,
        cancelled_value,
        total_orders,
        lifetime_order_value,
        first_order_date,
        last_order_date
    ) VALUES (
        NEW.id,
        NEW.company_id,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        NULL,
        NULL
    )
    ON CONFLICT (partner_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on partners table to initialize purchase aggregates
CREATE TRIGGER trg_create_partner_purchase_aggregates
AFTER INSERT ON partners
FOR EACH ROW
EXECUTE FUNCTION trigger_create_partner_purchase_aggregates();

-- Add comment
COMMENT ON TABLE partner_purchase_aggregates IS 'Aggregated purchase order metrics per partner, segregated by order status. Updated automatically via triggers.';

-- =====================================================
-- SOFT DELETE TRIGGER FOR PARTNERS
-- =====================================================

-- Trigger function to soft-delete aggregates when a partner is soft-deleted
CREATE OR REPLACE FUNCTION trigger_soft_delete_partner_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    v_has_order_history BOOLEAN;
BEGIN
    -- Only proceed if deleted_at is being set (soft-delete operation)
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- Check if partner has any sales or purchase order history
        SELECT EXISTS (
            SELECT 1
            FROM partner_sales_aggregates
            WHERE partner_id = NEW.id
            AND total_orders > 0
        ) OR EXISTS (
            SELECT 1
            FROM partner_purchase_aggregates
            WHERE partner_id = NEW.id
            AND total_orders > 0
        ) INTO v_has_order_history;

        -- Prevent deletion if order history exists
        IF v_has_order_history THEN
            RAISE EXCEPTION 'Cannot delete partner: Partner has order history (sales/purchase transactions exist). Partners with transaction history cannot be deleted. Please mark the partner as inactive instead.'
                USING ERRCODE = 'check_violation',
                      HINT = 'Use is_active flag to deactivate partners with order history';
        END IF;

        -- If no order history, soft-delete all aggregate records
        UPDATE partner_sales_aggregates
        SET deleted_at = NEW.deleted_at,
            last_updated_at = NOW()
        WHERE partner_id = NEW.id
        AND deleted_at IS NULL;

        UPDATE partner_purchase_aggregates
        SET deleted_at = NEW.deleted_at,
            last_updated_at = NOW()
        WHERE partner_id = NEW.id
        AND deleted_at IS NULL;
    END IF;

    -- If partner is being restored (deleted_at set to NULL)
    IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
        -- Restore aggregate records
        UPDATE partner_sales_aggregates
        SET deleted_at = NULL,
            last_updated_at = NOW()
        WHERE partner_id = NEW.id
        AND deleted_at IS NOT NULL;

        UPDATE partner_purchase_aggregates
        SET deleted_at = NULL,
            last_updated_at = NOW()
        WHERE partner_id = NEW.id
        AND deleted_at IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on partners table to handle soft-delete
CREATE TRIGGER trg_soft_delete_partner_aggregates
BEFORE UPDATE OF deleted_at ON partners
FOR EACH ROW
EXECUTE FUNCTION trigger_soft_delete_partner_aggregates();
