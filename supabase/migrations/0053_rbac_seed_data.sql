-- Bale Backend - RBAC Seed Data
-- Seed permissions, roles, and role-permission mappings with dot-path format
-- Organized into 4 modules: Inventory, Orders, Accounting, Business

-- =====================================================
-- SEED ROLES
-- =====================================================

INSERT INTO roles (name, display_name, description) VALUES
('admin', 'Administrator', 'Full access to all features via wildcard permission'),
('staff', 'Staff Member', 'Inventory and orders management with warehouse-scoped permissions'),
('accountant', 'Accountant', 'Orders, accounting, and partner management with warehouse-scoped or company-wide access');

-- =====================================================
-- SEED PERMISSIONS
-- =====================================================

-- Admin wildcard permission (grants everything)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('*', 'Full Access', 'Wildcard permission that grants access to all features', 'system');

-- =====================================================
-- BUSINESS MODULE
-- =====================================================

-- Companies
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('business.companies.read', 'View Company', 'View company information', 'business'),
('business.companies.create', 'Create Company', 'Create new companies', 'business'),
('business.companies.update', 'Update Company', 'Edit company details', 'business'),
('business.companies.delete', 'Delete Company', 'Delete companies', 'business');

-- Warehouses
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('business.warehouses.read', 'View Warehouses', 'View warehouse list and details', 'business'),
('business.warehouses.create', 'Create Warehouses', 'Add new warehouses', 'business'),
('business.warehouses.update', 'Update Warehouses', 'Edit warehouse details', 'business'),
('business.warehouses.delete', 'Delete Warehouses', 'Remove warehouses', 'business');

-- Users (Staff Management)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('business.users.read', 'View Users', 'View user list and details', 'business'),
('business.users.create', 'Create Users', 'Invite and create new users', 'business'),
('business.users.update', 'Update Users', 'Edit user details and permissions', 'business'),
('business.users.delete', 'Delete Users', 'Remove user accounts', 'business');

-- Products
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('business.products.read', 'View Products', 'View product catalog', 'business'),
('business.products.create', 'Create Products', 'Add new products to catalog', 'business'),
('business.products.update', 'Update Products', 'Edit existing products', 'business'),
('business.products.delete', 'Delete Products', 'Remove products from catalog', 'business');

-- Partners
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('business.partners.read', 'View Partners', 'View customer, vendor, supplier, and agent records', 'business'),
('business.partners.create', 'Create Partners', 'Add new partners', 'business'),
('business.partners.update', 'Update Partners', 'Edit partner information', 'business'),
('business.partners.delete', 'Delete Partners', 'Remove partner records', 'business');

-- Catalog
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('business.catalog.read', 'View Catalog', 'Access public sales catalog', 'business'),
('business.catalog.create', 'Create Catalog Entries', 'Add products to catalog', 'business'),
('business.catalog.update', 'Update Catalog', 'Edit catalog settings and entries', 'business'),
('business.catalog.delete', 'Delete Catalog Entries', 'Remove items from catalog', 'business');

-- =====================================================
-- INVENTORY MODULE
-- =====================================================

-- Stock Units
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('inventory.stock_units.read', 'View Stock Units', 'View stock unit details', 'inventory'),
('inventory.stock_units.create', 'Create Stock Units', 'Add new stock units', 'inventory'),
('inventory.stock_units.update', 'Update Stock Units', 'Edit stock unit details', 'inventory'),
('inventory.stock_units.delete', 'Delete Stock Units', 'Remove stock units', 'inventory');

-- QR Batches
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('inventory.qr_batches.read', 'View QR Batches', 'View QR code batch history', 'inventory'),
('inventory.qr_batches.create', 'Create QR Batches', 'Generate QR code batches', 'inventory'),
('inventory.qr_batches.update', 'Update QR Batches', 'Edit QR batch information', 'inventory'),
('inventory.qr_batches.delete', 'Delete QR Batches', 'Remove QR batches', 'inventory');

-- Goods Inward
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('inventory.inward.read', 'View Inward', 'View inward movement records', 'inventory'),
('inventory.inward.create', 'Create Inward', 'Create inward movements', 'inventory'),
('inventory.inward.update', 'Update Inward', 'Edit inward records', 'inventory'),
('inventory.inward.delete', 'Delete Inward', 'Remove inward records', 'inventory');

