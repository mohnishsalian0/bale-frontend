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
- [ ] Fix Supabase services startup and verify all containers running
- [ ] Get local Supabase credentials (API URL, anon key, service key)
- [ ] Update .env.local with credentials
- [ ] Access Supabase Studio UI (localhost:54323) and verify migrations
- [ ] Test database connection from Next.js app
- [ ] Create test seed data (company, user, warehouse)
- [ ] Generate complete TypeScript types from Supabase schema
- [ ] Set up storage buckets for images/files

## Phase 3: Authentication & Core Layout
- [ ] Build auth system (login/register with Supabase Auth)
- [ ] Create role detection (Admin vs Staff)
- [ ] Set up protected route middleware and authorization helpers
- [ ] Build base layouts (dashboard, mobile navigation)

## Phase 4: Core UI Components
- [ ] Install and configure shadcn/ui components
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
