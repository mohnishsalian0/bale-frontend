-- Product Inventory Aggregates Table
-- Tracks stock metrics per product per warehouse, segregated by stock unit status and origin
--
-- Stock unit statuses (stock_unit_status_enum): available | in_transit | processing
-- Stock unit origins (origin_type):             inward    | convert

CREATE TABLE product_inventory_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Available stock (status = 'available', remaining_quantity > 0)
    -- Units physically present in warehouse, ready to dispatch or convert
    available_units INTEGER DEFAULT 0,
    available_quantity NUMERIC(15,3) DEFAULT 0,
    available_value NUMERIC(15,2) DEFAULT 0, -- Based on cost_price_per_unit

    -- Processing stock (status = 'processing', currently at vendor for conversion)
    -- quantity is the sum of quantity_consumed from active convert input items (not remaining_quantity)
    processing_units INTEGER DEFAULT 0,
    processing_quantity NUMERIC(15,3) DEFAULT 0,
    processing_value NUMERIC(15,2) DEFAULT 0,

    -- In-transit stock (status = 'in_transit', being transferred to another warehouse)
    -- quantity is the remaining_quantity of in_transit units (still physically here until transfer completes)
    in_transit_units INTEGER DEFAULT 0,
    in_transit_quantity NUMERIC(15,3) DEFAULT 0,
    in_transit_value NUMERIC(15,2) DEFAULT 0,

    -- Empty units (remaining_quantity = 0, not deleted)
    -- Units fully consumed via outwards/converts/adjustments; retained for historical traceability
    empty_units INTEGER DEFAULT 0,

    -- Origin breakdown (of all non-deleted units ever created at this warehouse for this product)
    inward_origin_units INTEGER DEFAULT 0,          -- Units received via goods inwards
    inward_origin_quantity NUMERIC(15,3) DEFAULT 0, -- Sum of initial_quantity from inward units
    convert_origin_units INTEGER DEFAULT 0,         -- Units created as output of a goods convert
    convert_origin_quantity NUMERIC(15,3) DEFAULT 0,-- Sum of initial_quantity from convert-output units

    -- Lifetime metrics (= inward_origin + convert_origin, kept for convenience)
    total_units_received INTEGER DEFAULT 0,
    total_quantity_received NUMERIC(15,3) DEFAULT 0,

    -- QR Code metrics
    pending_qr_units INTEGER DEFAULT 0, -- Count of units with remaining_quantity > 0 and no QR code

    -- Alert flags
    is_low_stock BOOLEAN DEFAULT FALSE, -- TRUE when in_stock_quantity <= min_stock_threshold (if min_stock_alert enabled)

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    UNIQUE(product_id, warehouse_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_product_inventory_agg_product ON product_inventory_aggregates(product_id);
CREATE INDEX idx_product_inventory_agg_warehouse ON product_inventory_aggregates(warehouse_id);
CREATE INDEX idx_product_inventory_agg_company ON product_inventory_aggregates(company_id);
CREATE INDEX idx_product_inventory_agg_pending_qr ON product_inventory_aggregates(warehouse_id, pending_qr_units DESC) WHERE pending_qr_units > 0;
CREATE INDEX idx_product_inventory_agg_low_stock ON product_inventory_aggregates(warehouse_id, is_low_stock) WHERE is_low_stock = TRUE;


-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE product_inventory_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view product inventory aggregates"
ON product_inventory_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('business.products.read')
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
    v_min_stock_alert BOOLEAN;
    v_min_stock_threshold NUMERIC(15,3);

    -- Available (status='available', remaining_quantity > 0)
    v_available_units INTEGER;
    v_available_quantity NUMERIC(15,3);
    v_available_value NUMERIC(15,2);

    -- Processing (status='processing' — locked in an in_progress convert)
    -- quantity = sum of quantity_consumed in active convert items (portion scheduled for conversion)
    v_processing_units INTEGER;
    v_processing_quantity NUMERIC(15,3);
    v_processing_value NUMERIC(15,2);

    -- In transit (status='in_transit' — being transferred)
    v_in_transit_units INTEGER;
    v_in_transit_quantity NUMERIC(15,3);
    v_in_transit_value NUMERIC(15,2);

    -- Empty (remaining_quantity = 0, not deleted)
    v_empty_units INTEGER;

    -- Origin breakdown
    v_inward_origin_units INTEGER;
    v_inward_origin_quantity NUMERIC(15,3);
    v_convert_origin_units INTEGER;
    v_convert_origin_quantity NUMERIC(15,3);

    -- Lifetime totals
    v_total_units INTEGER;
    v_total_quantity NUMERIC(15,3);

    -- QR + low stock
    v_pending_qr_units INTEGER;
    v_is_low_stock BOOLEAN;
BEGIN
    -- Get product details (company_id, cost_price, min_stock settings)
    SELECT
        company_id,
        COALESCE(cost_price_per_unit, 0),
        COALESCE(min_stock_alert, FALSE),
        COALESCE(min_stock_threshold, 0)
    INTO
        v_company_id,
        v_cost_price,
        v_min_stock_alert,
        v_min_stock_threshold
    FROM products
    WHERE id = p_product_id;

    IF v_company_id IS NULL THEN
        RETURN; -- Product doesn't exist or was deleted
    END IF;

    -- ----------------------------------------------------------------
    -- Available: status='available', remaining_quantity > 0, not deleted
    -- ----------------------------------------------------------------
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(remaining_quantity), 0)
    INTO v_available_units, v_available_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND current_warehouse_id = p_warehouse_id
        AND status = 'available'
        AND remaining_quantity > 0
        AND deleted_at IS NULL;

    v_available_value := v_available_quantity * v_cost_price;

    -- ----------------------------------------------------------------
    -- Processing: status='processing', tied to an in_progress convert
    -- quantity = quantity_consumed from the active convert input items
    -- (represents the portion of the unit locked for conversion)
    -- ----------------------------------------------------------------
    SELECT
        COALESCE(COUNT(DISTINCT su.id), 0),
        COALESCE(SUM(gci.quantity_consumed), 0)
    INTO v_processing_units, v_processing_quantity
    FROM stock_units su
    JOIN goods_convert_input_items gci ON gci.stock_unit_id = su.id
    JOIN goods_converts gc ON gc.id = gci.convert_id
    WHERE su.product_id = p_product_id
        AND su.current_warehouse_id = p_warehouse_id
        AND su.status = 'processing'
        AND su.deleted_at IS NULL
        AND gc.status = 'in_progress';

    v_processing_value := v_processing_quantity * v_cost_price;

    -- ----------------------------------------------------------------
    -- In transit: status='in_transit', not deleted
    -- quantity = remaining_quantity of the units (still physically at source warehouse)
    -- ----------------------------------------------------------------
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(remaining_quantity), 0)
    INTO v_in_transit_units, v_in_transit_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND current_warehouse_id = p_warehouse_id
        AND status = 'in_transit'
        AND deleted_at IS NULL;

    v_in_transit_value := v_in_transit_quantity * v_cost_price;

    -- ----------------------------------------------------------------
    -- Empty: remaining_quantity = 0, not deleted (fully consumed / dispatched)
    -- ----------------------------------------------------------------
    SELECT COALESCE(COUNT(*), 0)
    INTO v_empty_units
    FROM stock_units
    WHERE product_id = p_product_id
        AND current_warehouse_id = p_warehouse_id
        AND remaining_quantity = 0
        AND deleted_at IS NULL;

    -- ----------------------------------------------------------------
    -- Origin: inward
    -- ----------------------------------------------------------------
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(initial_quantity), 0)
    INTO v_inward_origin_units, v_inward_origin_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND current_warehouse_id = p_warehouse_id
        AND origin_type = 'inward'
        AND deleted_at IS NULL;

    -- ----------------------------------------------------------------
    -- Origin: convert output
    -- ----------------------------------------------------------------
    SELECT
        COALESCE(COUNT(*), 0),
        COALESCE(SUM(initial_quantity), 0)
    INTO v_convert_origin_units, v_convert_origin_quantity
    FROM stock_units
    WHERE product_id = p_product_id
        AND current_warehouse_id = p_warehouse_id
        AND origin_type = 'convert'
        AND deleted_at IS NULL;

    -- Lifetime totals = inward + convert origins
    v_total_units    := v_inward_origin_units    + v_convert_origin_units;
    v_total_quantity := v_inward_origin_quantity + v_convert_origin_quantity;

    -- ----------------------------------------------------------------
    -- Pending QR: units with remaining_quantity > 0 and no QR code yet
    -- ----------------------------------------------------------------
    SELECT COALESCE(COUNT(*), 0)
    INTO v_pending_qr_units
    FROM stock_units
    WHERE product_id = p_product_id
        AND current_warehouse_id = p_warehouse_id
        AND remaining_quantity > 0
        AND qr_generated_at IS NULL
        AND deleted_at IS NULL;

    -- Low stock: TRUE when alert is enabled AND available quantity <= threshold
    v_is_low_stock := v_min_stock_alert AND (v_available_quantity <= v_min_stock_threshold);

    -- ----------------------------------------------------------------
    -- Upsert
    -- ----------------------------------------------------------------
    INSERT INTO product_inventory_aggregates (
        product_id,
        warehouse_id,
        company_id,
        available_units,
        available_quantity,
        available_value,
        processing_units,
        processing_quantity,
        processing_value,
        in_transit_units,
        in_transit_quantity,
        in_transit_value,
        empty_units,
        inward_origin_units,
        inward_origin_quantity,
        convert_origin_units,
        convert_origin_quantity,
        total_units_received,
        total_quantity_received,
        pending_qr_units,
        is_low_stock,
        last_updated_at
    ) VALUES (
        p_product_id,
        p_warehouse_id,
        v_company_id,
        v_available_units,
        v_available_quantity,
        v_available_value,
        v_processing_units,
        v_processing_quantity,
        v_processing_value,
        v_in_transit_units,
        v_in_transit_quantity,
        v_in_transit_value,
        v_empty_units,
        v_inward_origin_units,
        v_inward_origin_quantity,
        v_convert_origin_units,
        v_convert_origin_quantity,
        v_total_units,
        v_total_quantity,
        v_pending_qr_units,
        v_is_low_stock,
        NOW()
    )
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
        available_units         = EXCLUDED.available_units,
        available_quantity      = EXCLUDED.available_quantity,
        available_value         = EXCLUDED.available_value,
        processing_units        = EXCLUDED.processing_units,
        processing_quantity     = EXCLUDED.processing_quantity,
        processing_value        = EXCLUDED.processing_value,
        in_transit_units        = EXCLUDED.in_transit_units,
        in_transit_quantity     = EXCLUDED.in_transit_quantity,
        in_transit_value        = EXCLUDED.in_transit_value,
        empty_units             = EXCLUDED.empty_units,
        inward_origin_units     = EXCLUDED.inward_origin_units,
        inward_origin_quantity  = EXCLUDED.inward_origin_quantity,
        convert_origin_units    = EXCLUDED.convert_origin_units,
        convert_origin_quantity = EXCLUDED.convert_origin_quantity,
        total_units_received    = EXCLUDED.total_units_received,
        total_quantity_received = EXCLUDED.total_quantity_received,
        pending_qr_units        = EXCLUDED.pending_qr_units,
        is_low_stock            = EXCLUDED.is_low_stock,
        last_updated_at         = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for INSERT and DELETE (context is always known, no branching needed)
