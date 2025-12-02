-- Product Inventory Aggregates Table
-- Tracks stock metrics per product per warehouse, segregated by stock unit status

CREATE TABLE product_inventory_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- In Stock metrics (status = 'in_stock')
    in_stock_units INTEGER DEFAULT 0,
    in_stock_quantity NUMERIC(15,3) DEFAULT 0,
    in_stock_value NUMERIC(15,2) DEFAULT 0, -- Based on cost_price_per_unit

    -- Dispatched metrics (status = 'dispatched')
    dispatched_units INTEGER DEFAULT 0,
    dispatched_quantity NUMERIC(15,3) DEFAULT 0,
    dispatched_value NUMERIC(15,2) DEFAULT 0,

    -- Removed metrics (status = 'removed')
    removed_units INTEGER DEFAULT 0,
    removed_quantity NUMERIC(15,3) DEFAULT 0,
    removed_value NUMERIC(15,2) DEFAULT 0,

    -- Lifetime metrics (all statuses combined)
    total_units_received INTEGER DEFAULT 0,
    total_quantity_received NUMERIC(15,3) DEFAULT 0,

    -- QR Code metrics
    pending_qr_units INTEGER DEFAULT 0, -- Count of in_stock units without QR codes

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(product_id, warehouse_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_product_inventory_agg_product ON product_inventory_aggregates(product_id);
CREATE INDEX idx_product_inventory_agg_warehouse ON product_inventory_aggregates(warehouse_id);
CREATE INDEX idx_product_inventory_agg_company ON product_inventory_aggregates(company_id);
CREATE INDEX idx_product_inventory_agg_pending_qr ON product_inventory_aggregates(warehouse_id, pending_qr_units DESC) WHERE pending_qr_units > 0;

-- RLS Policies
ALTER TABLE product_inventory_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view product inventory aggregates"
ON product_inventory_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('products.read')
);

-- Function to recalculate product inventory aggregates
CREATE OR REPLACE FUNCTION recalculate_product_inventory_aggregates(
    p_product_id UUID,
    p_warehouse_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
    v_cost_price NUMERIC(15,2);
    v_in_stock_units INTEGER;
    v_in_stock_quantity NUMERIC(15,3);
    v_in_stock_value NUMERIC(15,2);
    v_dispatched_units INTEGER;
    v_dispatched_quantity NUMERIC(15,3);
    v_dispatched_value NUMERIC(15,2);
    v_removed_units INTEGER;
    v_removed_quantity NUMERIC(15,3);
    v_removed_value NUMERIC(15,2);
    v_total_units INTEGER;
    v_total_quantity NUMERIC(15,3);
    v_pending_qr_units INTEGER;
BEGIN
    -- Get product company_id and cost_price
    SELECT company_id, COALESCE(cost_price_per_unit, 0)
    INTO v_company_id, v_cost_price
    FROM products
    WHERE id = p_product_id;

    IF v_company_id IS NULL THEN
        RETURN; -- Product doesn't exist or was deleted
    END IF;

    -- Calculate in_stock metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(remaining_quantity), 0)
    INTO v_in_stock_units, v_in_stock_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND status = 'in_stock'
        AND deleted_at IS NULL;

    v_in_stock_value := v_in_stock_quantity * v_cost_price;

    -- Calculate pending QR units (in_stock units without QR code)
    SELECT COALESCE(COUNT(*), 0)
    INTO v_pending_qr_units
    FROM stock_units
    WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND status = 'in_stock'
        AND qr_generated_at IS NULL
        AND deleted_at IS NULL;

    -- Calculate dispatched metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(remaining_quantity), 0)
    INTO v_dispatched_units, v_dispatched_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND status = 'dispatched'
        AND deleted_at IS NULL;

    v_dispatched_value := v_dispatched_quantity * v_cost_price;

    -- Calculate removed metrics
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(remaining_quantity), 0)
    INTO v_removed_units, v_removed_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND status = 'removed'
        AND deleted_at IS NULL;

    v_removed_value := v_removed_quantity * v_cost_price;

    -- Calculate lifetime totals (all statuses)
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(initial_quantity), 0)
    INTO v_total_units, v_total_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND deleted_at IS NULL;

    -- Upsert into aggregates table
    INSERT INTO product_inventory_aggregates (
        product_id,
        warehouse_id,
        company_id,
        in_stock_units,
        in_stock_quantity,
        in_stock_value,
        dispatched_units,
        dispatched_quantity,
        dispatched_value,
        removed_units,
        removed_quantity,
        removed_value,
        total_units_received,
        total_quantity_received,
        pending_qr_units,
        last_updated_at
    ) VALUES (
        p_product_id,
        p_warehouse_id,
        v_company_id,
        v_in_stock_units,
        v_in_stock_quantity,
        v_in_stock_value,
        v_dispatched_units,
        v_dispatched_quantity,
        v_dispatched_value,
        v_removed_units,
        v_removed_quantity,
        v_removed_value,
        v_total_units,
        v_total_quantity,
        v_pending_qr_units,
        NOW()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
        in_stock_units = EXCLUDED.in_stock_units,
        in_stock_quantity = EXCLUDED.in_stock_quantity,
        in_stock_value = EXCLUDED.in_stock_value,
        dispatched_units = EXCLUDED.dispatched_units,
        dispatched_quantity = EXCLUDED.dispatched_quantity,
        dispatched_value = EXCLUDED.dispatched_value,
        removed_units = EXCLUDED.removed_units,
        removed_quantity = EXCLUDED.removed_quantity,
        removed_value = EXCLUDED.removed_value,
        total_units_received = EXCLUDED.total_units_received,
        total_quantity_received = EXCLUDED.total_quantity_received,
        pending_qr_units = EXCLUDED.pending_qr_units,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update aggregates when stock units change
CREATE OR REPLACE FUNCTION trigger_update_product_inventory_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT and UPDATE
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM recalculate_product_inventory_aggregates(NEW.product_id, NEW.warehouse_id);
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_product_inventory_aggregates(OLD.product_id, OLD.warehouse_id);
    END IF;

    -- Handle UPDATE where warehouse changed (recalculate both old and new warehouse)
    IF TG_OP = 'UPDATE' AND OLD.warehouse_id != NEW.warehouse_id THEN
        PERFORM recalculate_product_inventory_aggregates(OLD.product_id, OLD.warehouse_id);
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on stock_units table
CREATE TRIGGER trg_update_product_inventory_aggregates
AFTER INSERT OR UPDATE OR DELETE ON stock_units
FOR EACH ROW
EXECUTE FUNCTION trigger_update_product_inventory_aggregates();

-- Trigger function to create initial aggregates when a new product is created
CREATE OR REPLACE FUNCTION trigger_create_product_inventory_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create aggregate records for all warehouses in the company
    INSERT INTO product_inventory_aggregates (
        product_id,
        warehouse_id,
        company_id,
        in_stock_units,
        in_stock_quantity,
        in_stock_value,
        dispatched_units,
        dispatched_quantity,
        dispatched_value,
        removed_units,
        removed_quantity,
        removed_value,
        total_units_received,
        total_quantity_received
    )
    SELECT
        NEW.id,
        w.id,
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
        0
    FROM warehouses w
    WHERE w.company_id = NEW.company_id
    ON CONFLICT (product_id, warehouse_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on products table to initialize aggregates
CREATE TRIGGER trg_create_product_inventory_aggregates
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_create_product_inventory_aggregates();

-- Add comment
COMMENT ON TABLE product_inventory_aggregates IS 'Aggregated inventory metrics per product per warehouse, segregated by stock unit status. Updated automatically via triggers.';
