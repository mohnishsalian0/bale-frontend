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
    created_by UUID DEFAULT get_current_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- USERS/STAFF TABLE WITH ROLE-BASED ACCESS
-- =====================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Personal information
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone_number VARCHAR(15),
    email VARCHAR(100),
    profile_image_url TEXT,
    additional_notes TEXT,
    
    -- Role and access
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    warehouse_id UUID, -- Single warehouse assignment for staff (TODO: Fkey will be added later)
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Authentication (handled by Supabase Auth)
    auth_user_id UUID UNIQUE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_current_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant indexes (company_id is always in WHERE clause)
CREATE INDEX idx_users_company_id ON users(company_id);

-- Authentication lookup
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);

-- Phone number lookup within company
CREATE INDEX idx_users_phone ON users(company_id, phone_number);

-- Role-based queries
CREATE INDEX idx_users_role ON users(company_id, role);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_companies_modified_by
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

CREATE TRIGGER set_users_modified_by
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- =====================================================
-- SECURITY CONSTRAINTS
-- =====================================================

-- Ensure users belong to a company
ALTER TABLE users ADD CONSTRAINT check_user_company_not_null
    CHECK (company_id IS NOT NULL);

-- =====================================================
-- USER_WAREHOUSES JUNCTION TABLE (MULTI-WAREHOUSE ACCESS)
-- =====================================================

CREATE TABLE user_warehouses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL, -- FK will be added after warehouses table is created

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_current_user_id() REFERENCES users(id),

    -- Ensure unique user-warehouse pairs
    UNIQUE(user_id, warehouse_id)
);

-- =====================================================
-- INDEXES FOR USER_WAREHOUSES
-- =====================================================

-- Lookup user's warehouses
CREATE INDEX idx_user_warehouses_user_id ON user_warehouses(user_id);

-- Lookup warehouse's users
CREATE INDEX idx_user_warehouses_warehouse_id ON user_warehouses(warehouse_id);

-- =====================================================
-- VALIDATION TRIGGER FOR USERS.WAREHOUSE_ID
-- =====================================================

-- Function to validate warehouse_id exists in user_warehouses before update
CREATE OR REPLACE FUNCTION validate_user_warehouse_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation if warehouse_id is NULL or unchanged
    IF NEW.warehouse_id IS NULL OR NEW.warehouse_id = OLD.warehouse_id THEN
        RETURN NEW;
    END IF;

    -- For staff role, validate warehouse_id exists in user_warehouses
    IF NEW.role = 'staff' THEN
        IF NOT EXISTS (
            SELECT 1 FROM user_warehouses
            WHERE user_id = NEW.id AND warehouse_id = NEW.warehouse_id
        ) THEN
            RAISE EXCEPTION 'Warehouse ID % is not assigned to user %', NEW.warehouse_id, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_user_warehouse
    BEFORE UPDATE OF warehouse_id ON users
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_warehouse_assignment();
