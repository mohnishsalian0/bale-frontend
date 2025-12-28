-- Bale Backend - Accounting: Ledger Functions
-- RPC functions for ledger management

-- =====================================================
-- SEED COMPANY LEDGERS FUNCTION
-- =====================================================

-- Trigger function to seed default ledgers when a company is created
CREATE OR REPLACE FUNCTION seed_company_ledgers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sundry_debtors_id UUID;
    v_sundry_creditors_id UUID;
    v_sales_accounts_id UUID;
    v_purchase_accounts_id UUID;
    v_duties_taxes_id UUID;
    v_bank_accounts_id UUID;
    v_cash_id UUID;
    v_indirect_expenses_id UUID;
    v_indirect_income_id UUID;
    v_direct_expenses_id UUID;
BEGIN
    -- Get parent group IDs
    SELECT id INTO v_sundry_debtors_id FROM parent_groups WHERE name = 'Sundry Debtors';
    SELECT id INTO v_sundry_creditors_id FROM parent_groups WHERE name = 'Sundry Creditors';
    SELECT id INTO v_sales_accounts_id FROM parent_groups WHERE name = 'Sales Accounts';
    SELECT id INTO v_purchase_accounts_id FROM parent_groups WHERE name = 'Purchase Accounts';
    SELECT id INTO v_duties_taxes_id FROM parent_groups WHERE name = 'Duties & Taxes';
    SELECT id INTO v_bank_accounts_id FROM parent_groups WHERE name = 'Bank Accounts';
    SELECT id INTO v_cash_id FROM parent_groups WHERE name = 'Cash-in-Hand';
    SELECT id INTO v_indirect_expenses_id FROM parent_groups WHERE name = 'Indirect Expenses';
    SELECT id INTO v_indirect_income_id FROM parent_groups WHERE name = 'Indirect Income';
    SELECT id INTO v_direct_expenses_id FROM parent_groups WHERE name = 'Direct Expenses';

    -- Create default Sales ledger
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type, is_default)
    VALUES (NEW.id, 'Sales', v_sales_accounts_id, 'sales', true);

    -- Create Sales Return ledger (contra to Sales)
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type)
    VALUES (NEW.id, 'Sales Return', v_sales_accounts_id, 'sales');

    -- Create default Purchase ledger
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type, is_default)
    VALUES (NEW.id, 'Purchase', v_purchase_accounts_id, 'purchase', true);

    -- Create Purchase Return ledger (contra to Purchase)
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type)
    VALUES (NEW.id, 'Purchase Return', v_purchase_accounts_id, 'purchase');

    -- Create GST ledgers (combined for input and output)
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type, gst_applicable, gst_rate, gst_type)
    VALUES
        (NEW.id, 'CGST', v_duties_taxes_id, 'tax', true, 0, 'CGST'),
        (NEW.id, 'SGST', v_duties_taxes_id, 'tax', true, 0, 'SGST'),
        (NEW.id, 'IGST', v_duties_taxes_id, 'tax', true, 0, 'IGST');

    -- Create TDS/TCS ledgers
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type, tds_applicable, tds_rate)
    VALUES
        (NEW.id, 'TDS Payable', v_duties_taxes_id, 'tax', true, 0.1),
        (NEW.id, 'TCS Receivable', v_duties_taxes_id, 'tax', true, 0.1);

    -- Create Cash ledger
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type, is_default)
    VALUES (NEW.id, 'Cash', v_cash_id, 'cash', true);

    -- Create default Bank ledger
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type, is_default)
    VALUES (NEW.id, 'Bank Account', v_bank_accounts_id, 'bank', true);

    -- Create discount ledgers
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type)
    VALUES
        (NEW.id, 'Sales Discount', v_indirect_expenses_id, 'expense'),
        (NEW.id, 'Purchase Discount', v_indirect_income_id, 'income');

    -- Create freight ledgers
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type)
    VALUES
        (NEW.id, 'Freight Outward', v_indirect_expenses_id, 'expense'),
        (NEW.id, 'Freight Inward', v_direct_expenses_id, 'expense');

    -- Create round-off ledger
    INSERT INTO ledgers (company_id, name, parent_group_id, ledger_type)
    VALUES (NEW.id, 'Round Off', v_indirect_expenses_id, 'expense');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION seed_company_ledgers IS 'Trigger function: Seeds default ledgers for a new company (Sales, Sales Return, Purchase, Purchase Return, GST, TDS/TCS, Cash, Bank, Discount, Freight, Round Off)';

-- Create trigger on companies table
CREATE TRIGGER auto_seed_company_ledgers
  AFTER INSERT ON companies
  FOR EACH ROW
  EXECUTE FUNCTION seed_company_ledgers();

COMMENT ON TRIGGER auto_seed_company_ledgers ON companies IS 'Automatically creates default ledgers when a company is created';

-- =====================================================
-- CREATE PARTY LEDGER FUNCTION
-- =====================================================

-- Trigger function to create party ledger when partner is created
CREATE OR REPLACE FUNCTION create_party_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_group_id UUID;
BEGIN
    -- Determine parent group based on partner type
    IF NEW.partner_type = 'customer' THEN
        SELECT id INTO v_parent_group_id FROM parent_groups WHERE name = 'Sundry Debtors';
    ELSIF NEW.partner_type IN ('vendor', 'supplier', 'agent') THEN
        SELECT id INTO v_parent_group_id FROM parent_groups WHERE name = 'Sundry Creditors';
    ELSE
        RAISE EXCEPTION 'Invalid partner type: %', NEW.partner_type;
    END IF;

    -- Create party ledger using company_name
    INSERT INTO ledgers (
        company_id,
        name,
        parent_group_id,
        ledger_type,
        is_bill_wise,
        partner_id
    )
    VALUES (
        NEW.company_id,
        NEW.company_name,
        v_parent_group_id,
        'party',
        true,
        NEW.id
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION create_party_ledger IS 'Trigger function: Creates a party ledger (Sundry Debtor/Creditor) for a partner with bill-wise tracking enabled';

-- Create trigger on partners table
CREATE TRIGGER auto_create_party_ledger
  AFTER INSERT ON partners
  FOR EACH ROW
  EXECUTE FUNCTION create_party_ledger();

COMMENT ON TRIGGER auto_create_party_ledger ON partners IS 'Automatically creates party ledger when a partner is created';