CREATE OR REPLACE FUNCTION trigger_update_product_inventory_aggregates_on_insert_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM recalculate_product_inventory_aggregates(NEW.product_id, NEW.current_warehouse_id);
        RETURN NEW;
    END IF;

    -- DELETE
    PERFORM recalculate_product_inventory_aggregates(OLD.product_id, OLD.current_warehouse_id);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- INSERT and DELETE always matter — no WHEN needed
CREATE TRIGGER trg_update_product_inventory_aggregates_insert_delete
AFTER INSERT OR DELETE ON stock_units
FOR EACH ROW
EXECUTE FUNCTION trigger_update_product_inventory_aggregates_on_insert_delete();

-- Trigger function for UPDATE (warehouse-change is the only branching needed)
CREATE OR REPLACE FUNCTION trigger_update_product_inventory_aggregates_on_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Always recalculate the new warehouse
    PERFORM recalculate_product_inventory_aggregates(NEW.product_id, NEW.current_warehouse_id);

    -- If the unit moved warehouses, also recalculate the old warehouse
    IF OLD.current_warehouse_id IS DISTINCT FROM NEW.current_warehouse_id THEN
        PERFORM recalculate_product_inventory_aggregates(OLD.product_id, OLD.current_warehouse_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- UPDATE: only fire when a field that affects aggregates actually changed
-- Covers: available/processing/in_transit buckets (status, remaining_quantity),
--         warehouse routing (current_warehouse_id), QR metric (qr_generated_at),
--         and soft-delete/restore (deleted_at).
-- origin_type and initial_quantity are set at INSERT only, never updated.
CREATE TRIGGER trg_update_product_inventory_aggregates_update
AFTER UPDATE ON stock_units
FOR EACH ROW
WHEN (
    OLD.current_warehouse_id IS DISTINCT FROM NEW.current_warehouse_id OR
    OLD.remaining_quantity    IS DISTINCT FROM NEW.remaining_quantity OR
    OLD.status                IS DISTINCT FROM NEW.status OR
    OLD.qr_generated_at       IS DISTINCT FROM NEW.qr_generated_at OR
    OLD.deleted_at            IS DISTINCT FROM NEW.deleted_at
)
EXECUTE FUNCTION trigger_update_product_inventory_aggregates_on_update();

-- Trigger function to create initial aggregates when a new product is created
CREATE OR REPLACE FUNCTION trigger_create_product_inventory_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create aggregate records for all warehouses in the company
    INSERT INTO product_inventory_aggregates (
        product_id,
        warehouse_id,
        company_id,
        available_units,
        available_quantity,
        available_value,
        processing_units,
        processing_quantity,
        processing_value,
        in_transit_units,
        in_transit_quantity,
        in_transit_value,
        empty_units,
        inward_origin_units,
        inward_origin_quantity,
        convert_origin_units,
        convert_origin_quantity,
        total_units_received,
        total_quantity_received
    )
    SELECT
        NEW.id,
        w.id,
        NEW.company_id,
        0, 0, 0, -- available
        0, 0, 0, -- processing
        0, 0, 0, -- in_transit
        0,       -- empty
        0, 0,    -- inward_origin
        0, 0,    -- convert_origin
        0, 0     -- total
    FROM warehouses w
    WHERE w.company_id = NEW.company_id
    ON CONFLICT (product_id, warehouse_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on products table to initialize aggregates
CREATE TRIGGER trg_create_product_inventory_aggregates
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_create_product_inventory_aggregates();

-- Trigger function to create aggregates when a new warehouse is created
CREATE OR REPLACE FUNCTION trigger_create_warehouse_inventory_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create aggregate records for all products in the company
    INSERT INTO product_inventory_aggregates (
        product_id,
        warehouse_id,
        company_id,
        available_units,
        available_quantity,
        available_value,
        processing_units,
        processing_quantity,
        processing_value,
        in_transit_units,
        in_transit_quantity,
        in_transit_value,
        empty_units,
        inward_origin_units,
        inward_origin_quantity,
        convert_origin_units,
        convert_origin_quantity,
        total_units_received,
        total_quantity_received,
        pending_qr_units
    )
    SELECT
        p.id,
        NEW.id,
        NEW.company_id,
        0, 0, 0, -- available
        0, 0, 0, -- processing
        0, 0, 0, -- in_transit
        0,       -- empty
        0, 0,    -- inward_origin
        0, 0,    -- convert_origin
        0, 0,    -- total
        0        -- pending_qr
    FROM products p
    WHERE p.company_id = NEW.company_id
    ON CONFLICT (product_id, warehouse_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on warehouses table to initialize aggregates
CREATE TRIGGER trg_create_warehouse_inventory_aggregates
AFTER INSERT ON warehouses
FOR EACH ROW
EXECUTE FUNCTION trigger_create_warehouse_inventory_aggregates();

-- Trigger function to soft-delete aggregates when a product is soft-deleted
CREATE OR REPLACE FUNCTION trigger_soft_delete_product_inventory_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    v_has_inventory BOOLEAN;
BEGIN
    -- Only proceed if deleted_at is being set (soft-delete operation)
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
        -- Check if product has any inventory across all warehouses
        SELECT EXISTS (
            SELECT 1
            FROM product_inventory_aggregates
            WHERE product_id = NEW.id
            AND (
                total_units_received > 0 OR
                total_quantity_received > 0
            )
        ) INTO v_has_inventory;

        -- Prevent deletion if product ever had inventory
        IF v_has_inventory THEN
            RAISE EXCEPTION 'Cannot delete product: Product has inventory history (inward/outward transactions exist). Products with transaction history cannot be deleted. Please mark the product as inactive instead.'
                USING ERRCODE = 'check_violation',
                      HINT = 'Use is_active flag to deactivate products with inventory history';
        END IF;

        -- If no inventory, soft-delete all aggregate records
        UPDATE product_inventory_aggregates
        SET deleted_at = NEW.deleted_at,
            last_updated_at = NOW()
        WHERE product_id = NEW.id
        AND deleted_at IS NULL;
    END IF;

    -- If product is being restored (deleted_at set to NULL)
    IF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
        -- Restore aggregate records
        UPDATE product_inventory_aggregates
        SET deleted_at = NULL,
            last_updated_at = NOW()
        WHERE product_id = NEW.id
        AND deleted_at IS NOT NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on products table to handle soft-delete
CREATE TRIGGER trg_soft_delete_product_inventory_aggregates
BEFORE UPDATE OF deleted_at ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_soft_delete_product_inventory_aggregates();

-- Trigger function to update is_low_stock when product min_stock settings change
CREATE OR REPLACE FUNCTION trigger_update_product_min_stock_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if min_stock_alert or min_stock_threshold changed
    IF (NEW.min_stock_alert != OLD.min_stock_alert) OR
       (NEW.min_stock_threshold != OLD.min_stock_threshold) THEN
        -- Recompute is_low_stock for this product across all warehouses
        -- Low stock is based on available_quantity (not total), since processing/in_transit
        -- stock is not accessible for dispatch
        UPDATE product_inventory_aggregates
        SET
            is_low_stock = NEW.min_stock_alert AND (available_quantity <= NEW.min_stock_threshold),
            last_updated_at = NOW()
        WHERE product_id = NEW.id
        AND deleted_at IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on products table to handle min_stock settings changes
CREATE TRIGGER trg_update_product_min_stock_aggregates
AFTER UPDATE OF min_stock_alert, min_stock_threshold ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_update_product_min_stock_aggregates();

-- Add comment
COMMENT ON TABLE product_inventory_aggregates IS
'Aggregated inventory metrics per product per warehouse.
Columns:
  available_*    : status=available AND remaining_quantity > 0 (ready to use)
  processing_*   : status=processing; quantity = quantity_consumed locked in active convert(s)
  in_transit_*   : status=in_transit (being transferred); quantity = remaining_quantity
  empty_units    : remaining_quantity = 0 (fully consumed/dispatched), kept for traceability
  inward_origin_*: units that entered via goods inwards
  convert_origin_*: units created as output of a goods convert
  total_*        : inward_origin + convert_origin combined
Updated automatically via triggers on stock_units, products, and warehouses.';
