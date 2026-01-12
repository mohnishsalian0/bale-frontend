-- Bale Backend - Partners Management
-- Comprehensive partner management for customers, suppliers, vendors, and agents

-- =====================================================
-- PARTNERS TABLE
-- =====================================================

CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    
    -- Identity
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    company_name VARCHAR(200) NOT NULL,
    phone_number VARCHAR(15),
    email VARCHAR(100),
    
    -- Partner type
    partner_type VARCHAR(20) NOT NULL
        CHECK (partner_type IN ('customer', 'supplier', 'vendor', 'agent')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Source tracking
    source VARCHAR(50) DEFAULT 'manual' NOT NULL,
    is_guest BOOLEAN DEFAULT false,
    registered_at TIMESTAMPTZ,

    -- Tax information
    gst_number VARCHAR(15) CHECK (
        gst_number IS NULL OR
        gst_number ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    ),
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

    -- Credit limit
    credit_limit_enabled BOOLEAN DEFAULT FALSE,
    credit_limit DECIMAL(15,2) DEFAULT 0,

    -- Interaction tracking
    last_interaction_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Full-text search
    search_vector tsvector,

    -- Computed display name (defaults to company_name)
    display_name TEXT GENERATED ALWAYS AS (company_name) STORED,

		UNIQUE (company_id, company_name)
);


-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_partners_company_id ON partners(company_id);

-- Partner type filtering (common query pattern)
CREATE INDEX idx_partners_type ON partners(company_id, partner_type);

-- Active status filtering
CREATE INDEX idx_partners_active_status ON partners(company_id, is_active);

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

-- Last interaction sorting (for dashboard recent partners)
CREATE INDEX idx_partners_last_interaction ON partners(company_id, last_interaction_at DESC NULLS LAST) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_partners_search ON partners USING GIN(search_vector);

-- Display name search/filtering
CREATE INDEX idx_partners_display_name ON partners(company_id, display_name);

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
-- TRIGGER FUNCTION FOR PARTNER LAST INTERACTION
-- =====================================================

-- Function to update partner's last_interaction_at timestamp
CREATE OR REPLACE FUNCTION update_partner_last_interaction()
RETURNS TRIGGER AS $$
DECLARE
    partner_id_to_update UUID;
    interaction_time TIMESTAMPTZ;
BEGIN
    -- Determine which partner_id to update based on the table
    IF TG_TABLE_NAME = 'sales_orders' THEN
        partner_id_to_update := COALESCE(NEW.customer_id, OLD.customer_id);
    ELSIF TG_TABLE_NAME IN ('goods_inwards', 'goods_outwards') THEN
        partner_id_to_update := COALESCE(NEW.partner_id, OLD.partner_id);
    END IF;

    -- Get interaction timestamp
    interaction_time := COALESCE(NEW.created_at, NEW.updated_at, CURRENT_TIMESTAMP);

    -- Update the partner's last_interaction_at if partner exists
    IF partner_id_to_update IS NOT NULL THEN
        UPDATE partners
        SET last_interaction_at = GREATEST(
            COALESCE(last_interaction_at, '-infinity'::timestamptz),
            interaction_time
        )
        WHERE id = partner_id_to_update;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COLUMN COMMENTS
-- =====================================================

COMMENT ON COLUMN partners.company_name IS 'Primary business/partner name (NOT NULL)';
COMMENT ON COLUMN partners.first_name IS 'Contact person first name (optional)';
COMMENT ON COLUMN partners.last_name IS 'Contact person last name (optional)';
COMMENT ON COLUMN partners.display_name IS 'Computed display name (defaults to company_name)';
COMMENT ON COLUMN partners.credit_limit_enabled IS 'Whether credit limit tracking is enabled for this partner';
COMMENT ON COLUMN partners.credit_limit IS 'Maximum credit limit allowed for this partner';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON partners TO authenticated;
