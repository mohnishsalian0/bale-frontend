-- =====================================================
-- INVITE TOKENS TABLE
-- =====================================================

CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Token identification
    token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Association
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Invitation details
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff')),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
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
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Token lookup
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
