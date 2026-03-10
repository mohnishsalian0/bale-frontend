/**
 * Goods Transfers Configuration
 *
 * Controls the generation of warehouse-to-warehouse stock transfers.
 */

export const GOODS_TRANSFERS_CONFIG = {
  /**
   * Stock units per transfer
   * Random selection between min and max
   */
  stockUnitsPerTransfer: {
    min: 5,
    max: 10,
  },

  /**
   * Transfer date range (days after latest stock unit updated_at)
   * Keeps transfers close to stock movements
   */
  transferDateOffsetDays: {
    min: 1,
    max: 7, // Within 1 week
  },

  /**
   * Status distribution for created transfers
   * Should sum to 1.0 (100%)
   */
  statusDistribution: {
    completed: 0.6, // 60%
    in_transit: 0.3, // 30%
    cancelled: 0.1, // 10%
  },

  /**
   * Delivery time range (days after transfer date)
   */
  expectedDeliveryDays: {
    min: 3,
    max: 10,
  },

  /**
   * Transport types available
   */
  transportTypes: ["road", "rail", "air"] as const,
} as const;

export type TransportType =
  (typeof GOODS_TRANSFERS_CONFIG.transportTypes)[number];
