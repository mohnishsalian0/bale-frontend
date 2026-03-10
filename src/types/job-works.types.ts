import type { Tables, TablesUpdate } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import { DisplayStatus } from "@/lib/utils/job-work";
import {
  buildJobWorksQuery,
  buildJobWorkByNumberQuery,
} from "@/lib/queries/job-works";

// Base types from database (still needed for non-query uses)
export type JobWork = Tables<"job_works">;
export type JobWorkUpdate = TablesUpdate<"job_works">;
export type JobWorkItem = Tables<"job_work_items">;

// ============================================================================
// FILTERS
// ============================================================================

export interface JobWorkFilters extends Record<string, unknown> {
  warehouseId?: string;
  status?: DisplayStatus | DisplayStatus[];
  vendorId?: string;
  agentId?: string;
  productId?: string;
  limit?: number;
  order_by?: "start_date" | "due_date" | "created_at";
  ascending?: boolean;
  search_term?: string;
  date_from?: string;
  date_to?: string;
}

// =====================================================
// LIST VIEW TYPES (for job work list pages)
// =====================================================

/**
 * Job work with minimal details for list views
 * Type inferred from buildJobWorksQuery
 * Used in: job work list page, partner detail page
 */
export type JobWorkListView = QueryData<
  ReturnType<typeof buildJobWorksQuery>
>[number];

/**
 * Job work item for list views
 * Extracted from JobWorkListView nested array
 */
export type JobWorkItemListView = JobWorkListView["job_work_items"][number];

// =====================================================
// DETAIL VIEW TYPES (for job work detail page)
// =====================================================

/**
 * Job work with complete details
 * Type inferred from buildJobWorkByNumberQuery
 * Used in: job work detail page
 */
export type JobWorkDetailView = QueryData<
  ReturnType<typeof buildJobWorkByNumberQuery>
>;

/**
 * Job work item with full product details
 * Extracted from JobWorkDetailView nested array
 */
export type JobWorkItemDetailView = JobWorkDetailView["job_work_items"][number];

// =====================================================
// CREATE/UPDATE TYPES (for mutations)
// =====================================================

/**
 * Data for creating a new job work
 * Used in: create job work flow
 */
export interface CreateJobWorkData {
  warehouse_id: string;
  vendor_id: string;
  agent_id: string | null;
  service_type_attribute_id: string;
  start_date: string;
  due_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
  tax_type: string;
  notes: string | null;
  attachments: string[];
  status: string;
}

/**
 * Line item data for creating a job work
 * Used in: create job work flow
 */
export interface CreateJobWorkLineItem {
  product_id: string;
  expected_quantity: number;
  unit_rate: number;
}

/**
 * Data for updating a job work
 * Used in: approve/edit job work flow
 */
export interface UpdateJobWorkData {
  warehouse_id: string;
  vendor_id: string;
  agent_id: string | null;
  service_type_attribute_id: string;
  start_date: string;
  due_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
  tax_type: string;
  notes: string | null;
  attachments: string[];
  status: string;
}

/**
 * Data for cancelling a job work
 * Used in: cancel job work flow
 */
export interface CancelJobWorkData {
  reason: string;
}

/**
 * Data for completing a job work
 * Used in: complete job work flow
 */
export interface CompleteJobWorkData {
  notes?: string | null;
}
