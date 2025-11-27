# Development Plan

## Phase 1: Foundation & Setup

- [x] Initialize Next.js 14+ with TypeScript, Tailwind CSS, App Router
- [x] Set up folder structure (app routes, components, lib, types)
- [x] Install dependencies (react-hook-form, zod, supabase) - shadcn/ui and barcode libs pending
- [x] Configure Supabase client and environment
- [x] Create design system theme from Figma
- [x] Configure Tailwind CSS with theme
- [x] Migrate to TanStack Query for data fetching (centralized query keys, custom hooks, cache management)

## Phase 2: Database & Security

- [x] Design and create database schema (companies, staff, warehouses, products, stock_units, partners, orders, job_works, outwards, inwards)
- [x] Implement Row Level Security policies (tenant isolation, warehouse scoping, role-based permissions)
- [x] Review and update migration schema (outward/inward types, stock status)
- [x] Create TypeScript database type definitions (enums)
- [x] Initialize Supabase locally (Docker + migrations copied)
- [x] Fix Supabase services startup and verify all containers running
- [x] Get local Supabase credentials (API URL, anon key, service key)
- [x] Update .env.local with credentials
- [x] Fix Tailwind CSS PostCSS configuration (@tailwindcss/postcss)
- [x] Test database connection from Next.js app (test page at /test)
- [x] Generate complete TypeScript types from Supabase schema
- [x] Copy all 22 migrations to supabase/migrations/ (0001-0022)
- [x] Uncomment generate_sequence_number() and helper functions in 0001
- [x] Run migrations in Supabase (reset database and apply all 22 migrations)
- [x] Regenerate TypeScript types from full schema
- [x] Create test seed data (company, user, warehouse, partners)
- [x] Create test data script with invite generation (scripts/create-test-partners.ts)
- [x] Fix auth callback RLS issue (use service role for profile creation)
- [x] Set up storage buckets for images/files (company-logos, profile-images, product-images)
- [x] Configure storage policies with RLS (multi-tenant access control)
- [x] Create storage utility functions (upload, delete, get URLs)
- [x] Implement flexible permission system with dot-path notation (0006_rbac_schema.sql)
- [x] Update authorize() function with backtracking wildcard matcher (0001_enable_extensions_and_functions.sql)
- [x] Remove hardcoded admin role checks - all permissions from database
- [x] Add user-level all_warehouses_access flag for explicit warehouse scoping (0004_users.sql)
- [x] Seed permissions with hierarchical structure (0031_rbac_seed_data.sql)
- [x] Extend SessionContext with permission loading and checking (warehouse-context.tsx)
- [x] Create PermissionGate component for conditional rendering (PermissionGate.tsx)
- [x] Update layout.tsx to load permissions from database

## Phase 3: Authentication & Core Layout

