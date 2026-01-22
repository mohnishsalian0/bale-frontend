# Fabric Inventory Management System - Development Guide

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: Hostinger
- **Future**: Rust + Axum backend (post-MVP)

## Key Architecture

### Multi-Tenancy

- Company = Tenant (complete isolation)
- **Admin**: Full access to all warehouses
- **Staff**: Limited to assigned warehouse only

### Access Hierarchy

```
Company
├── Warehouses (multiple)
├── Staff (assigned to 1 warehouse)
├── Products (company-wide)
├── Partners (Customers, Vendors, Suppliers, Agents)
└── Stock Units (warehouse-specific)
```

## Permission Matrix

| Feature                 | Admin          | Staff                        |
| ----------------------- | -------------- | ---------------------------- |
| Company/Warehouse/Staff | Full CRUD      | No access                    |
| Products                | Full CRUD      | Read only                    |
| Partners                | Full CRUD      | Read only                    |
| Stock Units             | All warehouses | Assigned warehouse only      |
| Sales Orders            | Full CRUD all  | Read assigned warehouse only |
| Purchase Orders         | Full CRUD all  | Read assigned warehouse only |
| Job Work                | All warehouses | Assigned warehouse (CRUD)    |
| Outward/Inward          | All warehouses | Assigned warehouse (CRUD)    |
| Barcode Generation      | All warehouses | Assigned warehouse only      |

## Common Commands

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate supabase types
npm run db:types

# Type checking
npm run ts

# Run linting
npm run lint

# Create test invite links
npx tsx scripts/create-invite.ts
```

### Supabase

```bash
# Login to Supabase
npx supabase login

# Initialize Supabase locally
npx supabase init

# Start Supabase locally
npx supabase start

# Stop Supabase locally
npx supabase stop

# Generate TypeScript types from database
npx supabase gen types typescript --local > src/types/database.ts
```

### Deployment

```bash
# Build and export for static hosting
npm run build

# Deploy to Hostinger (via FTP/Git depending on setup)
```

## Project Structure

```
/src
  /app                    # Next.js App Router
    /(auth)              # Auth routes (login, register)
    /(warehouse)         # Warehouse specific routes
    /(catalog)           # Public sales catalog
  /components
    /ui                  # Reusable UI components
    /forms              # Form components
    /layouts            # Layout components
  /lib
    /supabase          # Supabase client & helpers
    /hooks             # Custom React hooks
    /utils             # Utility functions
    /validations       # Form validation schemas
  /types               # TypeScript type definitions
```

## Development Guidelines

- Refer to TODO.md file for list of completed and pending tasks

- Always update the TODO.md file before proceeding to the next task

- Refer to globals.css for theme

- Use shadcn components wherever possible

- Feel free to overwrite existing migration files if needed. Because we are in development phase, and we are not live yet

- Use Sonner for all toast notifications (already configured in layout)

- Use utility functions from `@/lib/utils/date` for date formats

- Add title attr wherever text is truncated

### Data Fetching with TanStack Query

- **Always use TanStack Query hooks** from `@/lib/query/hooks/` for data fetching
- **Never use direct Supabase queries** in components - create hooks instead
- **RLS handles filtering** - hooks don't need `companyId` parameter (users are single-company)
- **Query keys** are centralized in `@/lib/query/keys.ts` for cache management
- **Custom hooks pattern**: `useProducts()`, `usePartners()`, `useWarehouses()`, etc.
- **Mutations**: Use hook mutations for automatic cache invalidation (e.g., `useProductMutations()`)
- **New queries**: Add to `@/lib/queries/`, create hook in `@/lib/query/hooks/`, add key to `keys.ts`

### Form Validation with Zod + React Hook Form

- **Always use Zod + React Hook Form** for all forms (no manual state management)
- **Validation schemas** in `/src/lib/validations/` - one file per domain (e.g., `partner.ts`, `product.ts`)
- **Reusable validators** in `/src/lib/validations/common.ts` (phone, email, GST, PAN, PIN, names)
- **TypeScript enums** - Import from `@/types/database/enums.ts` and use const arrays for Zod (e.g., `PARTNER_TYPES`)
- **Error messages** - Show actual characters in format "word (character)" (e.g., "hyphen (-)")
- **Custom components** - Wrap with `Controller` from `react-hook-form` (e.g., RadioGroup, DatePicker)
- **Watching fields** - Use `useWatch` hook instead of `watch()` to avoid React Compiler warnings

### TypeScript Type Safety

#### Query Builder Pattern with Type Inference

**Always use the query builder pattern to automatically infer types from queries:**

```typescript
// In src/lib/queries/warehouses.ts
export const buildWarehousesQuery = (supabase: SupabaseClient<Database>) => {
  return supabase
    .from("warehouses")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
};

