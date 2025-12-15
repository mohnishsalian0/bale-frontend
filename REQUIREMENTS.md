# Fabric Inventory Management System - PRD ## Technical Architecture & Stack

### Core Technology Stack

#### MVP Architecture

- **Frontend**: Next.js with Tailwind CSS (mobile-focused web app)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (JWT-based)
- **File Storage**: Supabase Storage
- **Data Fetching**: TanStack Query (React Query) for caching and state management
- **Deployment**: Hostinger
- **Backend**: Direct Supabase client integration (no custom backend for MVP)

#### Future Architecture (Post-MVP)

- **Backend**: Rust + Axum (as system complexity grows)
- **Deployment**: Railway or Fly.io

#### Public Sales Catalog

- **Framework**: Next.js with Tailwind CSS (integrated with main app)
- **Deployment**: Hostinger

#### Additional Services

- **PDF Generation**: For barcode printing
- **Barcode Generation**: QR codes for stock units
- **Image Processing**: Product image optimization
- **Monitoring**: Built-in Railway/Fly.io analytics
- **Real-time Updates**: Not in Phase 1 (future consideration)

#### Form Validation

- **Library**: Zod + React Hook Form for all forms
- **Validation schemas**: Centralized in `/src/lib/validations/` (domain-specific files)
- **Reusable validators**: Common patterns in `/src/lib/validations/common.ts`
- **TypeScript integration**: Type-safe forms with automatic type inference

### Architecture Decisions

- **Single App Approach**: Admins manage products/inventory through mobile app (no separate web dashboard)
- **Multi-tenant**: Company-based isolation with warehouse-level staff access
- **Role-based Access**: Admin (full access) + Staff (warehouse-specific)
- **Mobile-first**: Primary interface for all inventory operations
- **Collapsible Sidebar**: Icon-only by default, expands on hover for desktop, full-width on mobile

### Routing Architecture

The app uses Next.js App Router with two main route groups for clean separation of public and protected content:

#### (protected)/ - Protected Routes

**Location**: `src/app/(protected)/`

**Layout Features**:

- Handles authentication (redirects to /auth/login if not authenticated)
- Validates warehouse access via RLS
- Provides SessionProvider with warehouse, user, and permissions
- Provides AppChromeProvider for dynamic chrome visibility control
- Conditionally renders chrome (TopBar, BottomNav, Sidebar) based on AppChromeContext
- Supports chrome-less mode for immersive flows (goods inward/outward, sales orders, QR batch creation)

**Routes**:

- `/warehouse` - Warehouse selection page
- `/warehouse/[warehouse_slug]/dashboard` - Dashboard
- `/warehouse/[warehouse_slug]/inventory` - Product catalog
- `/warehouse/[warehouse_slug]/partners` - Partners management
- `/warehouse/[warehouse_slug]/sales-orders` - Sales orders
- `/warehouse/[warehouse_slug]/stock-flow` - Stock flow (inward/outward)
- `/warehouse/[warehouse_slug]/qr-codes` - QR code batches
- `/warehouse/[warehouse_slug]/staff` - Staff management
- `/warehouse/[warehouse_slug]/goods-inward/create` - Create goods inward (chrome-less)
- `/warehouse/[warehouse_slug]/goods-outward/create` - Create goods outward (chrome-less)
- `/warehouse/[warehouse_slug]/qr-codes/create` - Create QR batch (chrome-less)
- `/warehouse/[warehouse_slug]/sales-orders/create` - Create sales order (chrome-less)
- `/company` - Company settings

#### (public)/ - Public Routes

**Location**: `src/app/(public)/`

**Layout Features**:

- Minimal wrapper, no authentication required
- No SessionProvider
- No app chrome

**Routes**:

- `/auth/login` - Login page
- `/auth/callback` - OAuth callback
- `/invite/[code]` - Invite acceptance
- `/company/[slug]/store/products` - Public product catalog
- `/company/[slug]/store/checkout` - Checkout
- `/company/[slug]/order/[order_number]` - Order tracking

#### AppChromeContext

**Location**: `src/contexts/app-chrome-context.tsx`

**Purpose**: Controls visibility of TopBar, BottomNav, and Sidebar dynamically

**Methods**:

- `hideChrome()` - Hides all chrome elements
- `showChromeUI()` - Shows all chrome elements
- `showChrome` - Boolean state

**Usage**: Flow pages (create goods inward, goods outward, QR batches, sales orders) call `hideChrome()` on mount and `showChromeUI()` on unmount for immersive, distraction-free experiences.

#### Public Routes Config

**Location**: `src/lib/auth/public-routes.ts`

**Purpose**: Centralized list of public route patterns

**Functions**:

**Used by**: Middleware for auth checks and route protection

---

## Problem & Opportunity

India's textile industry (₹20.1 lakh crore/$240.8B market) has 96.66% unorganized production flowing through intermediary traders to reach the domestic market (70% of production). These fabric traders lack specialized inventory tools—existing solutions are either too generic (TallyPrime, Vyapar) or too complex (enterprise ERPs). With 2.5 crore traders now eligible for MSME registration, there's a clear digitization opportunity.

### Market Size

- **TAM:** ₹18.5 lakh crore/$222B textile market (growing 11.98% CAGR)
- **SAM:** Fabric trading intermediary layer (70% of domestic production)
- **SOM:** ₹14-70 crore (1-5% penetration of eligible MSME traders)

### Solution

**Vision:** Digitize India's fabric trading ecosystem with purpose-built tools

**Positioning:** "The only inventory management platform designed specifically for fabric - not too simple like generic software, not too complex like enterprise ERP, but just right for fabric"

**Core Value Props:**

- Fabric-specific inventory tracking (roll, color, weight, quality)
- Trading workflow optimization

**Competitive Advantage:**

- **vs Generic Software:** Built for fabric specifications
- **vs Enterprise ERP:** Right-sized complexity and cost
- **vs Textile Apps:** Comprehensive inventory beyond basic transactions

---

## User Research & Personas

### Primary Persona: Embroidery Fabric Trading Business Owner

**Demographics:**

