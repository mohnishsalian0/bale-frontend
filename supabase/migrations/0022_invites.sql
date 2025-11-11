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
-- RLS POLICIES FOR INVITE_WAREHOUSES
-- =====================================================

ALTER TABLE invite_warehouses ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view invite warehouses in their company
CREATE POLICY "Users can view invite warehouses in their company"
ON invite_warehouses
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id()
);

-- Only admins can manage invite warehouses
CREATE POLICY "Company admins can manage invite warehouses"
ON invite_warehouses
FOR ALL
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
)
WITH CHECK (
    company_id = get_user_company_id() AND is_company_admin()
);

-- Anonymous users can view invite warehouses via valid invite
CREATE POLICY "Anonymous users can view invite warehouses by valid invite"
ON invite_warehouses
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM invites i
        WHERE i.id = invite_id
        AND i.used_at IS NULL
        AND i.expires_at > NOW()
    )
);

-- =====================================================
-- RLS POLICIES FOR INVITES
-- =====================================================

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view invites in their company
CREATE POLICY "Users can view invites in their company"
ON invites
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id()
);

-- Only admins can manage invites
CREATE POLICY "Company admins can manage invites"
ON invites
FOR ALL
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
)
WITH CHECK (
    company_id = get_user_company_id() AND is_company_admin()
);

-- Anonymous users can view invites by valid token
CREATE POLICY "Anonymous users can view invites by token"
ON invites
FOR SELECT
TO anon
USING (
    used_at IS NULL AND expires_at > NOW()
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions for invite_warehouses
GRANT SELECT, INSERT, UPDATE, DELETE ON invite_warehouses TO authenticated;
GRANT SELECT ON invite_warehouses TO anon;

-- Grant permissions for invites
GRANT SELECT, INSERT, UPDATE, DELETE ON invites TO authenticated;
GRANT SELECT ON invites TO anon;
