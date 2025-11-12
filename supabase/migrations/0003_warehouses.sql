-- Bale Backend - Warehouses Management
-- Location-based inventory management with staff assignment

-- =====================================================
-- WAREHOUSES TABLE
-- =====================================================

CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),

    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL, -- URL-friendly identifier
    contact_name VARCHAR(100),
    contact_number VARCHAR(20),
    image_url TEXT,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pin_code VARCHAR(10),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_current_user_id() REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,

    UNIQUE(company_id, name),
    UNIQUE(company_id, slug)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_warehouses_company_id ON warehouses(company_id);

-- Staff assignment lookup
CREATE INDEX idx_users_warehouse_id ON users(warehouse_id);

-- Warehouse name lookup within company
CREATE INDEX idx_warehouses_name ON warehouses(company_id, name);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_warehouses_modified_by
    BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();


-- =====================================================
-- WAREHOUSE SLUG GENERATION
-- =====================================================

-- Function to generate unique warehouse slug
CREATE OR REPLACE FUNCTION generate_warehouse_slug(warehouse_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    random_suffix TEXT;
BEGIN
    -- Convert to lowercase and replace spaces with hyphens
    base_slug := lower(trim(warehouse_name));
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

-- Trigger to auto-generate slug on INSERT
CREATE OR REPLACE FUNCTION set_warehouse_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_warehouse_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_warehouse_slug
    BEFORE INSERT ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION set_warehouse_slug();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- Users can view warehouses in their company (their assigned warehouses in JWT)
CREATE POLICY "Users can view warehouses in their company"
ON warehouses
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    id = ANY(get_jwt_warehouse_ids()) AND
    authorize('warehouses.read')
);

-- Authorized users can create, update, delete warehouses
CREATE POLICY "Authorized users can manage warehouses"
ON warehouses
FOR ALL
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('warehouses.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('warehouses.create')
);

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON warehouses TO authenticated;