-- Goods Outward
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('inventory.outward.read', 'View Outward', 'View outward movement records', 'inventory'),
('inventory.outward.create', 'Create Outward', 'Create outward movements', 'inventory'),
('inventory.outward.update', 'Update Outward', 'Edit outward records', 'inventory'),
('inventory.outward.delete', 'Delete Outward', 'Remove outward records', 'inventory');

-- Goods Transfers
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('inventory.transfers.read', 'View Transfers', 'View warehouse transfer records', 'inventory'),
('inventory.transfers.create', 'Create Transfers', 'Create warehouse transfers', 'inventory'),
('inventory.transfers.update', 'Update Transfers', 'Edit transfer records (includes complete/cancel)', 'inventory'),
('inventory.transfers.delete', 'Delete Transfers', 'Remove transfer records', 'inventory');

-- Goods Converts
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('inventory.converts.read', 'View Converts', 'View goods conversion records', 'inventory'),
('inventory.converts.create', 'Create Converts', 'Create goods conversions', 'inventory'),
('inventory.converts.update', 'Update Converts', 'Edit conversion records (includes complete/cancel)', 'inventory'),
('inventory.converts.delete', 'Delete Converts', 'Remove conversion records', 'inventory');

-- =====================================================
-- ORDERS MODULE
-- =====================================================

-- Sales Orders
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('orders.sales_orders.read', 'View Sales Orders', 'View sales order list and details', 'orders'),
('orders.sales_orders.create', 'Create Sales Orders', 'Create new sales orders', 'orders'),
('orders.sales_orders.update', 'Update Sales Orders', 'Edit existing sales orders', 'orders'),
('orders.sales_orders.delete', 'Delete Sales Orders', 'Cancel or delete sales orders', 'orders');

-- Purchase Orders
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('orders.purchase_orders.read', 'View Purchase Orders', 'View purchase order list and details', 'orders'),
('orders.purchase_orders.create', 'Create Purchase Orders', 'Create new purchase orders', 'orders'),
('orders.purchase_orders.update', 'Update Purchase Orders', 'Edit existing purchase orders', 'orders'),
('orders.purchase_orders.delete', 'Delete Purchase Orders', 'Cancel or delete purchase orders', 'orders');

-- Job Work
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('orders.job_works.read', 'View Job Work', 'View job work records', 'orders'),
('orders.job_works.create', 'Create Job Work', 'Create new job work entries', 'orders'),
('orders.job_works.update', 'Update Job Work', 'Edit job work records', 'orders'),
('orders.job_works.delete', 'Delete Job Work', 'Remove job work entries', 'orders');

-- =====================================================
-- ACCOUNTING MODULE
-- =====================================================

-- Invoices
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('accounting.invoices.read', 'View Invoices', 'View sales and purchase invoice list and details', 'accounting'),
('accounting.invoices.create', 'Create Invoices', 'Create new sales and purchase invoices', 'accounting'),
('accounting.invoices.update', 'Update Invoices', 'Edit existing invoices', 'accounting'),
('accounting.invoices.delete', 'Delete Invoices', 'Cancel or delete invoices', 'accounting');

-- Adjustment Notes
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('accounting.adjustment_notes.read', 'View Adjustment Notes', 'View credit and debit notes', 'accounting'),
('accounting.adjustment_notes.create', 'Create Adjustment Notes', 'Create credit and debit notes', 'accounting'),
('accounting.adjustment_notes.update', 'Update Adjustment Notes', 'Edit adjustment notes', 'accounting'),
('accounting.adjustment_notes.delete', 'Delete Adjustment Notes', 'Cancel or delete adjustment notes', 'accounting');

-- Payments
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('accounting.payments.read', 'View Payments', 'View payment and receipt vouchers', 'accounting'),
('accounting.payments.create', 'Create Payments', 'Create payment and receipt vouchers', 'accounting'),
('accounting.payments.update', 'Update Payments', 'Edit payment vouchers', 'accounting'),
('accounting.payments.delete', 'Delete Payments', 'Cancel or delete payment vouchers', 'accounting');

