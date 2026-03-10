import { createClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  JobWorkFilters,
  JobWorkListView,
  JobWorkDetailView,
  CreateJobWorkData,
  CreateJobWorkLineItem,
  UpdateJobWorkData,
  CancelJobWorkData,
  CompleteJobWorkData,
  JobWork,
} from "@/types/job-works.types";

// Re-export types for convenience
export type {
  JobWorkFilters,
  JobWorkListView,
  JobWorkDetailView,
  CreateJobWorkData,
  CreateJobWorkLineItem,
  UpdateJobWorkData,
  CancelJobWorkData,
  CompleteJobWorkData,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching job works with optional filters and pagination
 */
export const buildJobWorksQuery = (
  supabase: SupabaseClient<Database>,
  filters?: JobWorkFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;
  const limit = filters?.limit ? filters.limit : pageSize;

  let query = supabase
    .from("job_works")
    .select(
      `
        *,
        vendor:partners!vendor_id(
          id, first_name, last_name, display_name, company_name
        ),
        agent:partners!agent_id(
          id, first_name, last_name, display_name, company_name
        ),
        service_type:attributes!service_type_attribute_id(
          id, name
        ),
        job_work_items!inner(
          *,
          product:products!product_id!inner(
            id, name, stock_type, measuring_unit, product_images, sequence_number, product_code
          )
        )
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (filters?.warehouseId) {
    query = query.eq("warehouse_id", filters.warehouseId);
  }

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in("status", filters.status);
    } else {
      if (filters.status === "overdue") {
        query = query.eq("status", "in_progress");
        query = query.lt("due_date", new Date().toISOString());
      } else {
        query = query.eq("status", filters.status);
      }
    }
  }

  if (filters?.vendorId) {
    query = query.eq("vendor_id", filters.vendorId);
  }

  if (filters?.agentId) {
    query = query.eq("agent_id", filters.agentId);
  }

  if (filters?.productId) {
    query = query.eq("job_work_items.product.id", filters.productId);
  }

  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  if (filters?.date_from) {
    query = query.gte("start_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("start_date", filters.date_to);
  }

  const orderBy = filters?.order_by || "start_date";
  const ascending = !!filters?.ascending;
  query = query.order(orderBy, { ascending });

  query = query.range(offset, offset + limit - 1);

  return query;
};

/**
 * Query builder for fetching a single job work by sequence number
 */
export const buildJobWorkByNumberQuery = (
  supabase: SupabaseClient<Database>,
  sequenceNumber: string,
) => {
  return supabase
    .from("job_works")
    .select(
      `
			*,
			vendor:partners!vendor_id(
				*,
				ledger:ledgers!partner_id(id, name)
			),
			agent:partners!agent_id(
				id, first_name, last_name, display_name, company_name
			),
			warehouse:warehouses!warehouse_id(*),
			service_type:attributes!service_type_attribute_id(
				id, name
			),
			job_work_items(
				*,
				product:products!product_id(
          id,
          name,
          stock_type,
          measuring_unit,
          product_images,
          product_code,
          sequence_number,
          hsn_code
        )
			)
		`,
    )
    .eq("sequence_number", parseInt(sequenceNumber))
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching a single job work by ID
 */
export const buildJobWorkByIdQuery = (
  supabase: SupabaseClient<Database>,
  orderId: string,
) => {
  return supabase
    .from("job_works")
    .select(
      `
			*,
			vendor:partners!vendor_id(
				*,
				ledger:ledgers!partner_id(id, name)
			),
			agent:partners!agent_id(
				id, first_name, last_name, display_name, company_name
			),
			warehouse:warehouses!warehouse_id(*),
			service_type:attributes!service_type_attribute_id(
				id, name
			),
			job_work_items(
				*,
				product:products!product_id(
          id,
          name,
          stock_type,
          measuring_unit,
          product_images,
          product_code,
          sequence_number,
          hsn_code
        )
			)
		`,
    )
    .eq("id", orderId)
    .is("deleted_at", null)
    .single();
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch job works with optional filters
 */
export async function getJobWorks(
  filters?: JobWorkFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: JobWorkListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildJobWorksQuery(
    supabase,
    filters,
    page,
    pageSize,
  );

  if (error) throw error;

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single job work by sequence number
 */
export async function getJobWorkByNumber(
  sequenceNumber: string,
): Promise<JobWorkDetailView> {
  const supabase = createClient();
  const { data, error } = await buildJobWorkByNumberQuery(
    supabase,
    sequenceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("Job work not found");

  return data;
}

/**
 * Fetch a single job work by ID (UUID)
 */
export async function getJobWorkById(
  orderId: string,
): Promise<JobWorkDetailView> {
  const supabase = createClient();
  const { data, error } = await buildJobWorkByIdQuery(supabase, orderId);

  if (error) throw error;
  if (!data) throw new Error("Job work not found");

  return data;
}

/**
 * Create a new job work with line items
 */
export async function createJobWork(
  orderData: CreateJobWorkData,
  lineItems: CreateJobWorkLineItem[],
): Promise<number> {
  const supabase = createClient();

  const { data: sequenceNumber, error } = await supabase.rpc(
    "create_job_work_with_items",
    {
      p_order_data: orderData as unknown as Json,
      p_line_items: lineItems as unknown as Json[],
    },
  );

  if (error) throw error;
  if (!sequenceNumber) throw new Error("No sequence number returned");

  return sequenceNumber as number;
}

/**
 * Cancel a job work with reason
 */
export async function cancelJobWork(
  orderId: string,
  cancelData: CancelJobWorkData,
): Promise<void> {
  const supabase = createClient();

  if (!cancelData.reason || cancelData.reason.trim() === "") {
    throw new Error("Cancellation reason is required");
  }

  const { error } = await supabase
    .from("job_works")
    .update({
      status: "cancelled",
      cancellation_reason: cancelData.reason,
    })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Complete a job work with optional notes
 */
export async function completeJobWork(
  orderId: string,
  completeData: CompleteJobWorkData,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("job_works")
    .update({
      status: "completed",
      notes: completeData.notes || null,
    })
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Update job work fields (generic update for any fields)
 */
export async function updateJobWork(
  orderId: string,
  data: Partial<JobWork>,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("job_works")
    .update(data)
    .eq("id", orderId);

  if (error) throw error;
}

/**
 * Update job work with items atomically via RPC function
 * Validates business rules. Deletes old items and inserts new ones in a single transaction.
 */
export async function updateJobWorkWithItems(
  orderId: string,
  orderData: UpdateJobWorkData,
  lineItems: CreateJobWorkLineItem[],
): Promise<void> {
  const supabase = createClient();

  if (lineItems.length === 0) {
    throw new Error("At least one line item is required");
  }

  const { error } = await supabase.rpc("update_job_work_with_items", {
    p_order_id: orderId,
    p_order_data: orderData as unknown as Json,
    p_line_items: lineItems as unknown as Json[],
  });

  if (error) throw error;
}

/**
 * Delete job work (soft delete)
 */
export async function deleteJobWork(orderId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("job_works")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}
