-- Bale Backend - RBAC Schema
-- Role-Based Access Control with JWT custom claims support
-- Simplified: Keep users.role column, no user_roles junction table

-- =====================================================
-- ROLES TABLE (System-wide roles, no company scoping)
-- =====================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'admin', 'staff'
    display_name VARCHAR(100), -- e.g., 'Administrator', 'Staff Member'
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PERMISSIONS TABLE (Global registry)
-- =====================================================

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    resource VARCHAR(50) NOT NULL, -- e.g., 'products', 'stock_units', 'warehouses'
    action VARCHAR(50) NOT NULL, -- e.g., 'read', 'create', 'update', 'delete'
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(resource, action)
);

-- =====================================================
-- ROLE_PERMISSIONS MAPPING TABLE
-- =====================================================

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(role_id, permission_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Permission lookups
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);

-- Role-Permission mappings
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_permissions_updated_at
    BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- ENABLE RLS ON RBAC TABLES
-- =====================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR RBAC TABLES
-- =====================================================

-- Permissions are global and readable by all authenticated users
CREATE POLICY "All users can view permissions"
ON permissions
FOR SELECT
TO authenticated
USING (true);

-- Roles are global and readable by all authenticated users
CREATE POLICY "All users can view roles"
ON roles
FOR SELECT
TO authenticated
USING (true);

-- Role permissions are readable by all authenticated users
CREATE POLICY "All users can view role permissions"
ON role_permissions
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- SUPABASE AUTH ADMIN ACCESS (for JWT hook)
-- =====================================================

-- Grant necessary permissions to supabase_auth_admin
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

GRANT SELECT ON TABLE public.roles TO supabase_auth_admin;
GRANT SELECT ON TABLE public.permissions TO supabase_auth_admin;
GRANT SELECT ON TABLE public.role_permissions TO supabase_auth_admin;
GRANT SELECT ON TABLE public.users TO supabase_auth_admin;
GRANT SELECT ON TABLE public.user_warehouses TO supabase_auth_admin;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINT TO USERS.ROLE
-- =====================================================

ALTER TABLE users ADD CONSTRAINT fk_users_role
    FOREIGN KEY (role) REFERENCES roles(name) ON UPDATE CASCADE ON DELETE RESTRICT;
