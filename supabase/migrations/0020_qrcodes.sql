-- Bale Backend - QR Code Generation System
-- Comprehensive QR code generation with customization and batch printing

-- =====================================================
-- QR CODE GENERATION BATCHES
-- =====================================================

CREATE TABLE qr_batches (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    batch_name VARCHAR(100) NOT NULL,
    image_url TEXT,
    fields_selected TEXT[], -- Fields to display on QR code
    pdf_url TEXT, -- Generated PDF location

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_current_user_id() REFERENCES users(id),
    modified_by UUID REFERENCES users(id)
);

-- =====================================================
-- QR BATCH ITEMS (which units were included)
-- =====================================================

CREATE TABLE qr_batch_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES qr_batches(id) ON DELETE CASCADE,
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- QR Batches indexes
CREATE INDEX idx_qr_batches_company_id ON qr_batches(company_id);
CREATE INDEX idx_qr_batches_warehouse_id ON qr_batches(warehouse_id);
CREATE INDEX idx_qr_batches_created_at ON qr_batches(warehouse_id, created_at);

-- QR Batch Items indexes
CREATE INDEX idx_qr_batch_items_batch_id ON qr_batch_items(batch_id);
CREATE INDEX idx_qr_batch_items_stock_unit ON qr_batch_items(stock_unit_id);
CREATE INDEX idx_qr_batch_items_warehouse_id ON qr_batch_items(warehouse_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_qr_batches_updated_at
    BEFORE UPDATE ON qr_batches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_qr_batches_modified_by
    BEFORE UPDATE ON qr_batches
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

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
