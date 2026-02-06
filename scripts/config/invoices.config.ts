export const INVOICES_CONFIG = {
  salesInvoiceRate: 0.8, // 80%
  purchaseInvoiceRate: 0.8, // 80%
  additionalChargesRate: 0.3, // 30%

  // Tax distribution
  taxDistribution: {
    gst: 0.5, // 50%
    igst: 0.3, // 30%
    no_tax: 0.2, // 20%
  },

  // Discount distribution
  sales: {
    discountDistribution: {
      percentage: 0.33,
      flat_amount: 0.33,
      none: 0.34,
    },
    discountPercentageRange: [5, 20] as [number, number],
    discountFlatRange: [500, 5000] as [number, number],
  },

  purchase: {
    discountDistribution: {
      percentage: 0.3,
      flat_amount: 0.1,
      none: 0.6,
    },
    discountPercentageRange: [3, 15] as [number, number],
    discountFlatRange: [500, 3000] as [number, number],
  },

  // Goods movement linkage
  goodsMovementLinkRate: 0.4, // 40% of invoices get linked to goods movements

  // Additional charges probabilities
  additionalCharges: {
    sales: {
      freightOutward: 0.6,
      packaging: 0.45,
      agentCommission: 0.5,
      handling: 0.3,
    },
    purchase: {
      freightInward: 0.65,
      loadingUnloading: 0.45,
      labour: 0.4,
      handling: 0.3,
      packaging: 0.25,
    },
  },
} as const;
