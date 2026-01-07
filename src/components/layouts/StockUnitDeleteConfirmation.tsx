"use client";

import { Button } from "@/components/ui/button";

interface StockUnitDeleteConfirmationProps {
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function StockUnitDeleteConfirmation({
  onCancel,
  onConfirm,
  loading = false,
}: StockUnitDeleteConfirmationProps) {
  return (
    <>
      {/* Content */}
      <div className="px-4 pt-0 pb-6 md:px-0 overflow-y-auto">
        <p className="text-sm text-gray-700">
          Are you sure you want to delete this stock unit?
        </p>
        <p className="text-sm text-red-600">This action cannot be undone.</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 w-full pb-2 px-4 md:px-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </>
  );
}
