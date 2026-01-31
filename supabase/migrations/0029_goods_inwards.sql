-- Bale Backend - Goods Movement (Outward and Inward)
-- Comprehensive outward and inward inventory management

-- =====================================================
-- GOODS INWARD TABLE
-- =====================================================

CREATE TABLE goods_inwards (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Inward identification
    sequence_number INTEGER NOT NULL,

    -- Inward type
    inward_type VARCHAR(20) NOT NULL CHECK (inward_type IN ('job_work', 'sales_return', 'purchase_order', 'other')),

    -- Linking (optional, for reference)
    sales_order_id UUID REFERENCES sales_orders(id), -- When inward_type = 'sales_return'
    job_work_id UUID REFERENCES job_works(id), -- When inward_type = 'job_work'
    purchase_order_id UUID REFERENCES purchase_orders(id), -- When inward_type = 'purchase_order'
    other_reason TEXT, -- Required when inward_type = 'other'

    -- Senders
    partner_id UUID NOT NULL REFERENCES partners(id),
    agent_id UUID REFERENCES partners(id), -- Optional agent

    -- Details
    inward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    transport_reference_number VARCHAR(50),
    transport_type VARCHAR(20) CHECK (transport_type IN ('road', 'rail', 'air', 'sea', 'courier')),

    -- Invoice tracking
    has_invoice BOOLEAN DEFAULT false,

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
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Full-text search
    search_vector tsvector,

    -- Business logic constraints
    CONSTRAINT check_inward_type_requirements
        CHECK (
						(inward_type = 'job_work' AND job_work_id IS NOT NULL) OR
						(inward_type = 'sales_return' AND sales_order_id IS NOT NULL) OR
						(inward_type = 'purchase_order' AND purchase_order_id IS NOT NULL) OR
						(inward_type = 'other' AND other_reason IS NOT NULL)
        ),

    UNIQUE(company_id, sequence_number)
);


-- Now add the missing foreign key constraint to stock_units
ALTER TABLE stock_units ADD CONSTRAINT fk_stock_unit_inward
    FOREIGN KEY (created_from_inward_id) REFERENCES goods_inwards(id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Goods Inward indexes
CREATE INDEX idx_goods_inwards_company_id ON goods_inwards(company_id);
CREATE INDEX idx_goods_inwards_warehouse_id ON goods_inwards(warehouse_id);
CREATE INDEX idx_goods_inwards_date ON goods_inwards(company_id, inward_date);
CREATE INDEX idx_goods_inwards_sequence_number ON goods_inwards(company_id, sequence_number);
CREATE INDEX idx_goods_inwards_partner ON goods_inwards(partner_id);
CREATE INDEX idx_goods_inwards_sales_order ON goods_inwards(sales_order_id);
CREATE INDEX idx_goods_inwards_job_work ON goods_inwards(job_work_id);
CREATE INDEX idx_goods_inwards_purchase_order ON goods_inwards(purchase_order_id);
CREATE INDEX idx_goods_inwards_has_invoice ON goods_inwards(company_id, has_invoice) WHERE has_invoice = false;

-- Full-text search index
CREATE INDEX idx_goods_inwards_search ON goods_inwards USING GIN(search_vector);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_goods_inwards_updated_at
    BEFORE UPDATE ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_goods_inwards_modified_by
    BEFORE UPDATE ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_inward_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('goods_inwards', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_inward_sequence
    BEFORE INSERT ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION auto_generate_inward_sequence();

-- Update partner's last_interaction_at timestamp
CREATE TRIGGER trigger_goods_inwards_update_partner_interaction
    AFTER INSERT OR UPDATE ON goods_inwards
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL AND NEW.partner_id IS NOT NULL)
    EXECUTE FUNCTION update_partner_last_interaction();

-- Prevent goods_inward deletion if invoiced
CREATE OR REPLACE FUNCTION prevent_invoiced_inward_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.has_invoice = true THEN
        RAISE EXCEPTION 'Cannot delete goods inward - linked to invoice';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_invoiced_inward_delete
    BEFORE DELETE ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION prevent_invoiced_inward_delete();

-- Prevent critical field edits if invoiced
CREATE OR REPLACE FUNCTION prevent_invoiced_inward_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.has_invoice = true THEN
        RAISE EXCEPTION 'Cannot edit goods inward - linked to invoice. Critical fields are locked.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_invoiced_inward_edit
    BEFORE UPDATE ON goods_inwards
    FOR EACH ROW
    WHEN (
        OLD.inward_date IS DISTINCT FROM NEW.inward_date OR
        OLD.partner_id IS DISTINCT FROM NEW.partner_id
    )
    EXECUTE FUNCTION prevent_invoiced_inward_edit();

-- =====================================================
-- GOODS INWARD TABLE RLS POLICIES
-- =====================================================

ALTER TABLE goods_inwards ENABLE ROW LEVEL SECURITY;

-- Authorized users can view goods inwards in their assigned warehouses
CREATE POLICY "Authorized users can view goods inwards"
ON goods_inwards
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_inwards.read')
);

-- Authorized users can create goods inwards in their assigned warehouses
CREATE POLICY "Authorized users can create goods inwards"
ON goods_inwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_inwards.create')
);

-- Authorized users can update goods inwards in their assigned warehouses
CREATE POLICY "Authorized users can update goods inwards"
ON goods_inwards
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_inwards.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_inwards.update')
);

-- Authorized users can delete goods inwards
CREATE POLICY "Authorized users can delete goods inwards"
ON goods_inwards
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('goods_inwards.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON goods_inwards TO authenticated;
