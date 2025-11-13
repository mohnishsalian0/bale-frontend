-- Bale Backend - Companies and Users Management
-- Multi-tenant foundation with role-based access control

-- =====================================================
-- COMPANIES TABLE (TENANT ISOLATION)
-- =====================================================

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pin_code VARCHAR(10),
    business_type VARCHAR(50),
    gst_number VARCHAR(15),
    pan_number VARCHAR(10),
    logo_url TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ
);


-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_companies_modified_by
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Authorized users can read their own company
CREATE POLICY "Authorized users can view their company"
ON companies
FOR SELECT
TO authenticated
USING (
    id = get_jwt_company_id() AND authorize('companies.read')
);

-- Authorized users can update their own company
CREATE POLICY "Authorized users can update their company"
ON companies
FOR UPDATE
TO authenticated
USING (
    id = get_jwt_company_id() AND authorize('companies.update')
)
WITH CHECK (
    id = get_jwt_company_id() AND authorize('companies.update')
);

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