- Role: Owner of embroidery fabric trading business
- Experience: Managing 250+ designs, 15 new designs weekly
- Technology comfort: Moderate (currently uses Excel, Tally, WhatsApp)

**Daily Workflow:**

- Check WhatsApp orders from clients
- Coordinate between fabric suppliers, embroidery masters, and customers
- Track design progress across multiple embroidery units
- Update Excel sheets manually with design codes, quantities, client details
- Physical visits/calls to embroidery masters for work updates

**Responsibilities:**

- Manage 250+ designs with custom design codes and client numbering systems
- Source base fabrics from multiple suppliers
- Coordinate embroidery work (currently: 20 designs total, 4 complete, 5 in pipeline, 10 pending)
- Handle sampling process and client approvals
- Track inventory by meters with fabric specifications (color, design, quantity)

**Pain Points:**

- **Time-consuming coordination:** Regular physical visits/calls to embroidery masters for updates
- **Manual tracking:** Excel-based design codes, color management, client details
- **Stock visibility:** Cannot instantly confirm fabric availability (e.g., "Black 100m, Blue 100m")
- **Work-in-progress tracking:** No real-time visibility of embroidery work status
- **Communication gaps:** Miscommunication with embroidery masters on designs and colors

**Technology Constraints:**

- Current budget range: ₹10-20K (₹1 lakh systems not affordable)
- Wants barcode system but needs it simple for less-educated staff
- Prefers mobile-friendly solutions for field coordination

**User Stories:**

1. "I want to track embroidery work progress without physical visits so I can save time and give accurate delivery dates"
2. "I want instant fabric stock visibility so I can confirm orders immediately when sales team asks"
3. "I want design code management with photos and color charts so embroidery masters don't make mistakes"

### Primary Persona: Sports Fabric Trading Business Owner

**Demographics:**

- Role: Owner of sports fabric trading business (jerseys, sportswear fabrics)
- Experience: Cotton yarn to finished fabric coordination with dyeing houses
- Technology comfort: Basic (uses physical files, TurboTax for billing, no Excel)

**Daily Workflow:**

- Check physical files for order status (ingoing/outgoing files)
- Coordinate dyeing work across 2-5 different dyeing houses
- Manage quality checks and handle damaged/re-dyeing processes
- Track 4000+ rolls (20-25kg each, total ~100 tons)
- Handle customer orders based on current stock availability

**Responsibilities:**

- Manage 4000+ fabric rolls across 20+ categories (Dry Fit, Polo Matte, etc.)
- Coordinate with multiple dyeing houses based on rates, quality, delivery times
- Handle peak season planning (3-4 week rush periods) vs off-season stock building
- Track orders by roll count but price by weight (kg)
- Manage damage, wastage, and re-dyeing processes
- Maintain customer relationships (direct customers, corporate clients)

**Pain Points:**

- **No stock visibility:** Cannot check current inventory during peak seasons
- **Manual file tracking:** Physical files for all inventory management (no digital records)
- **Weight vs roll confusion:** Orders by rolls, pricing by kg, leading to calculation errors
- **Quality issues:** Tracking damaged inventory, re-dyeing decisions, wastage management
- **Supplier coordination:** Managing multiple dyeing houses with different capabilities
- **Customer communication:** Cannot provide instant stock confirmation

**Current Process:**

- Uses WhatsApp and phone calls for all communication
- Creates PO only for high-value orders
- Handles returns through debit notes via accountant
- Uses Tally-like accounting software for basic billing (sales orders, dyeing orders, outstanding tracking)

**User Stories:**

1. "I want real-time stock visibility by weight and roll count so I can confirm orders instantly"
2. "I want to track dyeing house work progress so I can manage delivery commitments better"
3. "I want easy damage/wastage recording with date tracking so I can reduce losses"

### Secondary Persona: Outward Staff

**Demographics:**

- Role: Warehouse and outward handling
- Technology comfort: Basic smartphone usage
- Education: Limited formal education

**Daily Workflow:**

- Handle physical roll movements (50+ rolls daily)
- Update manual outward sheets
- Coordinate with sales team on stock availability
- Process returns and damaged inventory

**Responsibilities:**

- Physical inventory movement and outward
- Manual record keeping on paper
- Customer coordination for walk-in orders
- Basic quality checks during outward

**Pain Points:**

- **Paper-based systems:** Manual outward sheets lead to errors and time loss
- **No instant stock lookup:** Cannot check availability when customers call
- **End-of-day reconciliation:** Time-consuming manual updates to main records
- **Limited technology skills:** Needs very simple interface requiring minimal training

**Technology Requirements:**

- Simple mobile interface for basic operations
- Minimal training required (staff has limited education)
- Budget-friendly solution (not ₹1 lakh enterprise systems)

**User Stories:**

1. "I want simple barcode scanning so I can update stock without paperwork"
2. "I want to check stock quickly when customers ask so I can help them immediately"
3. "I want easy return processing so damaged items are tracked properly"

### Core User Requirements

- **Inventory tracking:** Roll-based with weight/meter options
- **Barcode support:** Essential for accurate stock management
- **Quality management:** Damage, wastage, re-work tracking
- **Supplier coordination:** Multiple dyeing houses/embroiderers
- **Customer updates:** Order status and delivery tracking
- **Pricing flexibility:** Per kg/meter/roll options

## Role-Based Permissions System

### Permission Architecture

**Technology:** Database-driven flexible permission system with dot-path notation and wildcard support

**Key Features:**

- Flexible hierarchical permissions using dot notation (e.g., `inventory.products.read`, `movement.inward.create`)
- Wildcard support for broad grants (e.g., `inventory.*` grants all inventory permissions)
- Greedy wildcard matching (e.g., `movement.*.create` matches `movement.inward.create` and `movement.outward.create`)
- No hardcoded role checks - all permissions stored in database
- Consistent authorization logic between backend (PostgreSQL) and frontend (React)

**Implementation:**

- Backend: PostgreSQL `authorize()` function with backtracking wildcard matcher
- Frontend: React `SessionContext` with `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()` methods
- UI Component: `<PermissionGate>` for conditional rendering based on permissions

### Permission Hierarchy

Permissions are organized hierarchically with the following top-level categories:

**Top Level Resources:**

