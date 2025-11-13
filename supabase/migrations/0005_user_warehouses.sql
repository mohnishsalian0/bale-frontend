
-- Bale Backend - Companies and Users Management
-- Multi-tenant foundation with role-based access control

-- =====================================================
-- USER_WAREHOUSES JUNCTION TABLE (MULTI-WAREHOUSE ACCESS)
-- =====================================================

CREATE TABLE user_warehouses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_current_user_id(),

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

-- =====================================================
-- USER_WAREHOUSES TABLE RLS POLICIES
-- =====================================================

ALTER TABLE user_warehouses ENABLE ROW LEVEL SECURITY;

-- Users can view their own warehouse assignments, authorized users can view all in their company
CREATE POLICY "Users can view warehouse assignments in their company"
ON user_warehouses
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND (
        authorize('users.read') OR
        user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
    )
);

-- Authorized users can manage warehouse assignments
CREATE POLICY "Authorized users can manage warehouse assignments"
ON user_warehouses
FOR ALL
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('users.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('users.create')
);

-- =====================================================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON user_warehouses TO authenticated;
