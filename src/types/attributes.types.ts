/**
 * Attribute Types
 * Type definitions for the generalized attributes table
 */

import type { QueryData } from "@supabase/supabase-js";
import type { buildAttributesQuery } from "@/lib/queries/attributes";
import type { ProductAttributeGroup } from "@/types/database/enums";

// ============================================================================
// INFERRED TYPES
// ============================================================================

/**
 * Attribute type inferred from buildAttributesQuery
 * Used across the app for displaying attributes
 */
export type Attribute = QueryData<
  ReturnType<typeof buildAttributesQuery>
>[number];

// ============================================================================
// MUTATION TYPES
// ============================================================================

/**
 * Data required to create a new attribute
 * Used in createAttribute and createAttributesBatch functions
 */
export interface CreateAttributeData {
  name: string;
  groupName: ProductAttributeGroup;
}
