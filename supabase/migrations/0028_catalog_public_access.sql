-- Bale Backend - Catalog Public Access Policies
-- Anonymous user access for public catalog (must run after catalog_configurations)

-- =====================================================
-- PUBLIC CATALOG ACCESS (ANONYMOUS USERS) - PRODUCTS
-- =====================================================

-- Allow anonymous users to view public products (for catalog)
CREATE POLICY "Anonymous users can view public products"
ON products
FOR SELECT
TO anon
USING (
    show_on_catalog = true AND
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = products.company_id
        AND cc.accepting_orders = true
    )
);

-- =====================================================
-- PUBLIC CATALOG ACCESS (ANONYMOUS USERS) - PARTNERS
-- =====================================================

-- Allow anonymous users to create new customers from catalog
CREATE POLICY "Anonymous users can create customers from catalog"
ON partners
FOR INSERT
TO anon
WITH CHECK (
    partner_type = 'customer' AND
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = partners.company_id
        AND cc.accepting_orders = true
    )
);

-- =====================================================
-- PUBLIC CATALOG ACCESS (ANONYMOUS USERS) - SALES ORDERS
-- =====================================================

-- Allow anonymous users to create sales orders (from public catalog)
CREATE POLICY "Anonymous users can create sales orders from public catalog"
ON sales_orders
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = sales_orders.company_id
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view sales orders by sequence number (for order confirmation)
CREATE POLICY "Anonymous users can view sales orders by sequence number"
ON sales_orders
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = sales_orders.company_id
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to create sales order items for public catalog orders
CREATE POLICY "Anonymous users can create sales order items from public catalog"
ON sales_order_items
FOR INSERT
TO anon
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sales_orders so
        JOIN catalog_configurations cc ON so.company_id = cc.company_id
        WHERE so.id = sales_order_items.sales_order_id
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view sales order items (for order confirmation)
CREATE POLICY "Anonymous users can view sales order items"
ON sales_order_items
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM sales_orders so
        JOIN catalog_configurations cc ON so.company_id = cc.company_id
        WHERE so.id = sales_order_items.sales_order_id
        AND cc.accepting_orders = true
    )
);
