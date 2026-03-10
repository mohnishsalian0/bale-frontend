/**
 * Job Works Module
 * Handles job work generation with idempotent pattern
 *
 * Flow:
 *   1. Fetch existing job works for idempotency check
 *   2. Create missing job works via create_job_work_with_items RPC
 *   3. Transition ~80% to in_progress, cancel ~10% of remaining
 *   4. Do NOT complete here — completions happen after goods converts
 *   5. Return all job works
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import { getRandomDate, randomInt, randomFloat } from "./shared";
import type { JobWorksConfig } from "../config/job-works.config";
import { JOB_WORK_CANCELLATION_REASONS } from "../config/job-works.config";

// ============================================================================
// TYPES
// ============================================================================

export interface JobWorkOrderConfig {
  totalOrders: number;
  year: number;
}

export interface JobWorkResult {
  id: string;
  sequence_number: number;
  status: string;
  warehouse_id: string;
}

// ============================================================================
// JOB WORKS FUNCTIONS
// ============================================================================

/**
 * Generate job works with idempotent pattern
 * - Fetch existing job works by company + year
 * - Calculate difference
 * - Create missing job works
 * - Transition statuses
 * - Return all job works
 */
export async function generateJobWorks(
  supabase: SupabaseClient<Database>,
  companyId: string,
  warehouses: Array<{ id: string; name: string }>,
  userId: string,
  vendorIds: string[],
  agentIds: string[],
  finishedProductIds: string[],
  serviceTypeIds: Record<string, string>,
  config: JobWorkOrderConfig,
  jobWorksConfig: JobWorksConfig,
): Promise<JobWorkResult[]> {
  console.log(
    `\n🔨 Ensuring ${config.totalOrders} job works exist for year ${config.year}...\n`,
  );

  // Fetch existing job works for this company in the given year
  const { data: existing, error: fetchError } = await supabase
    .from("job_works")
    .select("id, sequence_number, status, warehouse_id")
    .eq("company_id", companyId)
    .gte("start_date", `${config.year}-01-01`)
    .lte("start_date", `${config.year}-12-31`)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching job works:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing job works
  if (existingCount === config.totalOrders) {
    console.log(`✅ All ${existingCount} job works already exist\n`);
    return existing!;
  }

  // Calculate how many to create
  const toCreate = config.totalOrders - existingCount;
  console.log(
    `📦 Creating ${toCreate} new job works (${existingCount} already exist)...`,
  );

  // Service type names for random selection
  const serviceTypeNames = Object.keys(serviceTypeIds);

  // Monthly targets for seasonal variance (proportional distribution)
  const monthlyTargets = [
    40,
    40,
    40, // Jan-Mar (wedding season - higher processing)
    30,
    30,
    30, // Apr-Jun (regular)
    25,
    35, // Jul-Aug (monsoon dip then recovery)
    35,
    35,
    35, // Sep-Nov (festive season prep)
    25, // Dec
  ];

  const totalMonthlyTargets = monthlyTargets.reduce(
    (sum, target) => sum + target,
    0,
  );

  const createdOrders: JobWorkResult[] = [];
  let totalCreated = 0;

  // Create job works for each month
  for (let month = 1; month <= 12; month++) {
    const targetCount = Math.floor(
      (monthlyTargets[month - 1] / totalMonthlyTargets) * toCreate,
    );

    if (targetCount === 0) continue;

    console.log(`📅 Month ${month}: Creating ${targetCount} job works...`);

    for (let i = 0; i < targetCount; i++) {
      const startDate = getRandomDate(month, config.year);
      const dueDays = randomInt(
        jobWorksConfig.dueDateDaysAfterStart.min,
        jobWorksConfig.dueDateDaysAfterStart.max,
      );
      const startDateObj = new Date(startDate);
      startDateObj.setDate(startDateObj.getDate() + dueDays);
      const dueDate = startDateObj.toISOString().split("T")[0];

      const vendorId = vendorIds[Math.floor(Math.random() * vendorIds.length)];
      const agentId =
        Math.random() < 0.3 && agentIds.length > 0
          ? agentIds[Math.floor(Math.random() * agentIds.length)]
          : ""; // 30% have agents

      // Pick a random service type
      const serviceTypeName =
        serviceTypeNames[Math.floor(Math.random() * serviceTypeNames.length)];
      const serviceTypeAttributeId = serviceTypeIds[serviceTypeName];

      // Discount logic (40% get discount)
      const hasDiscount = Math.random() < 0.4;
      const discountType = hasDiscount
        ? Math.random() < 0.9
          ? "percentage"
          : "flat_amount"
        : "none";
      const discountValue = hasDiscount ? randomFloat(3, 15) : 0;

      const advanceAmount = randomFloat(1000, 10000);

      // Single finished product per job work (per REQUIREMENTS)
      const productId =
        finishedProductIds[
          Math.floor(Math.random() * finishedProductIds.length)
        ];
      const expectedQty = randomInt(
        jobWorksConfig.expectedQuantity.min,
        jobWorksConfig.expectedQuantity.max,
      );
      const unitRate = randomFloat(
        jobWorksConfig.unitRate.min,
        jobWorksConfig.unitRate.max,
      );

      const lineItems = [
        {
          product_id: productId,
          expected_quantity: expectedQty,
          unit_rate: unitRate,
        },
      ];

      // Randomly assign warehouse
      const selectedWarehouse = warehouses[randomInt(0, warehouses.length - 1)];

      // Create job work using RPC function
      const { data: sequenceNumber, error: orderError } = await supabase.rpc(
        "create_job_work_with_items",
        {
          p_order_data: {
            company_id: companyId,
            warehouse_id: selectedWarehouse.id,
            vendor_id: vendorId,
            agent_id: agentId,
            service_type_attribute_id: serviceTypeAttributeId,
            start_date: startDate,
            due_date: dueDate,
            tax_type: "gst",
            advance_amount: advanceAmount,
            discount_type: discountType,
            discount_value: discountValue,
            notes: `${serviceTypeName} job work — auto-generated test data`,
            status: "approval_pending",
            created_by: userId,
          },
          p_line_items: lineItems,
        },
      );

      if (orderError) {
        console.error(`❌ Failed to create job work: ${orderError.message}`);
        continue;
      }

      // Get the created job work by sequence number
      const { data: order } = await supabase
        .from("job_works")
        .select("id, sequence_number, status, warehouse_id")
        .eq("company_id", companyId)
        .eq("sequence_number", sequenceNumber)
        .single();

      if (order) {
        createdOrders.push(order);
      }

      totalCreated++;
      if (totalCreated % 10 === 0) {
        console.log(`   ✅ Created ${totalCreated}/${toCreate} job works...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} new job works!`);

  // ------------------------------------------------------------------
  // Status transitions
  // ------------------------------------------------------------------
  const allOrders = [...(existing || []), ...createdOrders];
  const approvalPending = allOrders.filter(
    (o) => o.status === "approval_pending",
  );

  // Transition ~80% to in_progress
  const toInProgress = approvalPending.slice(
    0,
    Math.floor(approvalPending.length * jobWorksConfig.inProgressRatio),
  );

  if (toInProgress.length > 0) {
    console.log(
      `📝 Updating ${toInProgress.length} job works to 'in_progress'...`,
    );
    const chunkSize = 100;
    const ids = toInProgress.map((o) => o.id);
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error: updateError } = await supabase
        .from("job_works")
        .update({ status: "in_progress" })
        .in("id", chunk);

      if (updateError) {
        console.error(
          "❌ Failed to update job works to in_progress:",
          updateError,
        );
      }
    }
    // Update local status
    for (const o of toInProgress) {
      o.status = "in_progress";
    }
  }

  // Cancel ~10% of remaining approval_pending
  const remainingPending = allOrders.filter(
    (o) => o.status === "approval_pending",
  );
  const toCancel = remainingPending.slice(
    0,
    Math.floor(remainingPending.length * jobWorksConfig.cancelledRatio),
  );

  if (toCancel.length > 0) {
    console.log(`📝 Cancelling ${toCancel.length} job works...`);
    for (const o of toCancel) {
      const reason =
        JOB_WORK_CANCELLATION_REASONS[
          randomInt(0, JOB_WORK_CANCELLATION_REASONS.length - 1)
        ];
      const { error: cancelError } = await supabase
        .from("job_works")
        .update({
          status: "cancelled",
          cancellation_reason: reason,
        })
        .eq("id", o.id);

      if (cancelError) {
        console.error(`❌ Failed to cancel job work: ${cancelError.message}`);
      } else {
        o.status = "cancelled";
      }
    }
  }

  // Status summary
  const statusSummary = allOrders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(
    `📊 Total job works: ${allOrders.length} — ${JSON.stringify(statusSummary)}\n`,
  );

  return allOrders;
}
