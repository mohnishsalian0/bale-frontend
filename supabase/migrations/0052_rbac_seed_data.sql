-- Bale Backend - RBAC Seed Data
-- Seed permissions, roles, and role-permission mappings with dot-path format

-- =====================================================
-- SEED ROLES
-- =====================================================

INSERT INTO roles (name, display_name, description) VALUES
('admin', 'Administrator', 'Full access to all features via wildcard permission'),
('staff', 'Staff Member', 'Limited access with warehouse-scoped permissions');

-- =====================================================
-- SEED PERMISSIONS
-- =====================================================

-- Admin wildcard permission (grants everything)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('*', 'Full Access', 'Wildcard permission that grants access to all features', 'system');

-- Companies (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('companies.read', 'View Company', 'View company information', 'companies'),
('companies.create', 'Create Company', 'Create new companies', 'companies'),
('companies.update', 'Update Company', 'Edit company details', 'companies'),
('companies.delete', 'Delete Company', 'Delete companies', 'companies');

-- Warehouses (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('warehouses.read', 'View Warehouses', 'View warehouse list and details', 'warehouses'),
('warehouses.create', 'Create Warehouses', 'Add new warehouses', 'warehouses'),
('warehouses.update', 'Update Warehouses', 'Edit warehouse details', 'warehouses'),
('warehouses.delete', 'Delete Warehouses', 'Remove warehouses', 'warehouses');

-- Users (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('users.read', 'View Users', 'View user list and details', 'users'),
('users.create', 'Create Users', 'Invite and create new users', 'users'),
('users.update', 'Update Users', 'Edit user details and permissions', 'users'),
('users.delete', 'Delete Users', 'Remove user accounts', 'users');

-- Inventory Module (Products, Stock Units, QR Batches)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
-- Products
('inventory.products.read', 'View Products', 'View product catalog', 'inventory'),
('inventory.products.create', 'Create Products', 'Add new products to catalog', 'inventory'),
('inventory.products.update', 'Update Products', 'Edit existing products', 'inventory'),
('inventory.products.delete', 'Delete Products', 'Remove products from catalog', 'inventory'),

-- Stock Units
('inventory.stock_units.read', 'View Stock Units', 'View stock unit details', 'inventory'),
('inventory.stock_units.create', 'Create Stock Units', 'Add new stock units', 'inventory'),
('inventory.stock_units.update', 'Update Stock Units', 'Edit stock unit details', 'inventory'),
('inventory.stock_units.delete', 'Delete Stock Units', 'Remove stock units', 'inventory'),

-- QR Batches
('inventory.qr_batches.read', 'View QR Batches', 'View QR code batch history', 'inventory'),
('inventory.qr_batches.create', 'Create QR Batches', 'Generate QR code batches', 'inventory'),
('inventory.qr_batches.update', 'Update QR Batches', 'Edit QR batch information', 'inventory'),
('inventory.qr_batches.delete', 'Delete QR Batches', 'Remove QR batches', 'inventory');

-- Movement Module (Inward, Outward, Transfers)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
-- Goods Inward
('movement.inward.read', 'View Inward', 'View inward movement records', 'movement'),
('movement.inward.create', 'Create Inward', 'Create inward movements', 'movement'),
('movement.inward.update', 'Update Inward', 'Edit inward records', 'movement'),
('movement.inward.delete', 'Delete Inward', 'Remove inward records', 'movement'),

-- Goods Outward
('movement.outward.read', 'View Outward', 'View outward movement records', 'movement'),
('movement.outward.create', 'Create Outward', 'Create outward movements', 'movement'),
('movement.outward.update', 'Update Outward', 'Edit outward records', 'movement'),
('movement.outward.delete', 'Delete Outward', 'Remove outward records', 'movement'),

-- Goods Transfers
('movement.transfers.read', 'View Transfers', 'View warehouse transfer records', 'movement'),
('movement.transfers.create', 'Create Transfers', 'Create warehouse transfers', 'movement'),
('movement.transfers.update', 'Update Transfers', 'Edit transfer records (includes complete/cancel)', 'movement'),
('movement.transfers.delete', 'Delete Transfers', 'Remove transfer records', 'movement');

-- Partners (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('partners.read', 'View Partners', 'View customer, vendor, supplier, and agent records', 'partners'),
('partners.create', 'Create Partners', 'Add new partners', 'partners'),
('partners.update', 'Update Partners', 'Edit partner information', 'partners'),
('partners.delete', 'Delete Partners', 'Remove partner records', 'partners');

-- Sales Orders (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('sales_orders.read', 'View Sales Orders', 'View sales order list and details', 'sales_orders'),
('sales_orders.create', 'Create Sales Orders', 'Create new sales orders', 'sales_orders'),
('sales_orders.update', 'Update Sales Orders', 'Edit existing sales orders', 'sales_orders'),
('sales_orders.delete', 'Delete Sales Orders', 'Cancel or delete sales orders', 'sales_orders');

-- Job Work (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('job_works.read', 'View Job Work', 'View job work records', 'job_works'),
('job_works.create', 'Create Job Work', 'Create new job work entries', 'job_works'),
('job_works.update', 'Update Job Work', 'Edit job work records', 'job_works'),
('job_works.delete', 'Delete Job Work', 'Remove job work entries', 'job_works');

-- Catalog (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('catalog.read', 'View Catalog', 'Access public sales catalog', 'catalog'),
('catalog.create', 'Create Catalog Entries', 'Add products to catalog', 'catalog'),
('catalog.update', 'Update Catalog', 'Edit catalog settings and entries', 'catalog'),
('catalog.delete', 'Delete Catalog Entries', 'Remove items from catalog', 'catalog');

-- Reports (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('reports.read', 'View Reports', 'Access reports and analytics', 'reports');

-- Storage (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('storage.upload', 'Upload Files', 'Upload files and images to storage', 'storage'),
('storage.delete', 'Delete Files', 'Remove files from storage', 'storage');

-- Purchase Orders (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('purchase_orders.read', 'View Purchase Orders', 'View purchase order list and details', 'purchase_orders'),
('purchase_orders.create', 'Create Purchase Orders', 'Create new purchase orders', 'purchase_orders'),
('purchase_orders.update', 'Update Purchase Orders', 'Edit existing purchase orders', 'purchase_orders'),
('purchase_orders.delete', 'Delete Purchase Orders', 'Cancel or delete purchase orders', 'purchase_orders');

-- Invoices (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('invoices.read', 'View Invoices', 'View sales and purchase invoice list and details', 'invoices'),
('invoices.create', 'Create Invoices', 'Create new sales and purchase invoices', 'invoices'),
('invoices.update', 'Update Invoices', 'Edit existing invoices', 'invoices'),
('invoices.delete', 'Delete Invoices', 'Cancel or delete invoices', 'invoices');

-- Adjustment Notes (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('adjustment_notes.read', 'View Adjustment Notes', 'View credit and debit notes', 'adjustment_notes'),
('adjustment_notes.create', 'Create Adjustment Notes', 'Create credit and debit notes', 'adjustment_notes'),
('adjustment_notes.update', 'Update Adjustment Notes', 'Edit adjustment notes', 'adjustment_notes'),
('adjustment_notes.delete', 'Delete Adjustment Notes', 'Cancel or delete adjustment notes', 'adjustment_notes');

-- Payments (Top Level)
INSERT INTO permissions (permission_path, display_name, description, category) VALUES
('payments.read', 'View Payments', 'View payment and receipt vouchers', 'payments'),
('payments.create', 'Create Payments', 'Create payment and receipt vouchers', 'payments'),
('payments.update', 'Update Payments', 'Edit payment vouchers', 'payments'),
('payments.delete', 'Delete Payments', 'Cancel or delete payment vouchers', 'payments');

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

-- Staff gets limited permissions for warehouse-scoped operations
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'staff'
AND p.permission_path IN (
    -- Read-only for core resources
    'inventory.products.read',
    'partners.read',
    'warehouses.read',
    'users.read',
    'reports.read',

    -- Full CRUD for stock units in assigned warehouse (RLS handles warehouse filtering)
    'inventory.stock_units.read',
    'inventory.stock_units.create',
    'inventory.stock_units.update',
    'inventory.stock_units.delete',

    -- QR code generation
    'inventory.qr_batches.read',
    'inventory.qr_batches.create',

    -- Read-only for sales orders in assigned warehouse
    'sales_orders.read',

    -- Read-only for purchase orders in assigned warehouse
    'purchase_orders.read',

    -- Read-only for accounting features
    'invoices.read',
    'adjustment_notes.read',
    'payments.read',

    -- Full CRUD for job work in assigned warehouse
    'job_works.read',
    'job_works.create',
    'job_works.update',
    'job_works.delete',

    -- Full CRUD for movements in assigned warehouse
    'movement.inward.read',
    'movement.inward.create',
    'movement.inward.update',
    'movement.inward.delete',
    'movement.outward.read',
    'movement.outward.create',
    'movement.outward.update',
    'movement.outward.delete',

    -- Warehouse transfers (can create transfers from assigned warehouse)
    'movement.transfers.read',
    'movement.transfers.create',
    'movement.transfers.update',

    -- Storage access
    'storage.upload',
    'storage.delete'
);