- `companies.*` - Company management
- `warehouses.*` - Warehouse management
- `users.*` - User/staff management
- `partners.*` - Customer, vendor, supplier, agent management
- `sales_orders.*` - Sales order management
- `job_works.*` - Job work management
- `catalog.*` - Public sales catalog configuration
- `storage.*` - File upload and management

**Grouped Resources:**

- `inventory.*` - Products, stock units, QR batches
  - `inventory.products.*` - Product master CRUD
  - `inventory.stock_units.*` - Stock unit CRUD
  - `inventory.qr_batches.*` - QR batch generation
- `movement.*` - Goods inward and outward
  - `movement.inward.*` - Goods inward operations
  - `movement.outward.*` - Goods outward operations

**Permission Format:**

- Standard CRUD: `{resource}.{action}` (e.g., `products.read`, `partners.create`)
- Nested resources: `{category}.{resource}.{action}` (e.g., `inventory.products.read`, `movement.inward.create`)
- Wildcards: `*` for all, `inventory.*` for all inventory operations

### Role Permissions Matrix

#### Admin Role

- **Permission:** `*` (wildcard - full access)
- **Scope:** All warehouses
- **Access:** Complete system access including company settings, warehouse creation, staff management, and all operational features

#### Staff Role

- **Scope:** Assigned warehouse only (enforced by RLS)
- **Permissions:**
  - **Read-only access:**
    - `inventory.products.read` - View products
    - `partners.read` - View partners
    - `warehouses.read` - View warehouses
    - `users.read` - View users
  - **Warehouse-scoped CRUD:**
    - `inventory.stock_units.*` - Full CRUD on stock units in assigned warehouse
    - `inventory.qr_batches.read`, `inventory.qr_batches.create` - QR code generation
    - `movement.inward.*` - Full CRUD on goods inward
    - `movement.outward.*` - Full CRUD on goods outward
    - `job_works.*` - Full CRUD on job work
    - `sales_orders.read` - View sales orders (read-only)
  - **Utility permissions:**
    - `storage.upload`, `storage.delete` - File management

### Access Control Implementation

**Warehouse Access Control:**

- User-level `all_warehouses_access` flag determines warehouse scope
- Admin users: `all_warehouses_access = true` (access all warehouses)
- Staff users: `all_warehouses_access = false` (access only assigned warehouses via `user_warehouses` table)
- RLS policies automatically filter data based on warehouse access
- Frontend queries respect warehouse filtering via RLS

**Permission Checking:**

- Backend: `authorize('permission.path')` function in RLS policies
- Frontend: `hasPermission('permission.path')` in React components
- UI: `<PermissionGate permission="permission.path">...</PermissionGate>`

**Example Usage:**

```tsx
// Single permission
<PermissionGate permission="inventory.products.create">
  <Button>Create Product</Button>
</PermissionGate>

// Multiple permissions (OR logic)
<PermissionGate permission={['sales_orders.read', 'sales_orders.create']}>
  <OrdersPage />
</PermissionGate>

// Multiple permissions (AND logic)
<PermissionGate
  permission={['inventory.products.read', 'inventory.products.update']}
  requireAll
>
  <EditProductForm />
</PermissionGate>
```

### Permission Management

**Adding New Permissions:**

1. Add permission to `supabase/migrations/0031_rbac_seed_data.sql`
2. Assign to appropriate roles in same migration file
3. Run database migration
4. Use permission in RLS policies and frontend code

**Wildcard Benefits:**

- Simplifies role management (admin gets `*` instead of hundreds of individual permissions)
- Easy to grant access to entire modules (e.g., `inventory.*` for all inventory features)
- Flexible permission patterns (e.g., `movement.*.create` for both inward and outward creation)

**Legend:**

- ✅ = Permitted (has required permission)
- ❌ = Not Permitted (missing permission)
- 🔒 = Warehouse-scoped (filtered by RLS based on user's warehouse access)

---

## Feature Specifications

### 1. Company & User Management

#### 1.1 Company Setup

**Feature Description:** Multi-tenant company management with hierarchical access control

**Specifications:**

**Company Registration**

- **Company Details:**
  - Company Name (required, 100 chars)
  - Complete Address (structured fields)
  - Business type (optional)
  - Logo (optional) max 1 image, 2MB)
  - GST number (optional) - under more information
  - PAN number (optional) - under more information

**Audit information:**

- Unique ID (unique and auto-generated in backend)
- Created on (date, time and generated in backend)
- Updated on (date, time and generated in backend)
- Created by (id of user who created the record)
- Modified by (id of user who last modified the record)
- Deleted at (date, time and generated in backend)

**Business Rules**

- One company = One tenant with multi tenant strategy
- Company admin has full system access
- All other entities (staff, warehouse, partners) belong to company

#### 1.2 Staff Management

**Feature Description:** Role-based staff management with single warehouse assignment and company admin control

**Staff Creation (Company Admin Only)**

- **Personal Information:**
  - First & Last Name (required)
  - Phone Number (required, unique within company)
  - Profile image
  - Additional note
- **Access Control:**
  - Single Warehouse Assignment (selected by Company Admin)
  - Set of features will be pre-determined as per role
- **Audit information**
  - Unique ID (unique and auto-generated in backend)
  - Created on (date, time and generated in backend)
  - Updated on (date, time and generated in backend)
  - Created by (id of user who created the record)
  - Modified by (id of user who last modified the record)
  - Deleted at (date, time and generated in backend)

**Warehouse Assignment Rules**

- Staff is assigned to exactly one warehouse by Company Admin
- Staff cannot create or switch warehouses
- Staff can only access their assigned warehouse
- Warehouse reassignment requires Company Admin intervention
- All staff operations are limited to their assigned warehouse scope

**Role-Based Permissions**

- **Company Admin:** Full system access, warehouse creation, staff management
- **Staff:** Basic warehouse operations like goods outward, goods inward and job work within assigned warehouse

### 2. Warehouse Management

#### 2.1 Warehouse Configuration

**Feature Description:** Single-location inventory management with basic location tracking

**Specifications:**

**Warehouse Setup (Company Admin Only)**

