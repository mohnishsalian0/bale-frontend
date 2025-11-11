-- Bale Backend - Job Works Management
-- Job work coordination with goods outward and inward integration

-- =====================================================
-- JOB WORKS TABLE
-- =====================================================

CREATE TABLE job_works (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Job identification
    job_number VARCHAR(50) NOT NULL,
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
    status_changed_by UUID REFERENCES users(id),
    status_notes TEXT, -- Completion notes or cancellation reason
    
    notes TEXT,
    attachments TEXT[], -- Array of file URLs
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_current_user_id() REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, job_number)
);

-- =====================================================
-- JOB WORK RAW MATERIALS (what we send to vendor)
-- =====================================================

CREATE TABLE job_work_raw_materials (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
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
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
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
CREATE INDEX idx_job_works_job_number ON job_works(company_id, job_number);
CREATE INDEX idx_job_works_job_type ON job_works(company_id, job_type);
CREATE INDEX idx_job_works_start_date ON job_works(company_id, start_date);

-- Raw Materials indexes
CREATE INDEX idx_job_work_raw_materials_company_id ON job_work_raw_materials(company_id);
CREATE INDEX idx_job_work_raw_materials_job_work_id ON job_work_raw_materials(job_work_id);
CREATE INDEX idx_job_work_raw_materials_product_id ON job_work_raw_materials(product_id);

-- Finished Goods indexes
CREATE INDEX idx_job_work_finished_goods_company_id ON job_work_finished_goods(company_id);
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

-- Auto-generate job numbers
CREATE OR REPLACE FUNCTION auto_generate_job_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
        NEW.job_number := generate_sequence_number('JW', 'job_works', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_job_number
    BEFORE INSERT ON job_works
    FOR EACH ROW EXECUTE FUNCTION auto_generate_job_number();

-- =====================================================
-- SECURITY CONSTRAINTS
-- =====================================================

-- Ensure job works belong to a company
ALTER TABLE job_works ADD CONSTRAINT check_job_work_company_not_null 
    CHECK (company_id IS NOT NULL);
