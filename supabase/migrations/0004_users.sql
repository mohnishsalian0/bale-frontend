
-- Bale Backend - Companies and Users Management
-- Multi-tenant foundation with role-based access control

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
    role VARCHAR(20) NOT NULL,
    warehouse_id UUID REFERENCES warehouses(id),
    all_warehouses_access BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Authentication (handled by Supabase Auth)
    auth_user_id UUID UNIQUE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant indexes (company_id is always in WHERE clause)
CREATE INDEX idx_users_company_id ON users(company_id);

-- Staff assignment lookup
CREATE INDEX idx_users_warehouse_id ON users(warehouse_id);

-- Authentication lookup
CREATE INDEX idx_users_auth_user_id ON users(auth_user_id);

-- Phone number lookup within company
CREATE INDEX idx_users_phone ON users(company_id, phone_number);

-- Role-based queries
CREATE INDEX idx_users_role ON users(company_id, role);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_users_modified_by
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- =====================================================
-- USERS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can view their own record and authorized users can view all users in their company
CREATE POLICY "Users can view users in their company"
ON users
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND (
        auth_user_id = auth.uid() OR authorize('users.read')
    )
);

-- Authorized users can create new users
CREATE POLICY "Authorized users can create users"
ON users
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('users.create')
);

-- Users can update their own profile, authorized users can update all users in their company
CREATE POLICY "Users can update profiles in their company"
ON users
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND (
        auth_user_id = auth.uid() OR authorize('users.update')
    )
)
WITH CHECK (
    company_id = get_jwt_company_id() AND (
        auth_user_id = auth.uid() OR authorize('users.update')
    )
);

-- Authorized users can delete users
CREATE POLICY "Authorized users can delete users"
ON users
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('users.delete')
);

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;