- **Basic Information:**
  - Warehouse Name (required)
  - Complete Address (structured fields)
  - Staff Assignment (from staff list - must be assigned to this warehouse)
- **Audit information**
  - Unique ID (unique and auto-generated in backend)
  - Created on (date, time and generated in backend)
  - Updated on (date, time and generated in backend)
  - Created by (id of user who created the record)
  - Modified by (id of user who last modified the record)
  - Deleted at (date, time and generated in backend)

**Business Rules**

- Only Company Admin can create/modify warehouses
- Staff operations automatically restricted to their assigned warehouse
- All stock movements auto-tagged with staff's assigned warehouse
- Inter-warehouse transfers require outward to yourself which you from the list of options in outward form (If self is selected, then an option to select warehouse appears)

### 3. Product Master & Inventory Hierarchy

#### 3.1 Product Master

**Feature Description:** Central product catalog with fabric-specific attributes (Company-wide, warehouse-neutral)

**Specifications:**

**Product Creation (Company Admin Only)**

- **Identity Fields:**
  - Product Name (required, design name)
  - Product Number (auto-generated: PROD-{SEQUENCE})
  - Show on Catalog (toggle, default: true)
- **Fabric Specifications:**
  - Material (optional, dropdown: Cotton, Polyester, Silk, Blend, Custom)
  - Color (optional, predefined colors + custom RGB picker)
  - GSM (optional, numeric 50-500)
  - Thread count (optional, in cms)
  - Tags (multi-select for categorization)
- **Stock Information:**
  - Measuring Unit (required: Meters, Yards, KG, Pieces)
  - Cost Price Per Unit (optional, for margin calculation)
  - Selling Price Per Unit (optional, for quotations)
  - Product Images (max 5 images, 2MB each)
  - Min Stock Alert (toggle + threshold value)
- **Additional Information:**
  - HSN Code (optional, GST compliance)
  - Notes
- **Audit information**
  - Unique ID (unique and auto-generated in backend)
  - Created on (date, time and generated in backend)
  - Updated on (date, time and generated in backend)
  - Created by (id of user who created the record)
  - Modified by (id of user who last modified the record)
  - Deleted at (date, time and generated in backend)

**Access Restrictions:**

- Staff: View-only access to product master
- Cannot create, edit, or delete products
- Can view product details for operational purposes only

**Business Rules**

- Product Number unique across company (all warehouses)
- Color validation: Standard names + hex codes for custom colors
- Cannot delete product if stock units exist in any warehouse
- Product modifications don't affect existing stock units

#### 3.2 Stock Units

**Feature Description:** Individual unit tracking with barcode management (Warehouse-specific)

**Specifications:**

**Inventory Control Business Rules**

- **Stock Entry**: Stock units can ONLY be added to inventory via Goods Inward process
- **Stock Removal**: Stock units can ONLY be removed from inventory via Goods Outward process
- **Traceability**: Every stock unit must be linked to its originating goods inward (created_from_inward_id)
- **Special Case Inwards**: For opening stock, adjustments, and manual additions, use link_type = 'other' with descriptive other_reference (e.g., "Opening Stock - System Setup", "Stock Adjustment - Found Inventory")

**Unit Creation Methods**

- Automatic Creation: From goods inward items (creates individual stock units equal to quantity_received)
- System-assigned to receiving warehouse

**Unit Information**

- **Identity:**
  - Unit Number (auto: {PRODUCT_NUMBER}-SU{SEQUENCE})
  - QR Code (auto-generated by Unit number)
  - Date of Creation/Inward
  - Assigned Warehouse (auto-filled from staff assignment)
  - Status (In inventory, outwarded, is auto filled based on goods inward/outward created)
- **Physical Specifications:**
  - Size/Quantity (in product measuring unit)
  - Wastage (optional, same unit as size)
- **Location Tracking:**
  - Location Description (free-form text field, e.g., "Section A Rack 5", "Left Corner")
- **Additional Information:**
  - Barcode generated (boolean, default false, auto updates when barcode is generated for this stock unit)
  - Barcode generated at (time, auto updates when barcode is generated for this stock unit)
  - Quality Grade (custom text field with auto-suggestions from previously used values)
  - Notes
- **Audit information**
  - Unique ID (unique and auto-generated in backend)
  - Created on (date, time and generated in backend)
  - Updated on (date, time and generated in backend)
  - Created by (id of user who created the record)
  - Modified by (id of user who last modified the record)
  - Deleted at (date, time and generated in backend)

**Business Rules**

- All units automatically tagged with creating staff's assigned warehouse
- **Inventory Control**: Stock units can only be added via Goods Inward and removed via Goods Outward
- **Complete Traceability**: Every stock unit must reference its creating goods inward for audit trail
- **No Direct Stock Manipulation**: Users cannot manually add/remove stock units outside of inward/outward workflows

### 4. Sales Order Management with Real-time Linking

#### 4.1 Sales Order Creation & Management

**Feature Description:** Customer order management with real-time fulfillment tracking (Warehouse-specific operations)

**Specifications:**

**Sales Order Creation Access:**

- **Owner:** Can create sales orders via both Sales Catalog (public interface) and Inventory App (internal system)
- **Sales Staff/Customers:** Can create sales orders only via Sales Catalog (public interface)
- Both methods link to same underlying sales order system

**Order Header**

- **Order Information:**
  - Order Number (auto: SO-{SEQUENCE})
  - Customer (required, from Partners with type=Customer)
  - Agent (optional, from Partners with type=Agent)
  - Order Date (required, default: today)
  - Expected Delivery Date (optional, can be set during order processing)
  - Fulfillment Warehouse:
    - **Sales Catalog orders:** No warehouse assignment (owner can assign later if needed)
    - **Inventory App orders:** Auto-assigned from owner's warehouse

**Order Line Items**

- **Product Selection:**
  - Product (searchable dropdown from product master)
  - Required Quantity (in product measuring unit)
  - Unit Rate (optional, from product master)
  - Line Total (auto-calculated)
- **Additional Information:**
  - Advance amount
  - Discount (percentage value 0-100%)
  - Notes
  - Attachments
