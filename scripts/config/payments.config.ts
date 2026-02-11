export const PAYMENTS_CONFIG = {
  // Receipt rate: 80% of sales invoices get receipts
  paymentReceiptRate: 0.8,

  // Payment made rate: 80% of purchase invoices get payments
  paymentMadeRate: 0.8,

  // Full vs partial payment distribution
  fullPaymentRate: 0.7, // 70% full payment, 30% partial
  partialPaymentRange: [0.3, 0.8] as [number, number], // 30-80% of outstanding

  // Payment mode distribution
  paymentModeDistribution: {
    cash: 0.1, // 10%
    cheque: 0.15, // 15%
    neft: 0.4, // 40%
    rtgs: 0.1, // 10%
    upi: 0.2, // 20%
    card: 0.05, // 5%
  },

  // TDS configuration (only for purchase payments)
  tdsApplicableRate: 0.15, // 15% of purchase payments have TDS
  tdsRates: [0.1, 1, 2] as const, // 0.1%, 1%, 2%

  // Payment date offset: 1-60 days in the past
  paymentDateOffsetDays: { min: 1, max: 60 },

  // Cancellation rate: 5% of payments are cancelled
  cancellationRate: 0.05,

  // Cancellation reasons
  cancellationReasons: [
    "Payment failed",
    "Incorrect amount entered",
    "Duplicate payment",
  ],

  // Banks and branches for instrument details
  banks: [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "Punjab National Bank",
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "IDFC First Bank",
  ],

  branches: [
    "MG Road Branch",
    "Jayanagar Branch",
    "Indiranagar Branch",
    "Koramangala Branch",
    "Whitefield Branch",
    "Electronic City Branch",
    "HSR Layout Branch",
    "Malleshwaram Branch",
  ],

  ifscPrefixes: [
    "SBIN",
    "HDFC",
    "ICIC",
    "UTIB",
    "KKBK",
    "PUNB",
    "BARB",
    "CNRB",
    "UBIN",
    "IDFB",
  ],

  // UPI handles
  upiHandles: ["@paytm", "@phonepe", "@googlepay", "@ybl", "@axl"],

  // Instrument detail probabilities by payment mode
  instrumentDetailProbabilities: {
    cheque: {
      fullDetails: 0.8, // 80% have all details, 20% only number
    },
    neft: {
      transactionId: 0.9, // 90% have transaction ID
    },
    rtgs: {
      transactionId: 0.9, // 90% have transaction ID
    },
    upi: {
      vpa: 0.7, // 70% have VPA
      transactionId: 0.6, // 60% have transaction ID
    },
    card: {
      lastFour: 0.8, // 80% have last 4 digits
      transactionId: 0.5, // 50% have transaction ID
    },
  },

  // Instrument date offset for cheques (1-3 days before payment date)
  instrumentDateOffsetDays: { min: 1, max: 3 },
} as const;
