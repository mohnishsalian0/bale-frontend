# Development Plan

## Phase 1: Foundation & Setup
- [x] Initialize Next.js 14+ with TypeScript, Tailwind CSS, App Router
- [x] Set up folder structure (app routes, components, lib, types)
- [x] Install dependencies (react-hook-form, zod, supabase) - shadcn/ui and barcode libs pending
- [x] Configure Supabase client and environment
- [x] Create design system theme from Figma
- [x] Configure Tailwind CSS with theme

## Phase 2: Database & Security
- [x] Design and create database schema (companies, staff, warehouses, products, stock_units, partners, orders, job_works, dispatches, receipts)
- [x] Implement Row Level Security policies (tenant isolation, warehouse scoping, role-based permissions)
- [x] Review and update migration schema (dispatch/receipt types, stock status)
- [x] Create TypeScript database type definitions (enums)
- [x] Initialize Supabase locally (Docker + migrations copied)
- [x] Fix Supabase services startup and verify all containers running
- [x] Get local Supabase credentials (API URL, anon key, service key)
- [x] Update .env.local with credentials
- [x] Fix Tailwind CSS PostCSS configuration (@tailwindcss/postcss)
- [x] Test database connection from Next.js app (test page at /test)
- [x] Generate complete TypeScript types from Supabase schema
- [ ] Apply full 19 migrations from migrations/ folder (currently using 4 from migrations_temp/)
- [ ] Create test seed data (company, user, warehouse)
- [ ] Set up storage buckets for images/files

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
- [x] Install and configure icon libraries (Tabler Icons, Lucide React)
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
- [ ] Set up protected route middleware for all routes
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
- [ ] Staff CRUD with warehouse assignment (admin only)

## Phase 6: Iteration 2 - Products/Partners
- [ ] Product master CRUD with fabric attributes (admin CRUD, staff read)
- [ ] Product images upload (max 5, 2MB each)
- [ ] Partner CRUD (customers, vendors, suppliers, agents)

## Phase 7: Iteration 3 - Receipt/Stock/Inventory
- [ ] Goods receipt form with automatic stock unit creation
- [ ] Stock units list with warehouse filtering
- [ ] Inventory dashboard with summary cards
- [ ] Stock unit detail and edit

## Phase 8: Iteration 4 - Dispatch/Barcode Scanning
- [ ] Goods dispatch form (partner or warehouse transfer)
- [ ] Stock unit selection with real-time validation
- [ ] PWA barcode scanning with camera
- [ ] Dispatch cancellation functionality

## Phase 9: Iteration 5 - Sales Orders/Job Work
- [ ] Sales order CRUD with line items
- [ ] Order status workflow (approval_pending → in_progress → completed/cancelled)
- [ ] Real-time fulfillment tracking per warehouse
- [ ] Job work CRUD with raw/finished goods tracking
- [ ] Link dispatches/receipts to job work

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