- **Fulfillment Tracking:**
  - **For Inventory App orders (with warehouse assignment):**
    - Order Request Quantity (from assigned warehouse stock only)
    - Outwarded Quantity (from this warehouse)
    - Pending Quantity (auto-calculated: Order Request Quantity - Outwarded Quantity)
    - Total Completion in % (auto-calculated: (Outwarded Quantity/ Order Request Quantity) \*100)
  - **For Sales Catalog orders (no warehouse assignment):**
    - Shows aggregate stock across all warehouses
    - No automatic reservation until warehouse is assigned by owner
- **Audit information**
  - Unique ID (unique and auto-generated in backend)
  - Created on (date, time and generated in backend)
  - Updated on (date, time and generated in backend)
  - Created by (id of user who created the record)
  - Modified by (id of user who last modified the record)
  - Deleted at (date, time and generated in backend)

**Staff Access Controls:**

- **Sales Staff (Sales Catalog):** Can create orders without warehouse restrictions, no stock reservation capability
- **Owner (Inventory App):** Can create orders for their assigned warehouse with full stock management
- **Owner (Sales Catalog):** Can create orders without warehouse restrictions (same as sales staff)

**Business Rules**

- Cannot confirm order without customer details
- Expected delivery date is optional during order creation, can be updated during processing
- **For Sales Catalog orders:** No automatic stock reservation until warehouse assigned
- Order completion requires 100% outward from assigned warehouse or manual override
- Cancellation releases all reservations within warehouse
- Owner can contact customer if fulfillment issues arise with Sales Catalog orders

#### 4.2 Sales Order Dashboard & Tracking

**Specifications:**

**Order Management Interface List View (Warehouse-Filtered):**

- Auto-filtered to show only orders for the warehouse admin is logged into and auto assigned for staff
- Filter by status (approval_pending, in_progress, completed, cancelled), customer, product, agent
- Sort by order date

**Order Status Workflow:**

- **approval_pending** - Initial status for all new orders, awaiting owner approval
- **in_progress** - Order approved and being fulfilled
- **completed** - Order fully outwarded and delivered (requires completion notes)
- **cancelled** - Order cancelled by customer or owner (requires cancellation reason)

**Status Change Tracking:**

- **status_changed_at** - Timestamp when status was changed to completed/cancelled
- **status_changed_by** - User who changed the status
- **status_notes** - Completion notes (for completed) or cancellation reason (for cancelled)
- Full audit trail of status changes with efficient single-field design

**Detail View:**

- Complete order information
- Real-time fulfillment status (warehouse-specific)
- Linked job works and outwards (from assigned warehouse)

**Sales Order Details Page:**

- **Layout**: Tabbed interface with "Order details", "Products", and "Outwards" tabs
- **Header**: SO-{sequence_number} title with order date subtitle, status badge, and progress bar (for in_progress/overdue orders)
- **Details Tab Sections**:
  - Products: List of line items with product images, name, required quantity, unit rate, line total, fulfillment tracking (outwarded quantity, pending quantity)
  - Customer: Customer name with initials, address, phone number, email (using flex justify-between format)
  - Agent: Agent name with initials (conditionally shown if agent_id exists)
  - Order Date: Formatted absolute date
  - Expected Date: Formatted absolute date (conditionally shown if expected_delivery_date exists)
  - Financial Details: Advance amount, discount, payment terms (conditionally shown if any financial details exist)
  - Notes: Order notes
- **Outwards Tab**: List of linked goods outward records with GO-{number}, date, outward type, destination, and clickable navigation

**Audit Information**

- Unique ID (auto-generated in backend)
- Created on (date, time, auto-generated)
- Updated on (date, time, auto-generated)
- Created by (user ID)
- Modified by (user ID)
- Deleted at (soft delete timestamp)

#### 4.3 Quick Sales Order Creation

**Feature Description:** Streamlined order fulfillment for walk-in customers who place orders and collect items immediately from the store/warehouse

**Use Case:**

- Handle walk-in customers who visit the warehouse/store in person
- Complete the entire order-to-delivery process in a single transaction
- Creates both sales order and goods outward together atomically
- Ideal for immediate pickup scenarios where customers don't need installment deliveries

**Key Difference from Regular Orders:**

- Regular orders: Created first, then fulfilled via separate goods outward over time (installment deliveries)
- Quick sales: Sales order and goods outward created together with status 'completed'

### 5. Partner Management

#### 5.1 Partner Master

**Feature Description**: Comprehensive partner management for customers, suppliers, vendors, and agents

**Specifications:**

**Primary Information**

- Partner ID (auto-generated unique identifier)
- First & Last Name (required)
- Company Name (optional)
- Phone Number (required, unique within company)
- Partner Type (required: Customer, Supplier, Vendor, Agent)
- GST Number (optional, tax identification)
- PAN Number (optional, tax identification)

**Address Information**

- Address Line 1 (optional, warehouse number, street)
- Address Line 2 (optional, locality, area)
- City (optional)
- State (optional)
- Country (optional)
- Pin Code (optional)

**Additional Information**

- Notes (additional information)

**Audit Information**

- Unique ID (auto-generated in backend)
- Created on (date, time, auto-generated)
- Updated on (date, time, auto-generated)
- Created by (user ID)
- Modified by (user ID)
- Deleted at (soft delete timestamp)

**Business Rules**

- Partner types can only have one selection
- Phone number must be unique within company
- GST and PAN basic validation for Indian businesses

### 6. Purchase Order Management

#### 6.1 Purchase Order Creation & Management

**Feature Description:** Supplier order management with procurement tracking and goods inward integration (Warehouse-specific operations)

**Specifications:**

**Purchase Order Creation Access:**

- **Company Admin:** Can create purchase orders via Inventory App
- Both creation and approval require admin privileges
- Purchase orders automatically link to goods inward for received materials

**Order Header**

