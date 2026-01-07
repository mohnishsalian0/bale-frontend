
-- Bale Backend - QR Code Generation System
-- Comprehensive QR code generation with customization and batch printing

-- =====================================================
-- QR BATCH ITEMS (which units were included)
-- =====================================================

CREATE TABLE qr_batch_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES qr_batches(id) ON DELETE CASCADE,
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- QR Batch Items indexes
CREATE INDEX idx_qr_batch_items_batch_id ON qr_batch_items(batch_id);
CREATE INDEX idx_qr_batch_items_stock_unit ON qr_batch_items(stock_unit_id);
CREATE INDEX idx_qr_batch_items_warehouse_id ON qr_batch_items(warehouse_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Update QR tracking when stock units are added to QR batch
CREATE OR REPLACE FUNCTION update_qr_tracking()
RETURNS TRIGGER AS $$
DECLARE
    batch_created_at TIMESTAMPTZ;
BEGIN
    -- Get the batch creation timestamp
    SELECT created_at INTO batch_created_at
    FROM qr_batches
    WHERE id = NEW.batch_id;

    -- Update stock unit with QR tracking info
    UPDATE stock_units
    SET qr_generated_at = batch_created_at
    WHERE id = NEW.stock_unit_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_qr_tracking
    AFTER INSERT ON qr_batch_items
    FOR EACH ROW EXECUTE FUNCTION update_qr_tracking();

-- =====================================================
-- QR CODE MANAGEMENT RLS POLICIES
-- =====================================================

ALTER TABLE qr_batch_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view QR batch items in their assigned warehouses
CREATE POLICY "Authorized users can view QR batch items"
ON qr_batch_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batch_items.read')
);

-- Authorized users can create QR batch items in their assigned warehouses
CREATE POLICY "Authorized users can create QR batch items"
ON qr_batch_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batch_items.create')
);

-- Authorized users can update QR batch items in their assigned warehouses
CREATE POLICY "Authorized users can update QR batch items"
ON qr_batch_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batch_items.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batch_items.update')
);

-- Authorized users can delete QR batch items in their assigned warehouses
CREATE POLICY "Authorized users can delete QR batch items"
ON qr_batch_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batch_items.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON qr_batch_items TO authenticated;
