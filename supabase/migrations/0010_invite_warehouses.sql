
-- =====================================================
-- INVITE_WAREHOUSES JUNCTION TABLE (MULTI-WAREHOUSE INVITES)
-- =====================================================

CREATE TABLE invite_warehouses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
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

CREATE INDEX idx_invite_warehouses_invite_id ON invite_warehouses(invite_id);
CREATE INDEX idx_invite_warehouses_warehouse_id ON invite_warehouses(warehouse_id);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON invite_warehouses TO authenticated;
GRANT SELECT ON invite_warehouses TO anon;