- **Order Information:**
  - Order Number (auto: PO-{SEQUENCE})
  - Supplier (required, from Partners with type=Supplier)
  - Agent (optional, from Partners with type=Agent for broker/intermediary)
  - Order Date (required, default: today)
  - Expected Delivery Date (optional, can be set during order processing)
  - Warehouse (auto-assigned from admin's warehouse)

**Order Line Items**

- **Product Selection:**
  - Product (searchable dropdown from product master)
  - Required Quantity (in product measuring unit)
  - Unit Rate (optional, typically from product cost price)
  - Line Total (auto-calculated)
- **Additional Information:**
  - Advance Amount (payment made upfront to supplier)
  - Discount (percentage or flat amount)
  - Payment Terms (NET 15/30/45/60/90, Cash on delivery)
  - Supplier Invoice Number (for completed orders)
  - Notes
  - Attachments
- **Receipt Tracking:**
  - Required Quantity (materials ordered from supplier)
  - Received Quantity (materials actually received via goods inward)
  - Pending Quantity (auto-calculated: Required Quantity - Received Quantity)
  - Total Completion in % (auto-calculated: (Received Quantity / Required Quantity) \* 100)
- **Audit information**
  - Unique ID (unique and auto-generated in backend)
  - Created on (date, time and generated in backend)
  - Updated on (date, time and generated in backend)
  - Created by (id of user who created the record)
  - Modified by (id of user who last modified the record)
  - Deleted at (date, time and generated in backend)

**Staff Access Controls:**

- **Company Admin:** Full CRUD on purchase orders for all warehouses
- **Staff:** Read-only access to purchase orders for assigned warehouse
- Purchase orders created within warehouse scope
- Receipt tracking limited to assigned warehouse

**Business Rules**

- Cannot create purchase order without supplier details
- Expected delivery date is optional during creation, can be updated during processing
- Order completion requires 100% receipt via goods inward or manual override
- Cancellation releases all pending quantities
- Goods inward can be linked to purchase orders for automatic receipt tracking
- Payment terms help track supplier payment obligations

#### 6.2 Purchase Order Dashboard & Tracking

**Specifications:**

**Order Management Interface List View (Warehouse-Filtered):**

- Auto-filtered to show only orders for the warehouse admin is logged into
- Filter by status (approval_pending, in_progress, completed, cancelled), supplier, product, agent
- Sort by order date
- Search by PO number, supplier name, or product

**Order Status Workflow:**

- **approval_pending** - Initial status for all new purchase orders, awaiting approval
- **in_progress** - Order approved and materials being received
- **completed** - Order fully received and processed (requires completion notes)
- **cancelled** - Order cancelled (requires cancellation reason)

**Status Change Tracking:**

- **status_changed_at** - Timestamp when status was changed to completed/cancelled
- **status_changed_by** - User who changed the status
- **status_notes** - Completion notes (for completed) or cancellation reason (for cancelled)
- Full audit trail of status changes with efficient single-field design

**Detail View:**

- Complete order information
- Real-time receipt status (warehouse-specific)
- Linked goods inwards (from assigned warehouse)
- Financial breakdown (subtotal, discount, GST, total)

**Purchase Order Details Page:**

- **Layout**: Tabbed interface with "Details" and "Inwards" tabs
- **Header**: PO-{sequence_number} title with order date subtitle, status badge, and progress bar (for in_progress orders)
- **Details Tab Sections**:
  - Products: List of line items with product images, name, required quantity, received quantity, pending quantity, unit rate, line total
  - Supplier: Supplier name with initials, address, phone number (using flex justify-between format)
  - Agent: Agent name with initials (conditionally shown if agent_id exists)
  - Payment Details: Advance amount, discount, payment terms, GST breakdown, total amount
  - Warehouse: Receiving warehouse details
  - Important Dates: Order date, expected delivery date
  - Supplier Invoice: Supplier invoice number (conditionally shown if exists)
  - Notes: Order notes
  - Status Notes: Completion notes or cancellation reason (conditionally shown for completed/cancelled orders)
- **Inwards Tab**: List of linked goods inward records with GI-{number}, date, inward type, source, and clickable navigation

**Audit Information**

- Unique ID (auto-generated in backend)
- Created on (date, time, auto-generated)
- Updated on (date, time, auto-generated)
- Created by (user ID)
- Modified by (user ID)
- Deleted at (soft delete timestamp)

**Integration with Goods Inward:**

- Goods inward can be linked to purchase orders (inward_type='purchase_order')
- Received quantities automatically update from linked goods inward
- Helps track procurement vs actual receipt
- Supports partial receipts over multiple goods inward transactions

### 7. Job Work Management

#### 7.1 Job Work Order Processing

**Feature Description**: Job work coordination with goods outward and inward integration but without sales order integration

**Specifications:**

**Job Work Header**

- Job Work Number (auto-generated) (auto: JW-{SEQUENCE}))
- Job Type (required, custom text field with auto-suggestions from previously used values - e.g., "Dyeing", "Embroidery", "Printing", "Stitching", "Block Printing", "Digital Printing", etc.)
- Vendor (required, from Partners with type=Vendor as filter and free to choose other partners by changing filter)
- Agent (optional, from Partners with type=Agent)
- Start Date (required)
- Due Date (optional, can be set during job work processing)
- Sales Order (optional link, for reference only)
- Notes (additional information)
- Add files (attachments for job work documents)

**Raw Material Specification**

- Raw material is NOT reserved from inventory but highlighted in inventory
- Raw material Required Quantity (from assigned warehouse stock only)
- Raw material Outwarded Quantity (from this warehouse)
- Raw Pending Quantity (auto-calculated: Raw material Required Quantity - Outwarded Quantity)

**Finished Goods Specification**

- Finished Goods Request Quantity (from assigned warehouse stock only)
- Finished Goods Received Quantity (from this warehouse)
- Finished Goods Pending Quantity (updated via linked goods inward)
- Finished Goods Pending Quantity (auto-calculated: Finished goods Request Quantity - Received Quantity)
- Total Completion in % (auto-calculated: (Finished Goods Received Quantity/ Finished Goods Request Quantity) \*100)

**Linked Transactions**

- Goods Outward List (raw materials sent to vendor)
- Goods Inward List (finished goods received from vendor)

**Job Work Status Workflow**

- **in_progress** - Default status, work is active with vendor
- **completed** - Job work finished, goods received back (requires completion notes)
- **cancelled** - Job work cancelled before completion (requires cancellation reason)

**Status Change Tracking:**