-- =====================================================
-- ASSIGN PERMISSIONS TO ADMIN ROLE
-- =====================================================

-- Admin gets wildcard permission (full access to everything)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.permission_path = '*';

-- =====================================================
-- ASSIGN PERMISSIONS TO STAFF ROLE
-- =====================================================

-- Staff: Full CRUD on Inventory + Orders modules, Full CRUD on Products
-- Read-only on rest of Business module (RLS handles warehouse filtering)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'staff'
AND p.permission_path IN (
    -- Business Module: Full CRUD on Products
    'business.products.read',
    'business.products.create',
    'business.products.update',
    'business.products.delete',

    -- Business Module: Read-only on other resources
    'business.companies.read',
    'business.warehouses.read',
    'business.users.read',
    'business.partners.read',
    'business.catalog.read',

    -- Inventory Module: Full CRUD (warehouse-scoped via RLS)
    'inventory.stock_units.read',
    'inventory.stock_units.create',
    'inventory.stock_units.update',
    'inventory.stock_units.delete',
    'inventory.qr_batches.read',
    'inventory.qr_batches.create',
    'inventory.qr_batches.update',
    'inventory.qr_batches.delete',
    'inventory.inward.read',
    'inventory.inward.create',
    'inventory.inward.update',
    'inventory.inward.delete',
    'inventory.outward.read',
    'inventory.outward.create',
    'inventory.outward.update',
    'inventory.outward.delete',
    'inventory.transfers.read',
    'inventory.transfers.create',
    'inventory.transfers.update',
    'inventory.transfers.delete',
    'inventory.converts.read',
    'inventory.converts.create',
    'inventory.converts.update',
    'inventory.converts.delete',

    -- Orders Module: Full CRUD (warehouse-scoped via RLS)
    'orders.sales_orders.read',
    'orders.sales_orders.create',
    'orders.sales_orders.update',
    'orders.sales_orders.delete',
    'orders.purchase_orders.read',
    'orders.purchase_orders.create',
    'orders.purchase_orders.update',
    'orders.purchase_orders.delete',
    'orders.job_works.read',
    'orders.job_works.create',
    'orders.job_works.update',
    'orders.job_works.delete'
);

-- =====================================================
-- ASSIGN PERMISSIONS TO ACCOUNTANT ROLE
-- =====================================================

-- Accountant: Full CRUD on Orders + Accounting modules, Full CRUD on Partners
-- Read-only on Inventory module and rest of Business module (warehouse access controlled by admin)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'accountant'
AND p.permission_path IN (
    -- Business Module: Full CRUD on Partners
    'business.partners.read',
    'business.partners.create',
    'business.partners.update',
    'business.partners.delete',

    -- Business Module: Read-only on other resources
    'business.companies.read',
    'business.warehouses.read',
    'business.users.read',
    'business.products.read',
    'business.catalog.read',

    -- Inventory Module: Read-only (for viewing stock levels, movements)
    'inventory.stock_units.read',
    'inventory.qr_batches.read',
    'inventory.inward.read',
    'inventory.outward.read',
    'inventory.transfers.read',
    'inventory.converts.read',

    -- Orders Module: Full CRUD
    'orders.sales_orders.read',
    'orders.sales_orders.create',
    'orders.sales_orders.update',
    'orders.sales_orders.delete',
    'orders.purchase_orders.read',
    'orders.purchase_orders.create',
    'orders.purchase_orders.update',
    'orders.purchase_orders.delete',
    'orders.job_works.read',
    'orders.job_works.create',
    'orders.job_works.update',
    'orders.job_works.delete',

    -- Accounting Module: Full CRUD
    'accounting.invoices.read',
    'accounting.invoices.create',
    'accounting.invoices.update',
    'accounting.invoices.delete',
    'accounting.adjustment_notes.read',
    'accounting.adjustment_notes.create',
    'accounting.adjustment_notes.update',
    'accounting.adjustment_notes.delete',
    'accounting.payments.read',
    'accounting.payments.create',
    'accounting.payments.update',
    'accounting.payments.delete'
);