- [x] Build auth system (Google OAuth with Supabase Auth)
- [x] Create role detection (Admin vs Staff) - session utilities created
- [x] Create user profile from invite on first login
- [x] Build invite acceptance page (/invite/[code])
- [x] Create auth callback handler with profile creation (/auth/callback)
- [x] Build dev admin script to generate test invites
- [x] Create placeholder dashboard page
- [x] Fix phone_number nullable constraint in database
- [x] Test complete OAuth flow (invite → Google login → profile creation → dashboard)
- [x] Style invite acceptance page with Figma design (mascot, layout, colors)
- [x] Add grid background pattern to app (24px grid with gray lines)
- [x] Install and configure icon libraries (Tabler Icons)
- [x] Build TopBar component with warehouse selector button
- [x] Build BottomNav component for mobile navigation
- [x] Create WarehouseSelector dropdown component with Figma design (warehouse icon, address, location pin)
- [x] Integrate WarehouseSelector with TopBar (toggle dropdown, chevron up/down animation)
- [x] Implement slide-down animation for WarehouseSelector dropdown (translate-y with smooth transition)
- [x] Install and configure shadcn/ui Sidebar component with proper inset variant
- [x] Build AppSidebar with navigation items (Job work, QR codes, Partners, Staff, Reports, Settings, Online store)
- [x] Configure sidebar styling (text-base, size-5 icons, 16px padding, 12px gap)
- [x] Add sidebar header with app branding (Bale Inventory v1.0.0)
- [x] Implement sidebar toggle functionality with offcanvas collapsible mode
- [x] Configure sidebar to be collapsed by default (icon-only, expands on hover)
- [x] Set up protected route middleware for all routes
- [x] Handle redirectTo parameter in auth callback for post-login redirects
- [x] Create warehouse-scoped routes (/warehouse/[warehouse_slug]/...)
- [x] Fetch warehouses from Supabase and implement warehouse context/state management
- [x] Implement multi-warehouse staff assignment (user_warehouses junction table)
- [x] Create warehouse slug generation function (lowercase, hyphens, random 3-digit suffix)
- [x] Update invites schema to support multiple warehouses (invite_warehouses junction table)
- [x] Create RPC functions for atomic operations (create_staff_invite, create_user_from_invite)
- [x] Update auth callback to use RPC function for user creation
- [x] Create WarehouseProvider context and useWarehouse hook
- [x] Create warehouse selection page (/warehouse) with assigned warehouse listing
- [x] Update layout to validate warehouse access and sync user profile with URL
- [x] Update WarehouseSelector to fetch and filter by role (admin: all, staff: assigned)
- [x] Update AddStaffSheet with multi-select warehouse checkboxes
- [x] Update staff page to display multiple warehouses per staff/invite
- [x] Add getUserWarehouseIds() utility function
- [x] Batch update all data-fetching components to use useWarehouse hook (7 files)
- [x] Update middleware to redirect /protected/\* to /warehouse
- [x] Regenerate TypeScript types with new tables
- [x] Implement route groups architecture for separate layout hierarchies
- [x] Create (app)/ route group with full navigation chrome (TopBar, Sidebar, BottomNav)
- [x] Create (flow)/ route group for focused multi-step experiences (no app chrome)
- [x] Move all existing pages to (app)/ route group
- [x] Update parent layout to only provide SessionProvider
- [x] **REFACTOR**: Restructure routes into (protected) and (public) groups
- [x] **REFACTOR**: Create AppChromeContext for dynamic chrome visibility control
- [x] **REFACTOR**: Merge (app) and (flow) into single route structure
- [x] **REFACTOR**: Centralize public routes configuration (lib/auth/public-routes.ts)
- [x] **REFACTOR**: Move SessionProvider to (protected) layout only
- [x] **REFACTOR**: Update REQUIREMENTS.md with new routing architecture documentation

## Phase 4: Core UI Components

- [x] Install and configure shadcn/ui components (button, input, label, form, select, textarea, card, dialog, table, sidebar)
- [x] Configure shadcn with exact Figma color palette (primary, grays, background)
- [x] Implement 3D button effect from Figma design (4px shadow, active state)
- [x] Create tailwind.config.ts for v4 compatibility
- [x] Add border and ring color definitions to @theme
- [x] Create custom icon components (WarehouseIcon wrapper)
- [x] Create LoadingState component with trolley truck illustration (500x500)
- [x] Replace all page loading states with LoadingState component
- [x] Create Section component for detail page sections with title, subtitle, icon, and optional edit button
- [x] Create TabUnderline component for tab navigation with underline animation
- [x] Create ErrorState component for error handling with retry functionality
- [x] Create ProgressBar component for unified progress indication
- [x] Create reusable utility functions in lib/utils/ (partner, financial, date, initials)
- [ ] Build custom components (DataTable, FileUpload, SearchInput, StatusBadge)
- [ ] Create form components with validation (Zod + React Hook Form)

## Phase 5: Iteration 1 - Company/Warehouse/Staff

- [ ] Company profile management
- [ ] Warehouse CRUD (admin only)
- [x] Staff page with 2-column grid layout showing staff cards
- [x] Staff invite form with role selection and warehouse assignment (generates invite link)
- [x] Staff invite form - removed phone number field, added WhatsApp integration
- [x] Active invites tab with responsive grid (1 col mobile, 2 col large screens)
- [x] Active invites card with mail icon, warehouse/expiry info, role badge
- [x] WhatsApp share and copy link functionality for invites
- [x] Delete invite with inline confirmation (no alert dialogs)
- [x] Sonner toast notifications for invite actions
- [x] Badge component with type prop (info, success, warn, error)
- [x] Relative date helper for expiry display
- [ ] View staff details
- [ ] Edit staff functionality
- [ ] Delete staff functionality

