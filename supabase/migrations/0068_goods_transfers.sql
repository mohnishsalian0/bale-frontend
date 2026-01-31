-- Bale Backend - Goods Transfers
-- Warehouse-to-warehouse stock unit transfers

-- =====================================================
-- GOODS TRANSFERS TABLE
-- =====================================================

CREATE TABLE goods_transfers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Transfer identification
    sequence_number INTEGER NOT NULL,

    -- Warehouses
    from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Transfer details
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    transport_reference_number VARCHAR(50),
    transport_type VARCHAR(20) CHECK (transport_type IN ('road', 'rail', 'air', 'sea', 'courier')),
    notes TEXT,
    attachments TEXT[], -- Array of file URLs

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'in_transit'
        CHECK (status IN ('in_transit', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Full-text search
    search_vector tsvector,

    -- Business logic constraints
    CONSTRAINT check_different_warehouses
        CHECK (from_warehouse_id != to_warehouse_id),

    UNIQUE(company_id, sequence_number)
);

-- =====================================================
-- GOODS TRANSFER ITEMS TABLE
-- =====================================================

CREATE TABLE goods_transfer_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    transfer_id UUID NOT NULL REFERENCES goods_transfers(id) ON DELETE CASCADE,
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id),

    -- Quantity transferred
    quantity_transferred DECIMAL(10, 3) NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Goods Transfers indexes
CREATE INDEX idx_goods_transfers_company_id ON goods_transfers(company_id);
CREATE INDEX idx_goods_transfers_from_warehouse ON goods_transfers(from_warehouse_id);
CREATE INDEX idx_goods_transfers_to_warehouse ON goods_transfers(to_warehouse_id);
CREATE INDEX idx_goods_transfers_date ON goods_transfers(company_id, transfer_date);
CREATE INDEX idx_goods_transfers_sequence_number ON goods_transfers(company_id, sequence_number);
CREATE INDEX idx_goods_transfers_status ON goods_transfers(company_id, status);

-- Full-text search index
CREATE INDEX idx_goods_transfers_search ON goods_transfers USING GIN(search_vector);

-- Goods Transfer Items indexes
CREATE INDEX idx_goods_transfer_items_company_id ON goods_transfer_items(company_id);
CREATE INDEX idx_goods_transfer_items_transfer_id ON goods_transfer_items(transfer_id);
CREATE INDEX idx_goods_transfer_items_stock_unit ON goods_transfer_items(stock_unit_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_goods_transfers_updated_at
    BEFORE UPDATE ON goods_transfers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_goods_transfers_modified_by
    BEFORE UPDATE ON goods_transfers
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

CREATE TRIGGER update_goods_transfer_items_updated_at
    BEFORE UPDATE ON goods_transfer_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_transfer_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('goods_transfers', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_transfer_sequence
    BEFORE INSERT ON goods_transfers
    FOR EACH ROW EXECUTE FUNCTION auto_generate_transfer_sequence();

-- Update search vector for full-text search
CREATE OR REPLACE FUNCTION update_goods_transfer_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_from_warehouse_name TEXT;
    v_to_warehouse_name TEXT;
    v_product_names TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get from warehouse name
    SELECT name
    INTO v_from_warehouse_name
    FROM warehouses
    WHERE id = NEW.from_warehouse_id;

    -- Get to warehouse name
    SELECT name
    INTO v_to_warehouse_name
    FROM warehouses
    WHERE id = NEW.to_warehouse_id;

    -- Get aggregated product names from transfer items
    SELECT string_agg(DISTINCT p.name, ' ')
    INTO v_product_names
    FROM goods_transfer_items gti
    JOIN stock_units su ON su.id = gti.stock_unit_id
    JOIN products p ON p.id = su.product_id
    WHERE gti.transfer_id = NEW.id;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_from_warehouse_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_to_warehouse_name, '')), 'A') ||

        -- Weight B: Product names
        setweight(to_tsvector('english', COALESCE(v_product_names, '')), 'B') ||

        -- Weight C: Status
        setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'C') ||

        -- Weight D: Transport details
        setweight(to_tsvector('simple', COALESCE(NEW.transport_reference_number, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.transport_type, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.cancellation_reason, '')), 'D');

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_goods_transfer_search_vector
    BEFORE INSERT OR UPDATE ON goods_transfers
    FOR EACH ROW EXECUTE FUNCTION update_goods_transfer_search_vector();

