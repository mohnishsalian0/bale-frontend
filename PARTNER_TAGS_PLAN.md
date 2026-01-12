# Partner Tags Implementation Plan

## Overview
Add partner tags functionality by extending the existing `product_attributes` table to be a shared attributes system for both products and partners.

## User Requirements
- **Shared attributes table**: Rename `product_attributes` to generic `attributes` table for both products and partners
- **Simple text tags**: No color badges, just plain text tags
- **Display in list**: Show tags dot-separated in partner info (e.g., "Customer • City, State • Tag1, Tag2")
- **Tag filtering**: Add tag filter UI on partners list page alongside partner type filter

## Implementation Steps

### 1. Database Migration Updates

**Update `supabase/migrations/0015_product_attributes.sql`:**
- Rename table from `product_attributes` to `attributes`
- Keep existing fields: id, company_id, name, group_name, color_hex
- Update group_name to support: 'material', 'color', 'product_tag', 'partner_tag'
- Rename `product_attribute_assignments` to `product_attribute_assignments` (keep as-is for products)
- Create new `partner_attribute_assignments` junction table (partner_id, attribute_id)
- Update all indexes and constraints
- Update RLS policies for both junction tables

**Update dependent migration files:**
- Any references to `product_attributes` table name in later migrations

### 2. Type Definitions

**Create `src/types/attributes.types.ts`:**
- `Attribute` base type (id, company_id, name, group_name)
- `PartnerTag` type using Pick<>

**Update `src/types/partners.types.ts`:**
- Add `tags: PartnerTag[]` to PartnerListView
- Add `tags: PartnerTag[]` to PartnerDetailView
- Add `tags: PartnerTag[]` to PartnerWithStatsListView
- Add `tags: PartnerTag[]` to PartnerWithOrderStatsDetailView

**Update `src/types/products.types.ts`:**
- Import from shared attributes.types.ts
- Update references from product_attributes to attributes

### 3. Query Layer

**Create `src/lib/queries/attributes.ts`:**
- getAttributes(companyId, groupName?) - fetch attributes filtered by group
- createAttribute(companyId, name, groupName) - create new attribute
- Shared CRUD functions for attributes

**Update `src/lib/queries/partners.ts`:**
- Update SELECT constants to include tags join:
  ```sql
  tags:partner_attribute_assignments(
    attribute:attributes!inner(id, name)
  )
  ```
- Add transform functions to reshape tags array
- Add assignTagsToPartner(), removeTagsFromPartner() functions

**Update `src/lib/queries/products.ts`:**
- Update to reference renamed `attributes` table
- Update joins if needed

### 4. Hooks Layer

**Create `src/lib/query/hooks/attributes.ts`:**
- useAttributes(groupName?) - fetch attributes with React Query
- useCreateAttribute() - mutation for creating attributes
- Centralized attribute management

**Update `src/lib/query/hooks/partners.ts`:**
- Partner queries now return tags
- usePartnerMutations() updated to handle tag assignments

**Update `src/lib/query/hooks/products.ts`:**
- Update to use new attributes hooks/queries

### 5. Validation Updates

**Update `src/lib/validations/partner.ts`:**
- Add `tags` field: array of objects with value/label (matching product pattern)
- Optional field, allows creation of new tags

### 6. UI Component Updates

**Update `src/app/(protected)/warehouse/[warehouse_slug]/partners/PartnerFormSheet.tsx`:**
- Add Tags section in "Additional Details" collapsible
- Use MultipleSelector component (same as products)
- Fetch partner tags using useAttributes('partner_tag')
- Handle tag creation in onSubmit (similar to product form)

**Update `src/app/(protected)/warehouse/[warehouse_slug]/partners/page.tsx`:**
- Add tag filter pills alongside partner type filter
- Display tags dot-separated in partner info (e.g., "Customer • City, State • Tag1, Tag2")
- Add tags to filteredPartners logic

**Update `src/app/(protected)/warehouse/[warehouse_slug]/partners/[partner_id]/page.tsx`:**
- Show tags dot-separated in header next to partner type
- Show outstanding amount on right side of header (teal-700 for receivables, yellow-700 for payables)

**Update `src/components/layouts/partner-selection-step.tsx`:**
- Display tags in partner info subtitle (dot-separated)

**Update `src/app/(protected)/warehouse/[warehouse_slug]/stock-flow/PartnerSelectionStep.tsx`:**
- Display tags in partner info subtitle (dot-separated)

**Update `src/lib/utils/partner.ts`:**
- Add `getPartnerTags()` helper function to format tags as string

### 7. Additional Files to Update

**Update `src/lib/query/keys.ts`:**
- Add attribute-related query keys
- Update partner keys to include tag invalidation

**Update `src/app/(protected)/warehouse/[warehouse_slug]/accounting/PartnerOutstandingSection.tsx`:**
- Display tags if available in partner info

**Update `src/app/(protected)/warehouse/[warehouse_slug]/dashboard/PartnersSection.tsx`:**
- Display tags if available

## Migration Strategy

1. Update 0015_product_attributes.sql first (rename table, add group support)
2. Run migration locally to test
3. Update all TypeScript types
4. Update queries and hooks
5. Update UI components
6. Test thoroughly with both products and partners

## Testing Checklist

- [ ] Can create new partner tags in form
- [ ] Can assign existing tags to partners
- [ ] Tags display correctly in partner list
- [ ] Tag filter works on partners page
- [ ] Tags show in partner detail view with outstanding amount
- [ ] Tags show in partner selection steps
- [ ] Product attributes still work correctly
- [ ] No breaking changes to existing product functionality

## Files to Modify

### Database
- `supabase/migrations/0015_product_attributes.sql`

### Types
- `src/types/attributes.types.ts` (NEW)
- `src/types/partners.types.ts`
- `src/types/products.types.ts`

### Queries
- `src/lib/queries/attributes.ts` (NEW)
- `src/lib/queries/partners.ts`
- `src/lib/queries/products.ts`

### Hooks
- `src/lib/query/hooks/attributes.ts` (NEW)
- `src/lib/query/hooks/partners.ts`
- `src/lib/query/hooks/products.ts`
- `src/lib/query/keys.ts`

### Validation
- `src/lib/validations/partner.ts`

### UI Components
- `src/app/(protected)/warehouse/[warehouse_slug]/partners/PartnerFormSheet.tsx`
- `src/app/(protected)/warehouse/[warehouse_slug]/partners/page.tsx`
- `src/app/(protected)/warehouse/[warehouse_slug]/partners/[partner_id]/page.tsx`
- `src/components/layouts/partner-selection-step.tsx`
- `src/app/(protected)/warehouse/[warehouse_slug]/stock-flow/PartnerSelectionStep.tsx`
- `src/app/(protected)/warehouse/[warehouse_slug]/accounting/PartnerOutstandingSection.tsx`
- `src/app/(protected)/warehouse/[warehouse_slug]/dashboard/PartnersSection.tsx`

### Utils
- `src/lib/utils/partner.ts`
