-- Bale Backend - Partners RLS Policies
-- Security policies for partners management

-- =====================================================
-- ENABLE RLS ON PARTNERS TABLE
-- =====================================================

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PARTNERS TABLE RLS POLICIES
-- =====================================================

-- Admins can view all partners, staff can view partners (needed for dispatch/receipt operations)
CREATE POLICY "Users can view partners in their company"
ON partners
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id()
);

-- Only company admins can create, update, delete partners
CREATE POLICY "Company admins can manage partners"
ON partners
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_user_company_id() AND is_company_admin()
);

CREATE POLICY "Company admins can update partners"
ON partners
FOR UPDATE
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
)
WITH CHECK (
    company_id = get_user_company_id() AND is_company_admin()
);

CREATE POLICY "Company admins can delete partners"
ON partners
FOR DELETE
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON partners TO authenticated;

-- Grant limited permissions to anonymous users (for public catalog)
GRANT SELECT ON partners TO anon;
GRANT INSERT ON partners TO anon; -- For new customer creation from catalog