- **status_changed_at** - Timestamp when status was changed to completed/cancelled
- **status_changed_by** - User who changed the status
- **status_notes** - Completion notes (for completed) or cancellation reason (for cancelled)
- Full audit trail of status changes with efficient single-field design

**Communication Features**

- Option to call/message vendor directly from job work
- Share job work status with vendor/team
- Mark job work as complete
- Cancel job work if needed

**Audit Information**

- Unique ID (auto-generated in backend)
- Created on (date, time, auto-generated)
- Updated on (date, time, auto-generated)
- Created by (user ID)
- Modified by (user ID)
- Deleted at (soft delete timestamp)

**Staff Access Controls**

- Job works created within assigned warehouse scope
- Raw materials and finished goods linked to assigned warehouse
- Cannot access job works from other warehouses

**Business Rules**

- Raw material quantities are not allocated from inventory only highlighted
- Pending quantities update based on actual goods outward/inward transactions
- Job work can exist independently without sales order linkage

### 8. Inventory Movement System

#### 8.1 Goods Outward

**Feature Description**: Comprehensive outward inventory management with flexible linking

**Specifications:**

**Outward Header**

**Outward Type Selection (required)**

- Outward Type (radio buttons: "Outward to Partner" or "Transfer to Warehouse")

**Recipient Configuration (based on outward type)**

- **For Partner Outward:**
  - Partner (required dropdown from partners list - customers, vendors, suppliers)
  - Agent (optional dropdown from partners with type=Agent)
- **For Warehouse Transfer:**
  - Destination Warehouse (required dropdown excluding current warehouse)
  - Agent field not applicable (hidden/disabled)

**Transaction Linking**

- Link to (radio options: sales order, job work, other)
- Sales Order (optional link to system sales order)
- Job Work (optional link to system job work)
- Other (custom reference with text field for description - e.g., "Sample outward", "Return goods", "Emergency stock")

**Outward Details**

- Date (required, date of outward)
- Expected Delivery Date (optional, expected delivery date)
- Transport Type (optional, dropdown: road, rail, air, sea, courier)
- Transport Reference Number (optional, LR number, tracking ID, invoice number)
- Invoice Amount (optional, total invoice amount)
- Transport Details (optional, free-form text for vehicle details, driver info, etc.)
- Notes (additional information)
- Add files (attachments for invoices and documents)

**Items List**

- Stock Units (either barcode scanned or selected from list)
- Real-time stock validation (assigned warehouse only)
- Unit status updates upon outward

**PWA Barcode Scanning**

- Camera-based barcode scanning (PWA capability)
- Continuous scanning with running totals

**Staff Access Controls**

- Can only outward from assigned warehouse inventory
- Barcode scanning limited to assigned warehouse units
- All outward documentation auto-tagged with warehouse

**Audit Information**

- Unique ID (auto-generated in backend)
- Created on (date, time, auto-generated)
- Updated on (date, time, auto-generated)
- Created by (user ID)
- Modified by (user ID)
- Deleted at (soft delete timestamp)

**Business Rules**

- Stock units automatically marked as outwarded
- Inventory levels updated in real-time
- Linked job work raw material pending quantities updated
- Cannot outward units not in assigned warehouse
- **Outward Type Validation:**
  - Partner outward requires valid partner selection, warehouse field must be null
  - Warehouse transfer requires valid destination warehouse, partner field must be null
  - Agent can only be assigned for partner outward type
  - Cannot transfer to the same warehouse (system validation)
- **Database Integrity:**
  - Mutually exclusive recipient fields enforced by database constraints
  - All outward records must specify outward_type ('partner' or 'warehouse')
  - Real-time validation prevents invalid field combinations

**Outward Cancellation/Reversal Process:**

- Outward records remain as permanent historical records
- Cancellation marks outward as `is_cancelled = true` with timestamp and reason
- Automatic reversal of stock unit status (back to available)
- Real-time inventory level restoration
- Linked job work pending quantities adjustment
- Linked sales order pending quantities adjustment
- Audit trail: cancelled_by, cancelled_at, cancellation_reason
- Notification to relevant parties (owners/customer/vendor)

**Outward Details Page:**

- **Layout**: Tabbed interface with "Outward details" and "Stock units" tabs
- **Header**: GO-{sequence_number} title with outward date subtitle
- **Details Tab Sections**:
  - Reason for Outward: Shows linked sales order (SO-{number}), job work (JW-{number}), or other reason with appropriate icon
  - Receiver: Partner or warehouse details with address and initials/warehouse icon
  - Source Warehouse: Outward source with full address
  - Transport: Transport type icon, reference number, expected delivery, invoice amount, transport details (using flex justify-between format)
  - Notes: Outward notes
- **Stock Units Tab**: List of dispatched stock units with product images, SU-{number}, quantity dispatched

#### 8.2 Goods Inward

**Feature Description**: Comprehensive inward inventory management with automatic unit creation

**Specifications:**

**Inward Header**

- Inward Type (radio buttons: "From Partner" or "From Warehouse")
- **For Partner Inward:**
  - Partner (required, sender of goods)
  - Agent (optional, broker for this deal)
- **For Warehouse Transfer:**
  - Source Warehouse (required dropdown excluding current warehouse)
  - Agent field not applicable
- Link to (radio options: job work, sales return, other)
- Job Work (optional link to system job work)
- Sales Order (optional link for sales return type)
- Other (custom reference with text field for description - e.g., "Opening stock", "Purchase", "Damaged goods replacement")
- Date (required, date of arrival)
- Expected Delivery Date (optional, expected delivery date)
- Transport Type (optional, dropdown: road, rail, air, sea, courier)
- Transport Reference Number (optional, LR number, tracking ID, invoice number)
- Invoice Amount (optional, total invoice amount)
- Transport Details (optional, free-form text for vehicle details, driver info, etc.)
- Notes (additional information)
- Add files (attachments for invoices and documents)

**Stock Units Creation**

- User directly creates stock units with complete details (size, quality grade, location, etc.)
- Each stock unit created with full specifications during inward process
- If multiple units have identical details, user can specify quantity to create multiple at once
- Stock units created with status as 'in_stock'
- All units automatically linked to this goods inward via created_from_inward_id

**Staff Access Controls**

