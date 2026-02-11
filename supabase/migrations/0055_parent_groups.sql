-- Bale Backend - Accounting: Parent Groups
-- Standard Tally parent groups for ledger classification

-- =====================================================
-- PARENT GROUP CATEGORY ENUM
-- =====================================================

CREATE TYPE parent_group_category_enum AS ENUM ('asset', 'liability', 'income', 'expense');

-- =====================================================
-- PARENT GROUPS TABLE
-- =====================================================

CREATE TABLE parent_groups (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),

    -- Group identification
    name VARCHAR(100) NOT NULL UNIQUE,
    reserved_name VARCHAR(100), -- Tally reserved group name (if applicable)
    category parent_group_category_enum NOT NULL,

    -- Hierarchy (for sub-groups)
    parent_group_id UUID REFERENCES parent_groups(id),

    -- System management
    is_system BOOLEAN DEFAULT false, -- System groups cannot be deleted/renamed
    description TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_parent_groups_category ON parent_groups(category);
CREATE INDEX idx_parent_groups_parent ON parent_groups(parent_group_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_parent_groups_updated_at
    BEFORE UPDATE ON parent_groups
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- SEED STANDARD TALLY GROUPS
-- =====================================================

-- Primary Groups (Assets)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description) VALUES
('Current Assets', 'Current Assets', 'asset', true, 'Assets that can be converted to cash within one year'),
('Fixed Assets', 'Fixed Assets', 'asset', true, 'Long-term tangible assets like property, equipment'),
('Investments', 'Investments', 'asset', true, 'Long-term investments in securities, bonds'),
('Loans & Advances (Asset)', 'Loans & Advances (Asset)', 'asset', true, 'Money lent to employees, partners, or other entities'),
('Miscellaneous Expenses (Asset)', 'Miscellaneous Expenses (Asset)', 'asset', true, 'Prepaid expenses and deferred charges');

-- Primary Groups (Liabilities)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description) VALUES
('Current Liabilities', 'Current Liabilities', 'liability', true, 'Obligations due within one year'),
('Loans (Liability)', 'Loans (Liability)', 'liability', true, 'Bank loans, secured/unsecured loans'),
('Capital Account', 'Capital Account', 'liability', true, 'Owner''s equity and retained earnings'),
('Reserves & Surplus', 'Reserves & Surplus', 'liability', true, 'Accumulated profits and reserves'),
('Suspense Account', 'Suspense A/c', 'liability', true, 'Temporary account for unclassified entries');

-- Primary Groups (Income)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description) VALUES
('Direct Income', 'Direct Incomes', 'income', true, 'Income from core business operations'),
('Indirect Income', 'Indirect Incomes', 'income', true, 'Income from non-core operations');

-- Primary Groups (Expense)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description) VALUES
('Direct Expenses', 'Direct Expenses', 'expense', true, 'Expenses directly related to production'),
('Indirect Expenses', 'Indirect Expenses', 'expense', true, 'Operating expenses not directly tied to production');

-- Sub-Groups (Current Assets)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description, parent_group_id) VALUES
('Bank Accounts', 'Bank Accounts', 'asset', true, 'Company bank accounts', (SELECT id FROM parent_groups WHERE name = 'Current Assets')),
('Cash-in-Hand', 'Cash-in-Hand', 'asset', true, 'Physical cash at hand', (SELECT id FROM parent_groups WHERE name = 'Current Assets')),
('Deposits (Asset)', 'Deposits (Asset)', 'asset', true, 'Security deposits, fixed deposits', (SELECT id FROM parent_groups WHERE name = 'Current Assets')),
('Stock-in-Hand', 'Stock-in-Hand', 'asset', true, 'Inventory and raw materials', (SELECT id FROM parent_groups WHERE name = 'Current Assets')),
('Sundry Debtors', 'Sundry Debtors', 'asset', true, 'Amounts receivable from customers', (SELECT id FROM parent_groups WHERE name = 'Current Assets'));

-- Sub-Groups (Current Liabilities)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description, parent_group_id) VALUES
('Duties & Taxes', 'Duties & Taxes', 'liability', true, 'GST, TDS, and other tax liabilities', (SELECT id FROM parent_groups WHERE name = 'Current Liabilities')),
('Provisions', 'Provisions', 'liability', true, 'Provisions for expenses and losses', (SELECT id FROM parent_groups WHERE name = 'Current Liabilities')),
('Sundry Creditors', 'Sundry Creditors', 'liability', true, 'Amounts payable to suppliers', (SELECT id FROM parent_groups WHERE name = 'Current Liabilities'));

-- Sub-Groups (Direct Income)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description, parent_group_id) VALUES
('Sales Accounts', 'Sales Accounts', 'income', true, 'Revenue from sale of goods', (SELECT id FROM parent_groups WHERE name = 'Direct Income'));

-- Sub-Groups (Direct Expenses)
INSERT INTO parent_groups (name, reserved_name, category, is_system, description, parent_group_id) VALUES
('Purchase Accounts', 'Purchase Accounts', 'expense', true, 'Cost of goods purchased', (SELECT id FROM parent_groups WHERE name = 'Direct Expenses'));

-- =====================================================
-- RLS POLICIES (PUBLIC READ, NO WRITE)
-- =====================================================

ALTER TABLE parent_groups ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view parent groups (read-only)
CREATE POLICY "All authenticated users can view parent groups"
ON parent_groups
FOR SELECT
TO authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies - groups are managed via migrations/admin functions only

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON parent_groups TO authenticated;
