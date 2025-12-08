-- =====================================================
-- INVITE TOKENS TABLE
-- =====================================================

CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

    -- Token identification
    token VARCHAR(255) UNIQUE NOT NULL,

    -- Association
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    company_name VARCHAR(255) NOT NULL,

    -- Invitation details
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    all_warehouses_access BOOLEAN DEFAULT FALSE NOT NULL,

    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_by_user_id UUID,

    -- Expiry and limits
    expires_at TIMESTAMPTZ NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_invites_token ON invites(token);

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

-- Grant permissions for invites
GRANT SELECT, INSERT, UPDATE, DELETE ON invites TO authenticated;
GRANT SELECT ON invites TO anon;
