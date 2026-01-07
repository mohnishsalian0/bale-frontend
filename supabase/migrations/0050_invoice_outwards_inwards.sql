-- Bale Backend - Accounting: Invoice Links
-- Junction tables linking invoices to goods outward and goods inward

-- =====================================================
-- INVOICE OUTWARDS JUNCTION TABLE
-- =====================================================

CREATE TABLE invoice_outwards (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    goods_outward_id UUID NOT NULL REFERENCES goods_outwards(id) ON DELETE RESTRICT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(invoice_id, goods_outward_id)
);

-- =====================================================
-- INVOICE INWARDS JUNCTION TABLE
-- =====================================================

CREATE TABLE invoice_inwards (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    goods_inward_id UUID NOT NULL REFERENCES goods_inwards(id) ON DELETE RESTRICT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(invoice_id, goods_inward_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_invoice_outwards_invoice ON invoice_outwards(invoice_id);
CREATE INDEX idx_invoice_outwards_goods_outward ON invoice_outwards(goods_outward_id);

CREATE INDEX idx_invoice_inwards_invoice ON invoice_inwards(invoice_id);
CREATE INDEX idx_invoice_inwards_goods_inward ON invoice_inwards(goods_inward_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Update goods_outwards.has_invoice when invoice_outwards is created
CREATE OR REPLACE FUNCTION set_goods_outward_has_invoice()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE goods_outwards
    SET has_invoice = true
    WHERE id = NEW.goods_outward_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_goods_outward_has_invoice
    AFTER INSERT ON invoice_outwards
    FOR EACH ROW EXECUTE FUNCTION set_goods_outward_has_invoice();

-- Update goods_inwards.has_invoice when invoice_inwards is created
CREATE OR REPLACE FUNCTION set_goods_inward_has_invoice()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE goods_inwards
    SET has_invoice = true
    WHERE id = NEW.goods_inward_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_goods_inward_has_invoice
    AFTER INSERT ON invoice_inwards
    FOR EACH ROW EXECUTE FUNCTION set_goods_inward_has_invoice();

-- Restore goods_outwards.has_invoice when invoice_outwards is deleted
CREATE OR REPLACE FUNCTION restore_goods_outward_has_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if goods_outward still has other invoices
    UPDATE goods_outwards
    SET has_invoice = EXISTS (
        SELECT 1 FROM invoice_outwards
        WHERE goods_outward_id = OLD.goods_outward_id
          AND id != OLD.id
    )
    WHERE id = OLD.goods_outward_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_restore_goods_outward_has_invoice
    AFTER DELETE ON invoice_outwards
    FOR EACH ROW EXECUTE FUNCTION restore_goods_outward_has_invoice();

-- Restore goods_inwards.has_invoice when invoice_inwards is deleted
CREATE OR REPLACE FUNCTION restore_goods_inward_has_invoice()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if goods_inward still has other invoices
    UPDATE goods_inwards
    SET has_invoice = EXISTS (
        SELECT 1 FROM invoice_inwards
        WHERE goods_inward_id = OLD.goods_inward_id
          AND id != OLD.id
    )
    WHERE id = OLD.goods_inward_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_restore_goods_inward_has_invoice
    AFTER DELETE ON invoice_inwards
    FOR EACH ROW EXECUTE FUNCTION restore_goods_inward_has_invoice();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE invoice_outwards ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_inwards ENABLE ROW LEVEL SECURITY;

-- Authorized users can view invoice outwards
CREATE POLICY "Authorized users can view invoice outwards"
ON invoice_outwards
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('invoices.read')
);

CREATE POLICY "Authorized users can create invoice outwards"
ON invoice_outwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('invoices.create')
);

CREATE POLICY "Authorized users can delete invoice outwards"
ON invoice_outwards
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('invoices.delete')
);

-- Authorized users can view invoice inwards
CREATE POLICY "Authorized users can view invoice inwards"
ON invoice_inwards
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('invoices.read')
);

CREATE POLICY "Authorized users can create invoice inwards"
ON invoice_inwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('invoices.create')
);

CREATE POLICY "Authorized users can delete invoice inwards"
ON invoice_inwards
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('invoices.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, DELETE ON invoice_outwards TO authenticated;
GRANT SELECT, INSERT, DELETE ON invoice_inwards TO authenticated;
