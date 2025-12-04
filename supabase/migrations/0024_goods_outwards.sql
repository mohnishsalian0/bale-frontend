
-- Bale Backend - Goods Movement (Outward and Inward)
-- Comprehensive outward and inward inventory management

-- =====================================================
-- GOODS OUTWARD TABLE
-- =====================================================

CREATE TABLE goods_outwards (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Outward identification
    sequence_number INTEGER NOT NULL,

    -- Outward type
    outward_type VARCHAR(20) NOT NULL CHECK (outward_type IN ('sales_order', 'job_work', 'purchase_return', 'other')),

    -- Linking (optional, for reference)
    sales_order_id UUID REFERENCES sales_orders(id), -- When outward_type = 'sales'
    job_work_id UUID REFERENCES job_works(id), -- When outward_type = 'job_work'
    purchase_order_number VARCHAR(100), -- When outward_type = 'purchase_return'
    other_reason TEXT, -- When outward_type = 'other'

    -- Recipients
    partner_id UUID REFERENCES partners(id),
    to_warehouse_id UUID REFERENCES warehouses(id), -- For warehouse_transfer
    agent_id UUID REFERENCES partners(id), -- Optional agent for sales

    -- Details
    outward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    transport_reference_number VARCHAR(50),
    transport_type VARCHAR(20) CHECK (transport_type IN ('road', 'rail', 'air', 'sea', 'courier')),
    transport_details TEXT,

    -- Cancellation/Reversal tracking
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,

    notes TEXT,
    attachments TEXT[], -- Array of file URLs

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Business logic constraints
    CONSTRAINT check_outward_source
        CHECK (
            (partner_id IS NOT NULL AND to_warehouse_id IS NULL) OR
            (partner_id IS NULL AND to_warehouse_id IS NOT NULL AND to_warehouse_id != warehouse_id)
        ),
    CONSTRAINT check_outward_type_requirement
        CHECK (
						(outward_type = 'sales_order' AND sales_order_id IS NOT NULL) OR
						(outward_type = 'job_work' AND job_work_id IS NOT NULL) OR
						(outward_type = 'purchase_return' AND purchase_order_number IS NOT NULL) OR
						(outward_type = 'other' AND other_reason IS NOT NULL)
        ),

    UNIQUE(company_id, sequence_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_goods_outwards_company_id ON goods_outwards(company_id);
CREATE INDEX idx_goods_outwards_warehouse_id ON goods_outwards(warehouse_id);
CREATE INDEX idx_goods_outwards_date ON goods_outwards(company_id, outward_date);
CREATE INDEX idx_goods_outwards_sequence_number ON goods_outwards(company_id, sequence_number);
CREATE INDEX idx_goods_outwards_partner ON goods_outwards(partner_id);
CREATE INDEX idx_goods_outwards_sales_order ON goods_outwards(sales_order_id);
CREATE INDEX idx_goods_outwards_job_work ON goods_outwards(job_work_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_goods_outwards_updated_at
    BEFORE UPDATE ON goods_outwards
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_goods_outwards_modified_by
    BEFORE UPDATE ON goods_outwards
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_outward_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('goods_outwards', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_outward_sequence
    BEFORE INSERT ON goods_outwards
    FOR EACH ROW EXECUTE FUNCTION auto_generate_outward_sequence();

-- Update partner's last_interaction_at timestamp
CREATE TRIGGER trigger_goods_outwards_update_partner_interaction
    AFTER INSERT OR UPDATE ON goods_outwards
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL AND NEW.partner_id IS NOT NULL)
    EXECUTE FUNCTION update_partner_last_interaction();

-- =====================================================
-- GOODS OUTWARD TABLE RLS POLICIES
-- =====================================================

ALTER TABLE goods_outwards ENABLE ROW LEVEL SECURITY;

-- Authorized users can view goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can view goods outwards"
ON goods_outwards
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_outwards.read')
);

-- Authorized users can create goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can create goods outwards"
ON goods_outwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_outwards.create')
);

-- Authorized users can update goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can update goods outwards"
ON goods_outwards
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_outwards.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_outwards.update')
);

-- Authorized users can delete goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can delete goods outwards"
ON goods_outwards
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_outwards.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON goods_outwards TO authenticated;
