-- Bale Backend - Catalog Configuration
-- Public sales catalog configuration with branding

-- =====================================================
-- CATALOG CONFIGURATION TABLE
-- =====================================================

CREATE TABLE catalog_configurations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Branding
    catalog_name VARCHAR(100),
    logo_url TEXT,
    primary_color VARCHAR(7), -- Hex color
    secondary_color VARCHAR(7),
    font_family VARCHAR(50),
    favicon_url TEXT,

    -- Product display configuration
    show_fields JSONB, -- Which product fields to show
    filter_options JSONB, -- Available filter options
    sort_options JSONB, -- Available sort options

    -- Legal pages
    terms_conditions TEXT,
    return_policy TEXT,
    privacy_policy TEXT,

    -- Contact information
    contact_phone VARCHAR(15),
    contact_email VARCHAR(100),
    contact_address TEXT,

    -- Public settings
    accepting_orders BOOLEAN DEFAULT FALSE,
    domain_slug VARCHAR(50) UNIQUE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_current_user_id(),
    modified_by UUID,

    UNIQUE(company_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_catalog_configurations_company_id ON catalog_configurations(company_id);
CREATE INDEX idx_catalog_configurations_domain_slug ON catalog_configurations(domain_slug);
CREATE INDEX idx_catalog_configurations_accepting_orders ON catalog_configurations(accepting_orders);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_catalog_configurations_updated_at
    BEFORE UPDATE ON catalog_configurations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_catalog_configurations_modified_by
    BEFORE UPDATE ON catalog_configurations
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate domain slug from company name with random number
CREATE OR REPLACE FUNCTION generate_domain_slug()
RETURNS TRIGGER AS $$
DECLARE
    base_slug TEXT;
    random_num INTEGER;
    final_slug TEXT;
BEGIN
    -- Generate base slug from company name
    base_slug := LOWER(TRIM(NEW.name));
    base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9\s-]', '', 'g'); -- Remove special chars
    base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g'); -- Replace spaces with hyphens
    base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g'); -- Remove multiple hyphens
    base_slug := TRIM(base_slug, '-'); -- Remove leading/trailing hyphens

    -- Generate random 4-digit number (1000-9999)
    random_num := 1000 + (RANDOM() * 9000)::INTEGER;

    -- Combine base slug with random number
    final_slug := base_slug || '-' || random_num;

    -- Update catalog configuration with generated slug
    UPDATE catalog_configurations
    SET domain_slug = final_slug
    WHERE company_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_domain_slug
    AFTER INSERT OR UPDATE OF name ON companies
    FOR EACH ROW EXECUTE FUNCTION generate_domain_slug();

-- =====================================================
-- CATALOG CONFIGURATION RLS POLICIES
-- =====================================================

ALTER TABLE catalog_configurations ENABLE ROW LEVEL SECURITY;

-- Authorized users can view catalog configuration
CREATE POLICY "Authorized users can view catalog configuration"
ON catalog_configurations
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('catalog.read')
);

-- Authorized users can create catalog configuration
CREATE POLICY "Authorized users can create catalog configuration"
ON catalog_configurations
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('catalog.create')
);

-- Authorized users can update catalog configuration
CREATE POLICY "Authorized users can update catalog configuration"
ON catalog_configurations
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('catalog.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('catalog.update')
);

-- Authorized users can delete catalog configuration
CREATE POLICY "Authorized users can delete catalog configuration"
ON catalog_configurations
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('catalog.delete')
);

-- Allow anonymous users to view public catalog configurations
CREATE POLICY "Anonymous users can view public catalog configurations"
ON catalog_configurations
FOR SELECT
TO anon
USING (
    accepting_orders = true
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON catalog_configurations TO authenticated;
GRANT SELECT ON catalog_configurations TO anon;
