import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";

// ============================================================================
// Query builders used by the /api/tally-export route.
// Each builder selects the exact fields required by the XML builders in
// src/lib/tally/* — no more, no less.
// ============================================================================

export const buildLedgersForExportQuery = (
  supabase: SupabaseClient<Database>,
) => {
  return supabase
    .from("ledgers")
    .select(
      `
        id,
        name,
        gst_applicable,
        gst_rate,
        parent_group:parent_groups(name)
      `,
    )
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });
};

export const buildInvoicesForExportQuery = (
  supabase: SupabaseClient<Database>,
  dateFrom: string,
  dateTo: string,
) => {
  return supabase
    .from("invoices")
    .select(
      `
        id,
        tally_guid,
        invoice_number,
        invoice_date,
        invoice_type,
        taxable_amount,
        total_cgst_amount,
        total_sgst_amount,
        total_igst_amount,
        total_amount,
        round_off_amount,
        party_ledger_name,
        counter_ledger_name,
        is_cancelled
      `,
    )
    .gte("invoice_date", dateFrom)
    .lte("invoice_date", dateTo)
    .eq("is_cancelled", false)
    .is("deleted_at", null)
    .order("invoice_date", { ascending: true })
    .order("sequence_number", { ascending: true });
};

export const buildPaymentsForExportQuery = (
  supabase: SupabaseClient<Database>,
  dateFrom: string,
  dateTo: string,
) => {
  return supabase
    .from("payments")
    .select(
      `
        id,
        tally_guid,
        payment_number,
        payment_date,
        voucher_type,
        total_amount,
        tds_amount,
        net_amount,
        tds_applicable,
        instrument_number,
        transaction_id,
        is_cancelled,
        party_ledger:ledgers!party_ledger_id(name),
        counter_ledger:ledgers!counter_ledger_id(name),
        tds_ledger:ledgers!tds_ledger_id(name),
        payment_allocations(
          amount_applied,
          allocation_type,
          is_cancelled,
          invoice:invoices!invoice_id(invoice_number)
        )
      `,
    )
    .gte("payment_date", dateFrom)
    .lte("payment_date", dateTo)
    .eq("is_cancelled", false)
    .is("deleted_at", null)
    .order("payment_date", { ascending: true })
    .order("sequence_number", { ascending: true });
};

export const buildAdjustmentNotesForExportQuery = (
  supabase: SupabaseClient<Database>,
  dateFrom: string,
  dateTo: string,
) => {
  return supabase
    .from("adjustment_notes")
    .select(
      `
        id,
        tally_guid,
        adjustment_number,
        adjustment_date,
        adjustment_type,
        subtotal_amount,
        total_cgst_amount,
        total_sgst_amount,
        total_igst_amount,
        total_amount,
        round_off_amount,
        party_ledger_name,
        counter_ledger_name,
        is_cancelled,
        invoice:invoices!invoice_id(invoice_number, invoice_type)
      `,
    )
    .gte("adjustment_date", dateFrom)
    .lte("adjustment_date", dateTo)
    .eq("is_cancelled", false)
    .is("deleted_at", null)
    .order("adjustment_date", { ascending: true })
    .order("sequence_number", { ascending: true });
};
