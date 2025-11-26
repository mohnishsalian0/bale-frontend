-- Bale Backend - Partners Management
-- Comprehensive partner management for customers, suppliers, vendors, and agents

-- =====================================================
-- PARTNERS TABLE
-- =====================================================

CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    
    -- Identity
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    company_name VARCHAR(200),
    phone_number VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    
    -- Partner type
    partner_type VARCHAR(20) NOT NULL
        CHECK (partner_type IN ('customer', 'supplier', 'vendor', 'agent')),

    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual' NOT NULL,
    is_guest BOOLEAN DEFAULT false,
    registered_at TIMESTAMPTZ,

    -- Tax information
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pin_code VARCHAR(10),

    -- Image
    image_url TEXT,

    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

		UNIQUE (company_id, phone_number)
);


-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_partners_company_id ON partners(company_id);

-- Partner type filtering (common query pattern)
CREATE INDEX idx_partners_type ON partners(company_id, partner_type);

-- Phone number lookup within company
CREATE INDEX idx_partners_phone ON partners(company_id, phone_number);

-- Name-based search
CREATE INDEX idx_partners_name ON partners(company_id, first_name, last_name);

-- Company name search
CREATE INDEX idx_partners_company_name ON partners(company_id, company_name);

-- Email lookup
CREATE INDEX idx_partners_email ON partners(company_id, email);

-- GST number lookup
CREATE INDEX idx_partners_gst ON partners(company_id, gst_number) WHERE gst_number IS NOT NULL;

-- Location-based queries
CREATE INDEX idx_partners_city ON partners(company_id, city);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_partners_modified_by
    BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- =====================================================
-- PARTNERS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Authorized users can view partners in their company
CREATE POLICY "Authorized users can view partners"
ON partners
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('partners.read')
);

-- Authorized users can create partners
CREATE POLICY "Authorized users can create partners"
ON partners
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('partners.create')
);

-- Authorized users can update partners
CREATE POLICY "Authorized users can update partners"
ON partners
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('partners.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('partners.update')
);

-- Authorized users can delete partners
CREATE POLICY "Authorized users can delete partners"
ON partners
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('partners.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON partners TO authenticated;
