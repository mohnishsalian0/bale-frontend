-- Bale Backend - Goods Movement (Outward and Inward)
-- Comprehensive outward and inward inventory management

-- =====================================================
-- GOODS OUTWARD TABLE
-- =====================================================

CREATE TABLE goods_outwards (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Outward identification
    outward_number VARCHAR(50) NOT NULL,

    -- Outward type
    outward_type VARCHAR(20) NOT NULL CHECK (outward_type IN ('sales', 'job_work', 'other')),

    -- Linking (optional, for reference)
    sales_order_id UUID REFERENCES sales_orders(id), -- When outward_type = 'sales'
    job_work_id UUID REFERENCES job_works(id), -- When outward_type = 'job_work'
    other_reason TEXT, -- When outward_type = 'other'

    -- Recipients
    partner_id UUID REFERENCES partners(id),
    to_warehouse_id UUID REFERENCES warehouses(id), -- For warehouse_transfer
    agent_id UUID REFERENCES partners(id), -- Optional agent for sales

    -- Details
    outward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    invoice_number VARCHAR(50),
    invoice_amount DECIMAL(10,2),
    transport_details TEXT,

    -- Cancellation/Reversal tracking
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,

    notes TEXT,
    attachments TEXT[], -- Array of file URLs

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,

    -- Business logic constraints
    CONSTRAINT check_outward_source
        CHECK (
            (partner_id IS NOT NULL AND to_warehouse_id IS NULL) OR
            (partner_id IS NULL AND to_warehouse_id IS NOT NULL AND to_warehouse_id != warehouse_id)
        ),
    CONSTRAINT check_outward_type_requirement
        CHECK (
						(outward_type = 'sales' AND sales_order_id IS NOT NULL) OR
						(outward_type = 'job_work' AND job_work_id IS NOT NULL) OR
						(outward_type = 'other' AND other_reason IS NOT NULL)
        ),

    UNIQUE(company_id, outward_number)
);

-- =====================================================
-- GOODS OUTWARD ITEMS (linking to specific stock units)
-- =====================================================

CREATE TABLE goods_outward_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    outward_id UUID NOT NULL REFERENCES goods_outwards(id) ON DELETE CASCADE,
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id),
    quantity_dispatched DECIMAL(10,3) NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- GOODS INWARD TABLE
-- =====================================================

CREATE TABLE goods_inwards (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Inward identification
    inward_number VARCHAR(50) NOT NULL,

    -- Inward type
    inward_type VARCHAR(20) NOT NULL CHECK (inward_type IN ('job_work', 'sales_return', 'other')),

    -- Linking (optional, for reference)
    sales_order_id UUID REFERENCES sales_orders(id), -- When inward_type = 'sales_return'
    job_work_id UUID REFERENCES job_works(id), -- When inward_type = 'job_work'
    other_reason TEXT, -- Required when inward_type = 'other'

    -- Senders
    partner_id UUID REFERENCES partners(id),
    from_warehouse_id UUID REFERENCES warehouses(id), -- For warehouse transfers
    agent_id UUID REFERENCES partners(id), -- Optional agent

    -- Details
    inward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_number VARCHAR(50),
    invoice_amount DECIMAL(10,2),
    transport_details TEXT,

    notes TEXT,
    attachments TEXT[], -- Array of file URLs

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,

    -- Business logic constraints
    CONSTRAINT check_inward_source
        CHECK (
            (partner_id IS NOT NULL AND from_warehouse_id IS NULL) OR
            (partner_id IS NULL AND from_warehouse_id IS NOT NULL AND from_warehouse_id != warehouse_id)
        ),
    CONSTRAINT check_inward_type_requirements
        CHECK (
						(inward_type = 'job_work' AND job_work_id IS NOT NULL) OR
						(inward_type = 'sales_return' AND sales_order_id IS NOT NULL) OR
						(inward_type = 'other' AND other_reason IS NOT NULL)
        ),

    UNIQUE(company_id, inward_number)
);


-- Now add the missing foreign key constraint to stock_units
ALTER TABLE stock_units ADD CONSTRAINT fk_stock_unit_inward
    FOREIGN KEY (created_from_inward_id) REFERENCES goods_inwards(id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Goods Outward indexes
CREATE INDEX idx_goods_outwards_company_id ON goods_outwards(company_id);
CREATE INDEX idx_goods_outwards_warehouse_id ON goods_outwards(warehouse_id);
CREATE INDEX idx_goods_outwards_date ON goods_outwards(company_id, outward_date);
CREATE INDEX idx_goods_outwards_outward_number ON goods_outwards(company_id, outward_number);
CREATE INDEX idx_goods_outwards_partner ON goods_outwards(partner_id);
CREATE INDEX idx_goods_outwards_sales_order ON goods_outwards(sales_order_id);
CREATE INDEX idx_goods_outwards_job_work ON goods_outwards(job_work_id);

-- Goods Outward Items indexes
CREATE INDEX idx_goods_outward_items_company_id ON goods_outward_items(company_id);
CREATE INDEX idx_goods_outward_items_outward_id ON goods_outward_items(outward_id);
CREATE INDEX idx_goods_outward_items_stock_unit ON goods_outward_items(stock_unit_id);
CREATE INDEX idx_goods_outward_items_stock_unit_quantity ON goods_outward_items(stock_unit_id, quantity_dispatched);

-- Goods Inward indexes
CREATE INDEX idx_goods_inwards_company_id ON goods_inwards(company_id);
CREATE INDEX idx_goods_inwards_warehouse_id ON goods_inwards(warehouse_id);
CREATE INDEX idx_goods_inwards_date ON goods_inwards(company_id, inward_date);
CREATE INDEX idx_goods_inwards_inward_number ON goods_inwards(company_id, inward_number);
CREATE INDEX idx_goods_inwards_partner ON goods_inwards(partner_id);
CREATE INDEX idx_goods_inwards_sales_order ON goods_inwards(sales_order_id);
CREATE INDEX idx_goods_inwards_job_work ON goods_inwards(job_work_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_goods_outwards_updated_at
    BEFORE UPDATE ON goods_outwards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goods_outward_items_updated_at
    BEFORE UPDATE ON goods_outward_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goods_inwards_updated_at
    BEFORE UPDATE ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate outward numbers
CREATE OR REPLACE FUNCTION auto_generate_outward_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.outward_number IS NULL OR NEW.outward_number = '' THEN
        NEW.outward_number := generate_sequence_number('GO', 'goods_outwards', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_outward_number
    BEFORE INSERT ON goods_outwards
    FOR EACH ROW EXECUTE FUNCTION auto_generate_outward_number();

-- Auto-generate inward numbers
CREATE OR REPLACE FUNCTION auto_generate_inward_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.inward_number IS NULL OR NEW.inward_number = '' THEN
        NEW.inward_number := generate_sequence_number('GI', 'goods_inwards', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_inward_number
    BEFORE INSERT ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION auto_generate_inward_number();

