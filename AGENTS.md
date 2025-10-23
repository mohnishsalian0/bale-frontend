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

| Feature | Admin | Staff |
|---------|-------|-------|
| Company/Warehouse/Staff | Full CRUD | No access |
| Products | Full CRUD | Read only |
| Partners | Full CRUD | Read only |
| Stock Units | All warehouses | Assigned warehouse only |
| Sales Orders | Full CRUD all | Read assigned warehouse only |
| Job Work | All warehouses | Assigned warehouse (CRUD) |
| Dispatch/Receipt | All warehouses | Assigned warehouse (CRUD) |
| Barcode Generation | All warehouses | Assigned warehouse only |

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

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
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
    /(dashboard)         # Protected dashboard routes
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

## Development guildelines

Refer to TODO.md file for list of completed and pending tasks

Always update the TODO.md file before proceeding to the next task