// In src/types/warehouses.types.ts
import type { QueryData } from "@supabase/supabase-js";
import type { buildWarehousesQuery } from "@/lib/queries/warehouses";

export type Warehouse = QueryData<
  ReturnType<typeof buildWarehousesQuery>
>[number];
```

**Benefits:**

- ✅ Types automatically match queries (zero manual sync effort)
- ✅ TypeScript catches field access errors at compile time
- ✅ Refactoring queries automatically updates types
- ✅ Self-documenting - query is the single source of truth

**Pattern:**

1. Create `buildXQuery()` function in `/src/lib/queries/`
2. Export and use `QueryData<ReturnType<typeof buildXQuery>>` in `/src/types/`
3. Import the inferred type back into queries file for function signatures

#### Shared Type Files

- **Shared types** for complex data structures go in `/src/types/` (e.g., `sales-orders.types.ts`, `stock-flow.types.ts`)
- **Domain-specific files** - Each domain gets its own type file (e.g., `partners.types.ts`, `products.types.ts`)
- **Type inference from queries** - Use `QueryData<ReturnType<typeof buildQuery>>` pattern for automatic type inference

#### Type Structure Rules

1. **Always use `Pick<>` with base type inside** - Never extend database types directly

```typescript
// ❌ Bad - Extends DB type directly
export interface SalesOrderListView extends SalesOrder {
  customer: Partner | null;
}

// ✅ Good - Uses Pick<> with base type inside
export interface SalesOrderListView extends Pick<
  SalesOrder,
  "id" | "sequence_number" | "status"
> {
  customer: Pick<Partner, "first_name" | "last_name"> | null;
}
```

2. **Never use `*` in queries** - Always specify exact fields to keep types and queries in sync

```typescript
// ❌ Bad - Uses wildcard
.select('*, customer:partners(*)')

// ✅ Good - Explicit fields matching type
.select('id, sequence_number, status, customer:partners(first_name, last_name)')
```

3. **Only add `| null` if FK is nullable in schema** - Check database migration to verify

```typescript
// If agent_id is NULLABLE in database:
agent: Pick<Partner, "id" | "name"> | null;

// If customer_id is NOT NULL in database:
customer: Pick<Partner, "id" | "name">;
```

4. **Don't create new field interfaces** - Use `Pick<>` unless fields are derived/computed

```typescript
// ❌ Bad - Creates new interface for DB fields
export interface SalesOrderItemListView {
  id: string;
  quantity: number;
}

// ✅ Good - Uses Pick<> for DB fields
export interface SalesOrderItemListView extends Pick<
  SalesOrderItem,
  "id" | "quantity"
> {
  // Only add new fields if they're computed/derived
  displayName?: string; // Computed field, not from DB
}
```

5. **Naming convention** - All view types end with "View" suffix

```typescript
// ✅ Good naming
export interface SalesOrderListView {}
export interface SalesOrderDetailView {}
export interface PartnerListView {}
```

6. **Consolidate to 2 types per domain** - ListView and DetailView (unless bespoke requirement)

```typescript
// For most domains, keep it simple:
-ProductListView - // For list pages
  ProductDetailView - // For detail pages
  // Only add specialized views if truly needed:
  ProductCatalogView; // Bespoke requirement for public catalog
```

#### Type-Query Alignment

- **Type must match query exactly** - If query fetches 9 fields, type should have those exact 9 fields
- **Benefits**: TypeScript catches errors when accessing unfetched fields, self-documenting code
- **Payload reduction**: Fetching only needed fields can reduce payload by 50-70%

Example:

```typescript
// ❌ Bad - Type includes all fields, query fetches 3
partner: Partner | null;

// ✅ Good - Type matches what query fetches
partner: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
```

#### Documentation

- **Add JSDoc comments** - Explain what each view type represents and where it's used

```typescript
/**
 * Sales order with minimal details for list views
 * Used in: sales order list page, partner detail page
 */
export interface SalesOrderListView {}
```
