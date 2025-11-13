-- Bale Backend - Job Works Management
-- Job work coordination with goods outward and inward integration

-- =====================================================
-- JOB WORKS TABLE
-- =====================================================

CREATE TABLE job_works (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Job identification
    sequence_number INTEGER NOT NULL,
    job_type TEXT NOT NULL, -- Custom job type with auto-suggestions from previously used values
    
    -- Partners
    vendor_id UUID NOT NULL REFERENCES partners(id),
    agent_id UUID REFERENCES partners(id),
    
    -- Dates
    start_date DATE NOT NULL,
    due_date DATE, -- Optional, can be set during job work processing
    
    -- Optional sales order reference
    sales_order_id UUID REFERENCES sales_orders(id),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' 
        CHECK (status IN ('in_progress', 'completed', 'cancelled')),
    
    -- Status change tracking
    status_changed_at TIMESTAMPTZ,
    status_changed_by UUID,
    status_notes TEXT, -- Completion notes or cancellation reason
    
    notes TEXT,
    attachments TEXT[], -- Array of file URLs
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, sequence_number)
);

-- =====================================================
-- JOB WORK RAW MATERIALS (what we send to vendor)
-- =====================================================

CREATE TABLE job_work_raw_materials (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    job_work_id UUID NOT NULL REFERENCES job_works(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    required_quantity DECIMAL(10,3) NOT NULL,
    dispatched_quantity DECIMAL(10,3) DEFAULT 0,
    pending_quantity DECIMAL(10,3) GENERATED ALWAYS AS (required_quantity - dispatched_quantity) STORED,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- JOB WORK FINISHED GOODS (what we receive from vendor)
-- =====================================================

CREATE TABLE job_work_finished_goods (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    job_work_id UUID NOT NULL REFERENCES job_works(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    expected_quantity DECIMAL(10,3) NOT NULL,
    received_quantity DECIMAL(10,3) DEFAULT 0,
    pending_quantity DECIMAL(10,3) GENERATED ALWAYS AS (expected_quantity - received_quantity) STORED,

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
CREATE INDEX idx_job_works_vendor ON job_works(vendor_id);
CREATE INDEX idx_job_works_status ON job_works(company_id, status);
CREATE INDEX idx_job_works_sequence_number ON job_works(company_id, sequence_number);
CREATE INDEX idx_job_works_job_type ON job_works(company_id, job_type);
CREATE INDEX idx_job_works_start_date ON job_works(company_id, start_date);

-- Raw Materials indexes
CREATE INDEX idx_job_work_raw_materials_company_id ON job_work_raw_materials(company_id);
CREATE INDEX idx_job_work_raw_materials_warehouse_id ON job_work_raw_materials(warehouse_id);
CREATE INDEX idx_job_work_raw_materials_job_work_id ON job_work_raw_materials(job_work_id);
CREATE INDEX idx_job_work_raw_materials_product_id ON job_work_raw_materials(product_id);

-- Finished Goods indexes
CREATE INDEX idx_job_work_finished_goods_company_id ON job_work_finished_goods(company_id);
CREATE INDEX idx_job_work_finished_goods_warehouse_id ON job_work_finished_goods(warehouse_id);
CREATE INDEX idx_job_work_finished_goods_job_work_id ON job_work_finished_goods(job_work_id);
CREATE INDEX idx_job_work_finished_goods_product_id ON job_work_finished_goods(product_id);

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

CREATE TRIGGER update_job_work_raw_materials_updated_at
    BEFORE UPDATE ON job_work_raw_materials
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_job_work_finished_goods_updated_at 
    BEFORE UPDATE ON job_work_finished_goods 
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_job_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('job_works', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_job_sequence
    BEFORE INSERT ON job_works
    FOR EACH ROW EXECUTE FUNCTION auto_generate_job_sequence();

-- =====================================================
-- JOB WORKS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE job_works ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_work_raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_work_finished_goods ENABLE ROW LEVEL SECURITY;

-- Admins can view all job works, staff can view job works in their assigned warehouse
CREATE POLICY "Users can view job works in their scope"
ON job_works
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_works.read')
);

-- Admins can create job works for any warehouse, staff only for their assigned warehouse
CREATE POLICY "Users can create job works in their scope"
ON job_works
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('job_works.create')
);

-- Admins can update all job works, staff only in their assigned warehouse
CREATE POLICY "Users can update job works in their scope"
ON job_works
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('job_works.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('job_works.update')
);

-- Admins can delete job works, staff only in their assigned warehouse
CREATE POLICY "Users can delete job works in their scope"
ON job_works
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('job_works.delete')
);

-- =====================================================
-- JOB WORK RAW MATERIALS RLS POLICIES
-- =====================================================

-- Authorized users can view job work raw materials
CREATE POLICY "Authorized users can view job work raw materials"
ON job_work_raw_materials
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.read')
);

-- Authorized users can create job work raw materials
CREATE POLICY "Authorized users can create job works raw materials"
ON job_work_raw_materials
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.create')
);

-- Authorized users can update job work raw materials
CREATE POLICY "Authorized users can update job works raw materials"
ON job_work_raw_materials
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.update')
);

-- Authorized users can delete job work raw materials
CREATE POLICY "Authorized users can delete job works raw materials"
ON job_work_raw_materials
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_raw_materials.delete')
);

-- =====================================================
-- JOB WORK FINISHED GOODS RLS POLICIES
-- =====================================================

-- Authorized users can view job work finished goods
CREATE POLICY "Authorized users can view job work finished goods"
ON job_work_finished_goods
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.read')
);

-- Authorized users can create job work finished goods
CREATE POLICY "Authorized users can create job works finished goods"
ON job_work_finished_goods
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.create')
);

-- Authorized users can update job work finished goods
CREATE POLICY "Authorized users can update job works finished goods"
ON job_work_finished_goods
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.update')
);

-- Authorized users can delete job work finished goods
CREATE POLICY "Authorized users can delete job works finished goods"
ON job_work_finished_goods
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('job_work_finished_goods.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON job_works TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_work_raw_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_work_finished_goods TO authenticated;