## Phase 6: Iteration 2 - Products/Partners

- [x] Inventory page UI with search, filters (material, color, tags), and product cards
- [x] Connect inventory page to Supabase database (fetch, loading, error states)
- [x] Add product form with typed insert (features & images, stock details, additional details)
- [x] Product images upload (max 5, 2MB each) with preview and remove functionality
- [x] Product details page with header, tags, info cards, and tabbed layout
- [x] Create SummaryTab with Sales section, Stock Information section, and Product Information section
- [x] Create StockUnitsTab with sort options, QR pending filter, grouped by goods inward
- [x] Create StockFlowTab with combined inward/outward transactions (grouped by GI/GO)
- [x] Add GlowIndicator component for catalog visibility status
- [x] Add bottom action bar with 3-dot menu (show/hide catalog, delete), edit, and share buttons
- [x] Display minimum stock value in Product Information section
- [x] Product images carousel in Product Information section
- [ ] Edit product functionality (prefill AddProductSheet with product data)
- [ ] Delete product functionality
- [ ] Toggle show_on_catalog functionality
- [ ] Stock units list for each product with status and location
- [ ] Bulk actions on stock units (dispatch, mark damaged, etc.)
- [x] Partners page UI with filter tabs, search, and partner cards
- [x] Connect partners page to Supabase database (fetch, loading, error states)
- [x] Add partner form with typed insert (image upload, business details, address, tax details)
- [x] Partner details page with header, summary cards, and tabbed layout
- [x] Create SummaryTab with Contact Information and Financial Information sections
- [x] Create OrdersTab with month-grouped orders list matching sales orders page format
- [x] Add bottom action bar with 3-dot menu (delete), edit, and sales/purchase order CTA
- [x] Display top purchased/supplied item and total orders in summary cards
- [x] Show pending orders count and first pending order below cards
- [ ] Edit partner functionality (prefill AddPartnerSheet with partner data)
- [ ] Delete partner functionality

## Phase 7: Iteration 3 - Inward/Stock/Inventory

- [x] Stock flow page UI with month grouping, search, filters, and transaction list
- [x] Connect stock flow page to Supabase (fetch inwards/outwards with related data)
- [x] Add goods inward form with automatic stock unit creation
- [x] Create AddGoodsReceiptSheet with 2-step flow integrated into stock flow page
- [x] Create ProductSelectionStep for goods inward with product filtering
- [x] Create StockUnitEntrySheet for adding individual stock units
- [x] Create AllSpecificationsSheet for viewing/editing all units per product
- [x] Create DetailsStep with conditional fields (Received from, Link to)
- [x] Implement RadioGroupPills for partner/warehouse and link type selection
- [x] Add increment/decrement functionality for duplicate unit specifications
- [x] Integrate goods inward form with FAB dropdown in stock flow page
- [x] Implement responsive Dialog/Drawer pattern for unit entry
- [x] Add stock unit creation with proper field mapping (quality_grade, supplier_number, location_description)
- [x] Replace wastage field with supplier_number in stock units schema
- [x] Add supplier_number input to StockUnitEntrySheet with IconHash
- [x] Update AllSpecificationsSheet to display supplier_number
- [x] Implement atomic transaction for goods inward creation using database function
- [x] Add editable count input in AllSpecificationsSheet
- [x] Show delete icon when count is 1 in AllSpecificationsSheet
- [x] Display multiple products as "Product name, x more" in stock flow items
- [x] Convert goods inward creation to full-page flow in (flow)/ route group
- [x] Create /warehouse/[warehouse_slug]/(flow)/goods-inward/create full-page component
- [x] Copy goods inward step components to (flow)/goods-inward/ directory
- [x] Update stock flow FAB to navigate to full-page goods inward creation
- [x] View goods inward details page with tabbed layout (Details, Stock Units)
- [x] Create InwardDetailsTab component with sections (Reason, Sender, Destination, Transport, Agent, Notes)
- [x] Create StockUnitsTab component for goods inward with product details
- [x] Update stock-flow page to navigate to goods inward details
- [x] Rename all "shipment" references to "transport" across schema and components
- [x] Add transport fields to goods_inwards table (transport_type, transport_reference_number, transport_details, invoice_amount)
- [ ] Stock units list with warehouse filtering
- [ ] Inventory dashboard with summary cards
- [ ] Stock unit detail and edit

