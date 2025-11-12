-- Bale Backend - RBAC Seed Data
-- Seed permissions, roles, and role-permission mappings

-- =====================================================
-- SEED ROLES
-- =====================================================

INSERT INTO roles (name, display_name, description) VALUES
('admin', 'Administrator', 'Full access to all features except deleting companies'),
('staff', 'Staff Member', 'Limited access with warehouse-scoped permissions');

-- =====================================================
-- SEED PERMISSIONS
-- =====================================================

INSERT INTO permissions (resource, action, description) VALUES
-- Companies
('companies', 'read', 'View company details'),
('companies', 'create', 'Create new companies'),
('companies', 'update', 'Update company information'),
('companies', 'delete', 'Delete companies'),

-- Users/Staff
('users', 'read', 'View user profiles'),
('users', 'create', 'Create new users/staff'),
('users', 'update', 'Update user profiles'),
('users', 'delete', 'Delete users/staff'),

-- Warehouses
('warehouses', 'read', 'View warehouses'),
('warehouses', 'create', 'Create new warehouses'),
('warehouses', 'update', 'Update warehouse information'),
('warehouses', 'delete', 'Delete warehouses'),

-- Products
('products', 'read', 'View products'),
('products', 'create', 'Create new products'),
('products', 'update', 'Update product information'),
('products', 'delete', 'Delete products'),

-- Stock Units
('stock_units', 'read', 'View stock units'),
('stock_units', 'create', 'Create new stock units'),
('stock_units', 'update', 'Update stock unit information'),
('stock_units', 'delete', 'Delete stock units'),

-- Partners (Customers, Vendors, Suppliers, Agents)
('partners', 'read', 'View partners'),
('partners', 'create', 'Create new partners'),
('partners', 'update', 'Update partner information'),
('partners', 'delete', 'Delete partners'),

-- Sales Orders
('sales_orders', 'read', 'View sales orders'),
('sales_orders', 'create', 'Create new sales orders'),
('sales_orders', 'update', 'Update sales order information'),
('sales_orders', 'delete', 'Delete sales orders'),

-- Job Works
('job_works', 'read', 'View job works'),
('job_works', 'create', 'Create new job works'),
('job_works', 'update', 'Update job work information'),
('job_works', 'delete', 'Delete job works'),

-- Goods Inwards
('goods_inwards', 'read', 'View goods inward records'),
('goods_inwards', 'create', 'Create goods inward records'),
('goods_inwards', 'update', 'Update goods inward records'),
('goods_inwards', 'delete', 'Delete goods inward records'),

-- Goods Outwards
('goods_outwards', 'read', 'View goods outward records'),
('goods_outwards', 'create', 'Create goods outward records'),
('goods_outwards', 'update', 'Update goods outward records'),
('goods_outwards', 'delete', 'Delete goods outward records'),

-- QR Batches
('qr_batches', 'read', 'View QR code batches'),
('qr_batches', 'create', 'Create QR code batches'),
('qr_batches', 'update', 'Update QR batch information'),
('qr_batches', 'delete', 'Delete QR batches'),

-- Catalog
('catalog', 'read', 'View catalog configuration'),
('catalog', 'create', 'Create catalog entries'),
('catalog', 'update', 'Update catalog configuration'),
('catalog', 'delete', 'Delete catalog entries'),

-- Storage/Files
('storage', 'upload', 'Upload files and images'),
('storage', 'delete', 'Delete files and images');

-- =====================================================
-- ASSIGN PERMISSIONS TO ADMIN ROLE
-- =====================================================

-- Admin gets ALL permissions EXCEPT companies.delete
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'admin'),
    id
FROM permissions
WHERE NOT (resource = 'companies' AND action = 'delete');

-- =====================================================
-- ASSIGN PERMISSIONS TO STAFF ROLE
-- =====================================================

-- Staff gets READ permissions for most resources
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'staff'),
    id
FROM permissions
WHERE action = 'read'
AND resource IN ('products', 'partners', 'sales_orders', 'warehouses', 'users');

-- Staff gets warehouse-scoped CRUD for stock operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT
    (SELECT id FROM roles WHERE name = 'staff'),
    id
FROM permissions
WHERE resource IN ('stock_units', 'goods_inwards', 'goods_outwards', 'job_works', 'qr_batches');
