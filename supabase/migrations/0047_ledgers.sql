-- Bale Backend - Accounting: Ledgers
-- Chart of accounts with parent group classification

-- =====================================================
-- LEDGER TYPE ENUM
-- =====================================================

CREATE TYPE ledger_type_enum AS ENUM (
    'party',        -- Sundry Debtors/Creditors (customers/suppliers)
    'sales',        -- Sales accounts
    'purchase',     -- Purchase accounts
    'tax',          -- GST, TDS, TCS ledgers
    'bank',         -- Bank accounts
    'cash',         -- Cash accounts
    'asset',        -- Other assets
    'liability',    -- Other liabilities
    'income',       -- Other income
    'expense'       -- Other expenses
);

-- =====================================================
-- OPENING BALANCE DR/CR ENUM
-- =====================================================

CREATE TYPE dr_cr_enum AS ENUM ('debit', 'credit');

-- =====================================================
-- LEDGERS TABLE
-- =====================================================

CREATE TABLE ledgers (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Ledger identification
    name VARCHAR(200) NOT NULL,
    system_name VARCHAR(100), -- Internal reference for seeded ledgers
    parent_group_id UUID NOT NULL REFERENCES parent_groups(id),
    ledger_type ledger_type_enum NOT NULL,

    -- Bill-wise details (for party ledgers)
    is_bill_wise BOOLEAN DEFAULT false, -- Track invoices separately

    -- Opening balance
    opening_balance DECIMAL(15,2) DEFAULT 0,
    dr_cr dr_cr_enum DEFAULT 'debit',

    -- GST configuration (for tax ledgers)
    gst_applicable BOOLEAN DEFAULT false,
    gst_rate DECIMAL(5,2),
    gst_type VARCHAR(20), -- 'CGST', 'SGST', 'IGST', 'CESS'

    -- TDS configuration (for tax ledgers)
    tds_applicable BOOLEAN DEFAULT false,
    tds_rate DECIMAL(5,2), -- TDS percentage

    -- Bank details (for bank ledgers)
    bank_name VARCHAR(200),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(11),
    branch_name VARCHAR(200),

    -- System flags
    is_default BOOLEAN DEFAULT false, -- Default ledger for auto-selection
    is_active BOOLEAN DEFAULT true,

    -- Partner linkage (for party ledgers)
    partner_id UUID REFERENCES partners(id), -- Auto-created ledger for partners

    -- Tally export tracking
    tally_guid VARCHAR(100),
    exported_to_tally_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    UNIQUE(company_id, name)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_ledgers_company_id ON ledgers(company_id);
CREATE INDEX idx_ledgers_parent_group ON ledgers(parent_group_id);
CREATE INDEX idx_ledgers_ledger_type ON ledgers(company_id, ledger_type);
CREATE INDEX idx_ledgers_partner ON ledgers(partner_id) WHERE partner_id IS NOT NULL;
CREATE INDEX idx_ledgers_is_default ON ledgers(company_id, ledger_type, is_default) WHERE is_default = true;
CREATE INDEX idx_ledgers_active ON ledgers(company_id, is_active) WHERE is_active = true;

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_ledgers_updated_at
    BEFORE UPDATE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_ledgers_modified_by
    BEFORE UPDATE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Validate ledger configuration
CREATE OR REPLACE FUNCTION validate_ledger_config()
RETURNS TRIGGER AS $$
BEGIN
    -- Bill-wise only for party ledgers
    IF NEW.is_bill_wise = true AND NEW.ledger_type != 'party' THEN
        RAISE EXCEPTION 'Bill-wise tracking is only allowed for party ledgers';
    END IF;

    -- GST fields only if gst_applicable = true
    IF NEW.gst_applicable = false AND (NEW.gst_rate IS NOT NULL OR NEW.gst_type IS NOT NULL) THEN
        RAISE EXCEPTION 'GST rate and type can only be set when GST is applicable';
    END IF;

    -- TDS rate only if tds_applicable = true
    IF NEW.tds_applicable = false AND NEW.tds_rate IS NOT NULL THEN
        RAISE EXCEPTION 'TDS rate can only be set when TDS is applicable';
    END IF;

    -- Bank fields only for bank ledgers
    IF NEW.ledger_type != 'bank' AND (
        NEW.bank_name IS NOT NULL OR
        NEW.account_number IS NOT NULL OR
        NEW.ifsc_code IS NOT NULL OR
        NEW.branch_name IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Bank details can only be set for bank ledgers';
    END IF;

    -- Partner link only for party ledgers
    IF NEW.partner_id IS NOT NULL AND NEW.ledger_type != 'party' THEN
        RAISE EXCEPTION 'Partner linkage is only allowed for party ledgers';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_ledger_config
    BEFORE INSERT OR UPDATE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION validate_ledger_config();

-- Validate IFSC code format
ALTER TABLE ledgers ADD CONSTRAINT valid_ifsc_format
  CHECK (
    ifsc_code IS NULL OR
    (LENGTH(ifsc_code) = 11 AND ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$')
  );

-- Prevent deleting system ledgers and ledgers in use
CREATE OR REPLACE FUNCTION prevent_ledger_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent deleting default ledgers
    IF OLD.is_default = true THEN
        RAISE EXCEPTION 'Cannot delete system ledger: %', OLD.name;
    END IF;

    -- Prevent deleting partner-linked ledgers
    IF OLD.partner_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete partner ledger. Delete the partner instead.';
    END IF;

    -- Check if ledger used in invoices
    IF EXISTS (
        SELECT 1 FROM invoices
        WHERE (party_ledger_id = OLD.id OR sales_ledger_id = OLD.id OR purchase_ledger_id = OLD.id)
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot delete ledger used in invoices';
    END IF;

    -- Check if ledger used in payments
    IF EXISTS (
        SELECT 1 FROM payments
        WHERE (party_ledger_id = OLD.id OR counter_ledger_id = OLD.id)
        AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot delete ledger used in payments';
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_ledger_deletion
    BEFORE DELETE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION prevent_ledger_deletion();

-- Prevent editing critical fields of default ledgers
CREATE OR REPLACE FUNCTION prevent_critical_ledger_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- For default ledgers, prevent changing critical fields
    IF OLD.is_default = true THEN
        -- Allow name changes (for customization)
        -- But lock system_name, ledger_type, parent_group_id
        IF NEW.system_name IS DISTINCT FROM OLD.system_name THEN
            RAISE EXCEPTION 'Cannot change system_name for default ledger';
        END IF;

        IF NEW.ledger_type IS DISTINCT FROM OLD.ledger_type THEN
            RAISE EXCEPTION 'Cannot change ledger type for default ledger';
        END IF;

        IF NEW.parent_group_id IS DISTINCT FROM OLD.parent_group_id THEN
            RAISE EXCEPTION 'Cannot change parent group for default ledger';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_critical_ledger_edit
    BEFORE UPDATE ON ledgers
    FOR EACH ROW EXECUTE FUNCTION prevent_critical_ledger_edit();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE ledgers ENABLE ROW LEVEL SECURITY;

-- Authorized users can view ledgers
CREATE POLICY "Authorized users can view ledgers"
ON ledgers
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('ledgers.read') AND
    deleted_at IS NULL
);

-- Authorized users can create ledgers
CREATE POLICY "Authorized users can create ledgers"
ON ledgers
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('ledgers.create')
);

-- Authorized users can update ledgers
CREATE POLICY "Authorized users can update ledgers"
ON ledgers
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('ledgers.update') AND
    deleted_at IS NULL
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('ledgers.update')
);

-- Authorized users can delete ledgers
CREATE POLICY "Authorized users can delete ledgers"
ON ledgers
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('ledgers.delete') AND
    deleted_at IS NULL
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ledgers TO authenticated;
