-- Bale Backend - Catalog Public Access Policies
-- Anonymous user access for public catalog (must run after catalog_configurations)

-- =====================================================
-- PUBLIC CATALOG ACCESS (ANONYMOUS USERS) - COMPANIES
-- =====================================================

-- Allow anonymous users to view companies with public catalogs enabled
CREATE POLICY "Anonymous users can view companies with public catalogs"
ON companies
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = companies.id
        AND cc.accepting_orders = true
    )
);

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
CREATE POLICY "Allow anonymous users can create customers from catalog"
ON partners
FOR INSERT
TO anon
WITH CHECK (
    partners.partner_type = 'customer' AND
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = partners.company_id
        AND cc.accepting_orders = true
    )
);

CREATE POLICY "Allow anonymous users to update their data from catalog"
ON partners
FOR UPDATE
TO anon
USING (
    partners.partner_type = 'customer' AND
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = partners.company_id
        AND cc.accepting_orders = true
    )
)
WITH CHECK (
    partners.partner_type = 'customer' AND
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = partners.company_id
        AND cc.accepting_orders = true
    )
);

CREATE POLICY "Anonymous users can select customers from catalog"
ON partners
FOR SELECT
TO anon
USING (
    partners.partner_type = 'customer' AND
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = partners.company_id
        AND cc.accepting_orders = true
    )
);


-- =====================================================
-- PUBLIC CATALOG ACCESS (ANONYMOUS USERS) - SALES ORDERS
-- =====================================================

-- Allow anonymous users to create sales orders from  catalog
CREATE POLICY "Anonymous users can create sales orders from  catalog"
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

-- Allow anonymous users to create sales order items from catalog orders
CREATE POLICY "Anonymous users can create sales order items from catalog"
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

-- =====================================================
-- PUBLIC CATALOG ACCESS (ANONYMOUS USERS) - PRODUCT ATTRIBUTES
-- =====================================================

-- Allow anonymous users to view product inventory aggregates for public catalog products
CREATE POLICY "Anonymous users can view product inventory aggregates"
ON product_inventory_aggregates
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM products p
        JOIN catalog_configurations cc ON p.company_id = cc.company_id
        WHERE p.id = product_inventory_aggregates.product_id
        AND p.show_on_catalog = true
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view product materials
CREATE POLICY "Anonymous users can view product materials"
ON product_materials
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = product_materials.company_id
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view product colors
CREATE POLICY "Anonymous users can view product colors"
ON product_colors
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = product_colors.company_id
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view product tags
CREATE POLICY "Anonymous users can view product tags"
ON product_tags
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM catalog_configurations cc
        WHERE cc.company_id = product_tags.company_id
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view product material assignments
CREATE POLICY "Anonymous users can view product material assignments"
ON product_material_assignments
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM products p
        JOIN catalog_configurations cc ON p.company_id = cc.company_id
        WHERE p.id = product_material_assignments.product_id
        AND p.show_on_catalog = true
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view product color assignments
CREATE POLICY "Anonymous users can view product color assignments"
ON product_color_assignments
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM products p
        JOIN catalog_configurations cc ON p.company_id = cc.company_id
        WHERE p.id = product_color_assignments.product_id
        AND p.show_on_catalog = true
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view product tag assignments
CREATE POLICY "Anonymous users can view product tag assignments"
ON product_tag_assignments
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM products p
        JOIN catalog_configurations cc ON p.company_id = cc.company_id
        WHERE p.id = product_tag_assignments.product_id
        AND p.show_on_catalog = true
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view catalog configurations (needed for checking if accepting orders)
CREATE POLICY "Anonymous users can view catalog configurations"
ON catalog_configurations
FOR SELECT
TO anon
USING (accepting_orders = true);

-- =====================================================
-- GRANT PERMISSIONS TO ANONYMOUS ROLE
-- =====================================================

-- Grant SELECT permissions for reading data
GRANT SELECT ON companies TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON partners TO anon;
GRANT SELECT ON product_inventory_aggregates TO anon;
GRANT SELECT ON product_materials TO anon;
GRANT SELECT ON product_colors TO anon;
GRANT SELECT ON product_tags TO anon;
GRANT SELECT ON product_material_assignments TO anon;
GRANT SELECT ON product_color_assignments TO anon;
GRANT SELECT ON product_tag_assignments TO anon;

-- Grant INSERT permissions for creating data
GRANT INSERT ON partners TO anon;
GRANT INSERT ON sales_orders TO anon;
GRANT INSERT ON sales_order_items TO anon;

-- Grant UPDATE permissions for creating data
GRANT UPDATE ON partners TO anon;