## Phase 8: Iteration 4 - Outward/Barcode Scanning

- [x] Create AddGoodsOutwardSheet component with 2-step flow (scanner → details)
- [x] Implement QRScannerStep with camera scanner using @yudiel/react-qr-scanner
- [x] Add custom overlay with rounded cutout for QR scanner
- [x] Implement flashlight/torch toggle for camera
- [x] Create scanned units list with quantity editing
- [x] Create OutwardDetailsStep with dispatch to and link to options
- [x] Add goods outward form submission using create_goods_outward_with_items function
- [x] Integrate goods outward with stock flow page
- [x] Create SelectInventorySheet for manual stock unit selection
- [x] Create InventoryProductListStep with search and filters (material, color, tags)
- [x] Add "Select from inventory" button in QR scanner
- [x] Convert goods outward creation to full-page flow in (flow)/ route group
- [x] Create /warehouse/[warehouse_slug]/(flow)/goods-outward/create full-page component
- [x] Copy goods outward step components to (flow)/goods-outward/ directory
- [x] Update stock flow FAB to navigate to full-page goods outward creation
- [x] View goods outward details page with tabbed layout (Details, Stock Units)
- [x] Create OutwardDetailsTab component with sections (Reason, Receiver, Source, Transport, Notes)
- [x] Create StockUnitsTab component for goods outward with quantity dispatched
- [x] Update stock-flow page to navigate to goods outward details
- [ ] Create StockUnitSelectionStep to show product's stock units
- [ ] Allow selecting and adding stock units from inventory to outward
- [ ] Stock unit selection with real-time validation
- [ ] Outward cancellation functionality

## Phase 9: Iteration 5 - Sales Orders/Job Work

- [x] Sales orders page UI with month grouping, search, filters (status, products, customers)
- [x] Connect sales orders page to Supabase (fetch orders with customer and product details)
- [x] Display order cards with customer name, products, due date, status badges
- [x] Implement progress bars for in-progress and overdue orders
- [x] Calculate completion percentage from dispatched vs required quantities
- [x] Implement overdue detection (compare due date with current date)
- [x] Support all order statuses (approval_pending, in_progress, overdue, completed, cancelled)
- [x] Create test data script with 10 sales orders spanning 3 months
- [x] Create AddSalesOrderSheet component with 2-step flow (products → details)
- [x] Implement Step 1: Product selection with search and filters (material, color, tags)
- [x] Install shadcn Dialog and Drawer components
- [x] Create ProductQuantitySheet with responsive design (Dialog on desktop, Drawer on mobile)
- [x] Implement quantity input with increment/decrement controls
- [x] Update product buttons to show quantity when selected (primary button with "150 mtr" format)
- [x] Implement Step 2: Order details form (customer, dates, financial details)
- [x] Create OrderDetailsStep component with collapsible Additional Details
- [x] Add customer and agent dropdowns with data from partners table
- [x] Add order date and expected date pickers
- [x] Add advance amount, discount, notes, and file upload fields
- [x] Extract ProductSelectionStep into separate component
- [x] Add progress bar showing step 1/2 and step 2/2
- [x] Add sales order form submission with line items creation
- [x] Create DatePicker component with Calendar integration
- [x] Add useMemo optimization for DatePicker displayValue
- [x] Create date utility functions (dateToISOString, formatDateDisplay)
- [x] Convert sales order creation to full-page flow in (flow)/ route group
- [x] Create /warehouse/[warehouse_slug]/(flow)/sales-orders/create full-page component
- [x] Copy sales order step components to (flow)/sales-orders/ directory
- [x] Update sales orders page FAB to navigate to full-page creation
- [x] View sales order details page with tabbed layout (Details, Products, Outwards)
- [x] Create OrderDetailsTab component with sections (Customer, Agent, Dates, Financial Details, Notes)
- [x] Create ProductsTab component showing line items with fulfillment tracking
- [x] Create OutwardsTab component showing linked goods outward records
- [x] Create Section component for consistent detail display across app
- [x] Create TabUnderline component for tab navigation
- [x] Create reusable utility functions (getPartnerName, getPartnerAddress, formatCurrency, formatAbsoluteDate)
- [x] Create dashboard page with quote card and three sections (Active sales orders, Low stock products, Pending QR codes)
- [x] Implement getDashboardSalesOrders query function (approval_pending and in_progress orders, limit 5)
- [x] Implement getLowStockProducts query function (products below min_stock_threshold, limit 5)
- [x] Implement getPendingQRProducts query function (stock units without QR codes, limit 5)
- [x] Add action buttons to dashboard sales order cards (Approve order, Create outward, Make invoice)
- [x] Add 3-dot dropdown menu to dashboard sales order cards (Mark as complete, Share, Download, Cancel order)
- [x] Display low stock products with warning icon and current stock
- [x] Display pending QR products with pending count
- [x] Update root warehouse page to redirect to dashboard
- [x] Add logout functionality to topbar dropdown menu
- [ ] Fix partners page flickering on filter change (fetch all, filter client-side)
- [ ] Edit sales order functionality
- [ ] Order status workflow transitions (approval_pending → in_progress → completed/cancelled)
- [ ] Real-time fulfillment tracking per warehouse
- [ ] Job work CRUD with raw/finished goods tracking
- [ ] Link outwards/inwards to job work

