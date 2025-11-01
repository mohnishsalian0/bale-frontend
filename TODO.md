# Development Plan

## Phase 1: Foundation & Setup
- [x] Initialize Next.js 14+ with TypeScript, Tailwind CSS, App Router
- [x] Set up folder structure (app routes, components, lib, types)
- [x] Install dependencies (react-hook-form, zod, supabase) - shadcn/ui and barcode libs pending
- [x] Configure Supabase client and environment
- [x] Create design system theme from Figma
- [x] Configure Tailwind CSS with theme

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
- [x] Set up protected route middleware for all routes
- [x] Handle redirectTo parameter in auth callback for post-login redirects
- [ ] Create warehouse-scoped routes (/warehouse/[id]/...)
- [ ] Fetch warehouses from Supabase and implement warehouse context/state management

## Phase 4: Core UI Components
- [x] Install and configure shadcn/ui components (button, input, label, form, select, textarea, card, dialog, table, sidebar)
- [x] Configure shadcn with exact Figma color palette (primary, grays, background)
- [x] Implement 3D button effect from Figma design (4px shadow, active state)
- [x] Create tailwind.config.ts for v4 compatibility
- [x] Add border and ring color definitions to @theme
- [x] Create custom icon components (WarehouseIcon wrapper)
- [ ] Build custom components (DataTable, FileUpload, SearchInput, StatusBadge)
- [ ] Create form components with validation (Zod + React Hook Form)

## Phase 5: Iteration 1 - Company/Warehouse/Staff
- [ ] Company profile management
- [ ] Warehouse CRUD (admin only)
- [x] Staff page with 2-column grid layout showing staff cards
- [x] Staff invite form with role selection and warehouse assignment (generates invite link)
- [ ] Send generated invite link via WhatsApp
- [ ] View staff details
- [ ] Edit staff functionality
- [ ] Delete staff functionality

## Phase 6: Iteration 2 - Products/Partners
- [x] Inventory page UI with search, filters (material, color, tags), and product cards
- [x] Connect inventory page to Supabase database (fetch, loading, error states)
- [x] Add product form with typed insert (features & images, stock details, additional details)
- [x] Product images upload (max 5, 2MB each) with preview and remove functionality
- [ ] View product summary with stock units
- [ ] Product detail view showing all attributes
- [ ] Edit product functionality
- [ ] Delete product functionality
- [ ] Stock units list for each product with status and location
- [ ] Bulk actions on stock units (dispatch, mark damaged, etc.)
- [x] Partners page UI with filter tabs, search, and partner cards
- [x] Connect partners page to Supabase database (fetch, loading, error states)
- [x] Add partner form with typed insert (image upload, business details, address, tax details)
- [ ] Edit partner form
- [ ] Delete partner functionality
- [ ] Partner detail view

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
- [ ] View goods inward details page
- [ ] View goods inward stock units page
- [ ] Stock units list with warehouse filtering
- [ ] Inventory dashboard with summary cards
- [ ] Stock unit detail and edit

## Phase 8: Iteration 4 - Outward/Barcode Scanning
- [ ] Add goods outward form (partner or warehouse transfer)
- [ ] View goods outward details page
- [ ] View goods outward stock units page
- [ ] Stock unit selection with real-time validation
- [ ] PWA barcode scanning with camera
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
- [ ] Fix partners page flickering on filter change (fetch all, filter client-side)
- [ ] View sales order details page
- [ ] Edit sales order functionality
- [ ] Order status workflow transitions (approval_pending → in_progress → completed/cancelled)
- [ ] Real-time fulfillment tracking per warehouse
- [ ] Job work CRUD with raw/finished goods tracking
- [ ] Link outwards/inwards to job work

## Phase 10: Iteration 6 - Barcode Generation/Public Catalog
- [ ] Barcode generation (unit selection, field customization, PDF output)
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