-- Auto-set completed_at and completed_by
CREATE TRIGGER set_goods_transfers_completed_at
    BEFORE UPDATE ON goods_transfers
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION set_completed_at();

CREATE TRIGGER set_goods_transfers_completed_by
    BEFORE UPDATE ON goods_transfers
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION set_completed_by();

-- Auto-set cancelled_at and cancelled_by
CREATE TRIGGER set_goods_transfers_cancelled_at
    BEFORE UPDATE ON goods_transfers
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION set_cancelled_at();

CREATE TRIGGER set_goods_transfers_cancelled_by
    BEFORE UPDATE ON goods_transfers
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION set_cancelled_by();

-- =====================================================
-- GOODS TRANSFERS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE goods_transfers ENABLE ROW LEVEL SECURITY;

-- Users can view transfers involving their assigned warehouses
CREATE POLICY "Users can view goods transfers"
ON goods_transfers
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    (has_warehouse_access(from_warehouse_id) OR has_warehouse_access(to_warehouse_id)) AND
    authorize('movement.transfers.read')
);

-- Users can create transfers from their assigned warehouses
CREATE POLICY "Users can create goods transfers"
ON goods_transfers
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(from_warehouse_id) AND
    authorize('movement.transfers.create')
);

-- Users can update transfers involving their warehouses
CREATE POLICY "Users can update goods transfers"
ON goods_transfers
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    (has_warehouse_access(from_warehouse_id) OR has_warehouse_access(to_warehouse_id)) AND
    authorize('movement.transfers.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    (has_warehouse_access(from_warehouse_id) OR has_warehouse_access(to_warehouse_id)) AND
    authorize('movement.transfers.update')
);

-- Users can delete transfers from their warehouses
CREATE POLICY "Users can delete goods transfers"
ON goods_transfers
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(from_warehouse_id) AND
    authorize('movement.transfers.delete')
);

-- =====================================================
-- GOODS TRANSFER ITEMS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE goods_transfer_items ENABLE ROW LEVEL SECURITY;

-- Users can view transfer items if they can view the transfer
CREATE POLICY "Users can view goods transfer items"
ON goods_transfer_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    EXISTS (
        SELECT 1 FROM goods_transfers
        WHERE goods_transfers.id = goods_transfer_items.transfer_id
        AND goods_transfers.company_id = get_jwt_company_id()
        AND (
            has_warehouse_access(goods_transfers.from_warehouse_id) OR
            has_warehouse_access(goods_transfers.to_warehouse_id)
        )
    ) AND
    authorize('movement.transfers.read')
);

-- Users can create transfer items for their transfers
CREATE POLICY "Users can create goods transfer items"
ON goods_transfer_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    EXISTS (
        SELECT 1 FROM goods_transfers
        WHERE goods_transfers.id = goods_transfer_items.transfer_id
        AND goods_transfers.company_id = get_jwt_company_id()
        AND has_warehouse_access(goods_transfers.from_warehouse_id)
    ) AND
    authorize('movement.transfers.create')
);

-- Users can update transfer items
CREATE POLICY "Users can update goods transfer items"
ON goods_transfer_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    EXISTS (
        SELECT 1 FROM goods_transfers
        WHERE goods_transfers.id = goods_transfer_items.transfer_id
        AND goods_transfers.company_id = get_jwt_company_id()
        AND (
            has_warehouse_access(goods_transfers.from_warehouse_id) OR
            has_warehouse_access(goods_transfers.to_warehouse_id)
        )
    ) AND
    authorize('movement.transfers.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('movement.transfers.update')
);

-- Users can delete transfer items
CREATE POLICY "Users can delete goods transfer items"
ON goods_transfer_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    EXISTS (
        SELECT 1 FROM goods_transfers
        WHERE goods_transfers.id = goods_transfer_items.transfer_id
        AND goods_transfers.company_id = get_jwt_company_id()
        AND has_warehouse_access(goods_transfers.from_warehouse_id)
    ) AND
    authorize('movement.transfers.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON goods_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_transfer_items TO authenticated;