- All inwards automatically assigned to staff's warehouse
- Cannot create inwards for other warehouses
- Unit creation limited to assigned warehouse scope

**Update stock units in case of discrepancy**

- Add stock units. Creates new units with unique number and status 'Received'
- Remove stock units. The removed unit status will be updated to 'Removed'

**Audit Information**

- Unique ID (auto-generated in backend)
- Created on (date, time, auto-generated)
- Updated on (date, time, auto-generated)
- Created by (user ID)
- Modified by (user ID)
- Deleted at (soft delete timestamp)

**Business Rules**

- All received units auto-assigned to staff's warehouse
- Linked job work finished goods pending quantities updated
- Real-time inventory updates within warehouse scope
- Stock units created ONLY for physically received items
- Barcode generation limited to actual received units
- Real-time inventory updates reflect only actual received stock
- **Inward Type Validation:**
  - Partner inward requires valid partner selection, from_warehouse field must be null
  - Warehouse transfer requires valid source warehouse, partner field must be null
  - Agent can only be assigned for partner inward type
  - Cannot transfer from the same warehouse (system validation)
- **Database Integrity:**
  - Mutually exclusive source fields enforced by database constraints
  - All inward records must specify inward_type ('job_work', 'sales_return', or 'other')

**Inward Details Page:**

- **Layout**: Tabbed interface with "Inward details" and "Stock units" tabs
- **Header**: GI-{sequence_number} title with inward date subtitle
- **Details Tab Sections**:
  - Reason for Inward: Shows linked job work (JW-{number}), sales return (SO-{number}), or other reason with appropriate icon
  - Sender: Partner or warehouse details with address and initials/warehouse icon
  - Inward Destination: Warehouse receiving goods with full address
  - Transport: Transport type icon, reference number, expected delivery, invoice amount, transport details (using flex justify-between format)
  - Agent: Conditionally shown if agent_id exists
  - Notes: Inward notes
- **Stock Units Tab**: List of created stock units with product images, SU-{number}, initial quantity with unit

### 9. Barcode Generation System

#### 9.1 Barcode Generation Workflow

**Feature Description**: Comprehensive barcode generation with customization and batch printing

**Specifications:**

**Unit Selection Interface**

**Selection Criteria:**

- Bulk select all units without barcodes generated
- Search for product by name or number
- Filter by material, color, tags
- Select product to see stock units grouped by goods inward
- Individual/bulk unit selection from list

**Selection Methods:**

- Units grouped by Goods inward and sorted by latest to earliest
- Select All Units Without Barcodes (warehouse-filtered)
- Goods inward wise bulk selection
- Manual individual selection

**Fields Selection and Preview**

**Field Selection Options:**

- Select which fields to display on barcode (product name, unit number, size, etc.)
- Preview barcode with selected fields for single item

**Print Format**

**Print Layout:**

- Fixed format with 10-20 barcodes per A4 sheet
- Dashed reference lines for cutting guidance
- Optimized for sticky paper printing
- Professional formatting for easy application

**Output Options:**

- Save as PDF for printing
- Email PDF directly to specified address
- WhatsApp sharing capability

**Post-Generation Workflow**

**Physical Application:**

- Print barcodes on sticky paper
- Cut along dashed reference lines
- Attach to individual fabric rolls/units

**Digital Updates:**

- Scan barcode to open stock unit information
- Edit unit details (size, wastage, manufacturing date, notes)
- Real-time updates to inventory system
- Mobile-optimized scanning interface

**Staff Access Controls**

- Warehouse filter automatically applied to assigned warehouse
- Cannot generate barcodes for other warehouse units
- All generation activities logged per warehouse

**Audit Information**

- Unique ID (auto-generated in backend)
- Created on (date, time, auto-generated)
- Updated on (date, time, auto-generated)
- Created by (user ID)
- Modified by (user ID)
- Deleted at (soft delete timestamp)

**Business Rules**

- Barcode generation limited to assigned warehouse units
- Generated barcodes immediately marked in system
- Templates can be saved for consistent formatting
- Batch tracking for generation history

### 10. Public Sales Catalog

Based on the specifications provided, here's how I would divide this into 2 distinct features:

#### 10.1 Catalog Management System

**Feature Description**: Admin-controlled catalog creation and content management system

**Admin Functions:**

- **Catalog Setup & Configuration**
  - Branding setup- font, logo & color & fav icon
  - Product information configuration- which fields to show
- **Product Selection & Organization**
  - Users can group related products into a set (e.g., by variant type such as color, material, custom property) and assign a specific value to each product within that group
- **Search & Filter**
  - Filter options (material, color, price range)
  - Search (name & product number)
  - Sort (alphabetical, price)

#### 10.2 Public Sales Catalog Interface

**Feature Description**: Customer-facing product catalog with complete ordering capabilities

**Customer Functions:**

- **Product Browsing & Discovery**
  - Browse products without login requirement
  - Search functionality for product names/codes
  - Filter by material, color
  - View real-time stock availability across warehouses
  - Product comparison capabilities
- **Shopping Experience**
  - Add products to cart with quantity selection
  - Cart management (modify quantities, remove items)
- **Order Creation & Checkout**
  - Customer information capture (name, phone, address)
  - Required legal agreements (terms, return policy, privacy policy)
- **Order Processing & Communication**
  - Automatic Sales Order creation in backend system with approval_pending status
  - Order Number generation (SO-{SEQUENCE})
  - Notification to owner

**Integration Features:**

- Automatic sales order generation in backend
- Public domain accessibility with shareable links

---

## UI/UX Design Patterns & Components

### Detail Page Architecture

**Common Pattern for Detail Pages:**
All entity detail pages (Sales Orders, Goods Inward, Goods Outward and others) follow a consistent architecture:

**Layout Structure:**

- **Container**: `max-w-3xl` width with `border-r border-border` for clean separation
- **Header Section**: Entity number (SO-/GI-/GO-{sequence_number}) with subtitle, status badges, and progress bars where applicable
- **Tab Navigation**: TabUnderline component with smooth animation and active state indication
- **Tab Content**: Scrollable content area with sections

### Utility Functions Library

Utility function in `@/lib/utils/`
