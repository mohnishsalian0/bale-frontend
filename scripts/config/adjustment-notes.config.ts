export const ADJUSTMENT_NOTES_CONFIG = {
  // Target rate: 20-25% of eligible invoices get adjustment notes
  adjustmentRate: 0.225, // 22.5% (between 20-25%)

  // Sales invoices: 80% get credit notes, 20% get debit notes
  salesCreditRate: 0.8,

  // Purchase invoices: 80% get debit notes, 20% get credit notes
  purchaseDebitRate: 0.8,

  // Cancellation rate: 8% of adjustment notes are cancelled
  cancellationRate: 0.08,

  // Adjustment amount: 10-30% of outstanding amount
  adjustmentAmountRange: [0.1, 0.3] as [number, number],

  // Item quantity and rate ranges (reduced to avoid huge amounts)
  itemQuantityRange: [1, 10] as [number, number],
  itemRateRange: [50, 500] as [number, number],

  // Number of items per adjustment note
  itemsPerNote: [1, 3] as [number, number],

  // Adjustment date offset: 1-30 days after invoice
  adjustmentDateOffsetDays: { min: 1, max: 30 },

  // GST rates to use
  gstRates: [0, 5, 12, 18] as const,

  // Reasons for adjustments
  reasons: {
    credit: [
      "Product quality issue",
      "Partial return by customer",
      "Discount adjustment",
      "Damaged goods",
    ],
    debit: [
      "Additional freight charges",
      "Late delivery penalty",
      "Short delivery adjustment",
      "Additional services",
    ],
  },

  // Cancellation reasons
  cancellationReasons: [
    "Incorrect adjustment amount",
    "Wrong invoice referenced",
    "Duplicate entry",
  ],
} as const;
