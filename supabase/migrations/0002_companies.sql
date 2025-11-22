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

    -- URL-friendly identifier
    slug VARCHAR(100) NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(slug)
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
-- COMPANY SLUG GENERATION
-- =====================================================

-- Function to generate unique company slug
CREATE OR REPLACE FUNCTION generate_company_slug(company_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    random_suffix TEXT;
BEGIN
    -- Convert to lowercase and replace spaces with hyphens
    base_slug := lower(trim(company_name));
    base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g'); -- Remove leading/trailing hyphens

    -- Generate random 3-digit number
    random_suffix := lpad(floor(random() * 1000)::text, 3, '0');

    -- Combine base slug with random suffix
    final_slug := base_slug || '-' || random_suffix;

    -- Ensure it's not longer than 100 characters
    IF length(final_slug) > 100 THEN
        final_slug := substring(final_slug, 1, 100);
    END IF;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate slug on INSERT
CREATE OR REPLACE FUNCTION set_company_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_company_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug before INSERT
CREATE TRIGGER trigger_set_company_slug
    BEFORE INSERT ON companies
    FOR EACH ROW
    EXECUTE FUNCTION set_company_slug();

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

-- Anonymous users can view companies by slug (for public catalog)
CREATE POLICY "Anonymous users can view companies by slug"
ON companies
FOR SELECT
TO anon
USING (true);

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;

-- Grant SELECT to anonymous users for public catalog
GRANT SELECT ON companies TO anon;
