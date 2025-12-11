-- Bale Backend - QR Code Generation System
-- Comprehensive QR code generation with customization and batch printing

-- =====================================================
-- QR CODE GENERATION BATCHES
-- =====================================================

CREATE TABLE qr_batches (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    batch_name VARCHAR(100) NOT NULL,
    image_url TEXT,
    fields_selected TEXT[], -- Fields to display on QR code
    pdf_url TEXT, -- Generated PDF location

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_qr_batches_company_id ON qr_batches(company_id);
CREATE INDEX idx_qr_batches_warehouse_id ON qr_batches(warehouse_id);
CREATE INDEX idx_qr_batches_created_at ON qr_batches(warehouse_id, created_at);

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

-- =====================================================
-- QR CODE MANAGEMENT RLS POLICIES
-- =====================================================

ALTER TABLE qr_batches ENABLE ROW LEVEL SECURITY;

-- Authorized users can view QR batches in their assigned warehouses
CREATE POLICY "Authorized users can view QR batches"
ON qr_batches
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batches.read')
);

-- Authorized users can create QR batches in their assigned warehouses
CREATE POLICY "Authorized users can create QR batches"
ON qr_batches
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batches.create')
);

-- Authorized users can update QR batches in their assigned warehouses
CREATE POLICY "Authorized users can update QR batches"
ON qr_batches
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batches.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batches.update')
);

-- Authorized users can delete QR batches in their assigned warehouses
CREATE POLICY "Authorized users can delete QR batches"
ON qr_batches
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('qr_batches.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_batches TO authenticated;
