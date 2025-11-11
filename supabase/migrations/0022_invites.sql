-- =====================================================
-- INVITE TOKENS TABLE
-- =====================================================

CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

    -- Token identification
    token VARCHAR(255) UNIQUE NOT NULL,

    -- Association
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
    company_name VARCHAR(255) NOT NULL,

    -- Invitation details
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),

    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_by_user_id UUID REFERENCES users(id),

    -- Expiry and limits
    expires_at TIMESTAMPTZ NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- =====================================================
-- INVITE_WAREHOUSES JUNCTION TABLE (MULTI-WAREHOUSE INVITES)
-- =====================================================

CREATE TABLE invite_warehouses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
    invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique invite-warehouse pairs
    UNIQUE(invite_id, warehouse_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Token lookup
CREATE INDEX idx_invites_token ON invites(token);

-- Invite warehouses lookup
CREATE INDEX idx_invite_warehouses_invite_id ON invite_warehouses(invite_id);
CREATE INDEX idx_invite_warehouses_warehouse_id ON invite_warehouses(warehouse_id);

-- =====================================================
-- CLEANUP FUNCTIONS
-- =====================================================

-- Function to cleanup expired tokens (run as cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM invites
    WHERE expires_at < NOW() - INTERVAL '30 days';  -- Hard delete expired tokens after 30 days

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for invite_warehouses
GRANT SELECT, INSERT, UPDATE, DELETE ON invite_warehouses TO authenticated;
GRANT SELECT ON invite_warehouses TO anon;

-- Grant permissions for invites
GRANT SELECT, INSERT, UPDATE, DELETE ON invites TO authenticated;
GRANT SELECT ON invites TO anon;
