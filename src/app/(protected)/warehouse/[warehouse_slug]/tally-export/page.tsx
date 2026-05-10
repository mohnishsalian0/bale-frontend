"use client";

import { useState } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { IconFileExport, IconAlertTriangle } from "@tabler/icons-react";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/auth/PermissionGate";

export default function TallyExportPage() {
  return (
    <PermissionGate
      permission="accounting.tally_export.create"
      fallback={
        <div className="p-6 text-sm text-gray-500">
          You don&apos;t have permission to export to Tally. Contact your
          administrator.
        </div>
      }
      mode="fallback"
    >
      <TallyExportForm />
    </PermissionGate>
  );
}

function TallyExportForm() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  const canExport = Boolean(dateRange?.from && dateRange?.to && !isExporting);

  const handleExport = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error("Please pick a date range");
      return;
    }

    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");

    setIsExporting(true);
    try {
      const response = await fetch("/api/tally-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date_from: from, date_to: to }),
      });

      if (!response.ok) {
        const err = (await response
          .json()
          .catch(() => ({ error: "Export failed" }))) as { error?: string };
        throw new Error(err.error ?? `Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tally-export-${from}_to_${to}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Export complete. Included vouchers are now locked.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          <IconFileExport className="size-6" />
          Export to Tally
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Download a ZIP containing <code>masters.xml</code> (ledgers) and{" "}
          <code>transactions.xml</code> (vouchers) that can be imported into
          Tally Prime.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <div>
          <label
            htmlFor="date-range"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Date range
          </label>
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          <p className="mt-1 text-xs text-gray-500">
            All non-cancelled invoices, payments, receipts, and credit/debit
            notes in this range will be exported.
          </p>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex gap-2">
          <IconAlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-medium">
              Exported vouchers will be locked in Bale.
            </p>
            <p>
              Once exported, these invoices, payments, and adjustment notes
              cannot be edited or deleted. Use adjustment notes for any
              corrections afterwards.
            </p>
            <p className="pt-1">
              Ledger names in Bale must exactly match those in Tally (Tally
              matches by name). Ensure ledgers named <code>CGST</code>,{" "}
              <code>SGST</code>, <code>IGST</code>, and <code>Round Off</code>{" "}
              exist in your Tally company.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            disabled={!canExport}
            onClick={handleExport}
            className="gap-2"
          >
            <IconFileExport className="size-4" />
            {isExporting ? "Generating…" : "Export to Tally"}
          </Button>
        </div>
      </div>

      <div className="mt-6 text-xs text-gray-500 space-y-2">
        <p>
          <strong>Import order in Tally:</strong> first import{" "}
          <code>masters.xml</code>, then <code>transactions.xml</code>.
        </p>
        <p>
          Re-exporting the same date range is safe — Tally deduplicates by GUID
          and will not create duplicate vouchers.
        </p>
      </div>
    </div>
  );
}