## Phase 10: Iteration 6 - Barcode Generation/Public Catalog

- [x] QR codes page UI with product filter, batch list, share/download actions
- [x] Connect QR codes page to Supabase (fetch batches with item counts)
- [x] Add dynamic relative date formatting (today, yesterday, this week, this month, on August, 2024)
- [x] Implement share functionality (mobile share sheet, desktop copy link)
- [x] Implement download functionality for batch PDFs
- [x] Update stock units schema (remove qr_code and barcode_generated fields, keep only barcode_generated_at)
- [x] Create QR batch creation RPC function (create_qr_batch_with_items) for atomic operations
- [x] Update migrations to remove qr_code and barcode_generated references
- [x] Create QRProductSelectionStep (Step 1) with search and filters
- [x] Create QRStockUnitSelectionStep (Step 2) with goods inward grouping and collapsible lists
- [x] Create QRTemplateSelectionStep (Step 3) with grouped field selection (Product Info, Stock Unit Info)
- [x] Create CreateQRBatchSheet with 3-step flow and progress bar
- [x] Integrate CreateQRBatchSheet with QR codes page FAB button
- [x] Implement QR status badges (QR pending / QR made on date)
- [x] Add select all functionality for goods inward groups
- [x] Update test setup script to remove barcode_generated field
- [x] Convert QR batch creation to full-page flow in (flow)/ route group
- [x] Create /warehouse/[warehouse_slug]/(flow)/qr-codes/create full-page component
- [x] Copy QR batch step components to (flow)/qr-codes/ directory
- [x] Update QR codes page FAB to navigate to full-page creation
- [ ] Generate QR code images for batches (PDF with customizable fields)
- [ ] Implement batch info page showing all QR codes in batch
- [ ] Add PDF generation with selected template fields
- [ ] Public sales catalog (browsing, cart, checkout)
- [ ] Automatic sales order creation from catalog
- [ ] Catalog configuration (branding, product display settings)

## Phase 11: Mobile & PWA Optimization

- [ ] Mobile-first UI refinement (touch targets, bottom nav, swipe gestures)
- [ ] PWA configuration (manifest, service worker, icons, camera permissions)
- [ ] Performance optimization (lazy loading, image optimization, caching)

## Phase 12: Testing

- [ ] Unit tests (utils, hooks, validations)
- [ ] Integration tests (CRUD operations, workflows)
- [ ] User acceptance testing (admin and staff flows)
- [ ] Device testing (mobile, barcode scanning)

## Phase 13: Deployment

- [ ] Set up production Supabase project
- [ ] Configure Hostinger hosting
- [ ] Production build and optimization
- [ ] Deploy and configure CI/CD
