-- Bale Backend - Job Works Management
-- Job work coordination with goods convert integration for fulfillment tracking

-- =====================================================
-- JOB WORKS TABLE
-- =====================================================

CREATE TABLE job_works (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Job identification
    sequence_number INTEGER NOT NULL,

    -- Warehouse (required for job works)
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Partners
    vendor_id UUID NOT NULL REFERENCES partners(id),
    agent_id UUID REFERENCES partners(id),

    -- Job details
    service_type_attribute_id UUID NOT NULL REFERENCES attributes(id), -- Service type from attributes (group_name='service_type')

    -- Dates
    start_date DATE NOT NULL,
    due_date DATE,

    -- Financial
    advance_amount DECIMAL(15,2) DEFAULT 0,
    discount_type discount_type_enum DEFAULT 'none' NOT NULL,
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_type tax_type_enum DEFAULT 'gst',
    gst_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,

    -- Link tracking flags
    has_convert BOOLEAN DEFAULT false,

    -- Status (approval workflow)
    status VARCHAR(20) NOT NULL DEFAULT 'approval_pending'
        CHECK (status IN ('approval_pending', 'in_progress', 'completed', 'cancelled')),

    -- Approval tracking
    approved_at TIMESTAMPTZ,
    approved_by UUID,

    -- Completion tracking
    completed_at TIMESTAMPTZ,
    completed_by UUID,

    -- Cancellation tracking
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

    UNIQUE(company_id, sequence_number)
);

-- =====================================================
-- JOB WORK ITEMS TABLE
-- =====================================================

CREATE TABLE job_work_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    job_work_id UUID NOT NULL REFERENCES job_works(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id), -- Output product expected from vendor

    -- Quantities
    expected_quantity DECIMAL(10,3) NOT NULL,
    received_quantity DECIMAL(10,3) DEFAULT 0,
    pending_quantity DECIMAL(10,3) GENERATED ALWAYS AS (expected_quantity - received_quantity) STORED,

    -- Pricing
    unit_rate DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (expected_quantity * COALESCE(unit_rate, 0)) STORED,

    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Job Works indexes
CREATE INDEX idx_job_works_company_id ON job_works(company_id);
CREATE INDEX idx_job_works_warehouse_id ON job_works(warehouse_id);
CREATE INDEX idx_job_works_vendor ON job_works(company_id, vendor_id);
CREATE INDEX idx_job_works_status ON job_works(company_id, status);
CREATE INDEX idx_job_works_sequence_number ON job_works(company_id, sequence_number);
CREATE INDEX idx_job_works_service_type ON job_works(service_type_attribute_id);
CREATE INDEX idx_job_works_start_date ON job_works(company_id, start_date);

-- Full-text search index
CREATE INDEX idx_job_works_search ON job_works USING GIN(search_vector);

-- Job Work Items indexes
CREATE INDEX idx_job_work_items_company_id ON job_work_items(company_id);
CREATE INDEX idx_job_work_items_job_work ON job_work_items(job_work_id);
CREATE INDEX idx_job_work_items_product ON job_work_items(product_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_job_works_updated_at
    BEFORE UPDATE ON job_works
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_job_works_modified_by
    BEFORE UPDATE ON job_works
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_job_work_sequence()
RETURNS TRIGGER AS $$
BEGIN
    NEW.sequence_number := get_next_sequence('job_works', NEW.company_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_job_work_sequence
    BEFORE INSERT ON job_works
    FOR EACH ROW EXECUTE FUNCTION auto_generate_job_work_sequence();

-- Auto-set approved_at and approved_by
CREATE TRIGGER set_job_works_approved_at
    BEFORE UPDATE ON job_works
    FOR EACH ROW
    WHEN (OLD.status != 'in_progress' AND NEW.status = 'in_progress')
    EXECUTE FUNCTION set_approved_at();

CREATE TRIGGER set_job_works_approved_by
    BEFORE UPDATE ON job_works
    FOR EACH ROW
    WHEN (OLD.status != 'in_progress' AND NEW.status = 'in_progress')
    EXECUTE FUNCTION set_approved_by();

-- Auto-set completed_at and completed_by
CREATE TRIGGER set_job_works_completed_at
    BEFORE UPDATE ON job_works
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION set_completed_at();

CREATE TRIGGER set_job_works_completed_by
    BEFORE UPDATE ON job_works
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION set_completed_by();

-- Auto-set cancelled_at and cancelled_by
CREATE TRIGGER set_job_works_cancelled_at
    BEFORE UPDATE ON job_works
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION set_cancelled_at();

CREATE TRIGGER set_job_works_cancelled_by
    BEFORE UPDATE ON job_works
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION set_cancelled_by();

-- Update partner's last_interaction_at
CREATE TRIGGER trigger_job_works_update_partner_interaction
    AFTER INSERT OR UPDATE ON job_works
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL)
    EXECUTE FUNCTION update_partner_last_interaction();

-- Auto-update timestamps on items
CREATE TRIGGER update_job_work_items_updated_at
    BEFORE UPDATE ON job_work_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- JOB WORKS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE job_works ENABLE ROW LEVEL SECURITY;

-- Authorized users can view job works in their assigned warehouses
CREATE POLICY "Authorized users can view job works"
ON job_works
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.read')
);

-- Authorized users can create job works
CREATE POLICY "Authorized users can create job works"
ON job_works
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.create')
);

-- Authorized users can update job works
CREATE POLICY "Authorized users can update job works"
ON job_works
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.update')
);

-- Authorized users can delete job works
CREATE POLICY "Authorized users can delete job works"
ON job_works
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.delete')
);

-- =====================================================
-- JOB WORK ITEMS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE job_work_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view job work items
CREATE POLICY "Authorized users can view job work items"
ON job_work_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.read')
);

-- Authorized users can create job work items
CREATE POLICY "Authorized users can create job work items"
ON job_work_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.create')
);

-- Authorized users can update job work items
CREATE POLICY "Authorized users can update job work items"
ON job_work_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.update')
);

-- Authorized users can delete job work items
CREATE POLICY "Authorized users can delete job work items"
ON job_work_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('orders.job_works.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON job_works TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_work_items TO authenticated;
