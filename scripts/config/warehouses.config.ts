/**
 * Warehouse Configuration
 * Defines all warehouses for the test company
 * Distribution: 2 business warehouses + 3 vendor factories
 */

export interface WarehouseConfig {
  name: string;
  address_line1: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  /**
   * Distribution weight for order allocation (percentage)
   * Used for distributing sales and purchase orders across warehouses
   */
  distribution_weight: number;
}

/**
 * Business Warehouses (60% + 20% = 80% of orders)
 * Primary locations for sales and direct operations
 */
export const BUSINESS_WAREHOUSES: WarehouseConfig[] = [
  {
    name: "Main Warehouse",
    address_line1: "123 MG Road",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pin_code: "400001",
    distribution_weight: 60, // 60% of orders
  },
  {
    name: "Regional Warehouse - South",
    address_line1: "78 MG Road",
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    pin_code: "560001",
    distribution_weight: 20, // 20% of orders
  },
];

/**
 * Vendor Factories (10% + 5% + 5% = 20% of orders)
 * Specialized processing units for job work
 */
export const VENDOR_FACTORIES: WarehouseConfig[] = [
  {
    name: "Surat Dyeing Factory",
    address_line1: "56 Ring Road",
    city: "Surat",
    state: "Gujarat",
    country: "India",
    pin_code: "395002",
    distribution_weight: 10, // 10% of orders
  },
  {
    name: "Tirupur Knitting Factory",
    address_line1: "89 Textile Park",
    city: "Tirupur",
    state: "Tamil Nadu",
    country: "India",
    pin_code: "641604",
    distribution_weight: 5, // 5% of orders
  },
  {
    name: "Coimbatore Processing Factory",
    address_line1: "67 SIDCO Estate",
    city: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    pin_code: "641021",
    distribution_weight: 5, // 5% of orders
  },
];

/**
 * All warehouses combined (5 total)
 * Distribution: [60, 20, 10, 5, 5] = 100%
 */
export const ALL_WAREHOUSES: WarehouseConfig[] = [
  ...BUSINESS_WAREHOUSES,
  ...VENDOR_FACTORIES,
];

/**
 * Validate that distribution weights sum to 100%
 */
const totalWeight = ALL_WAREHOUSES.reduce(
  (sum, w) => sum + w.distribution_weight,
  0,
);
if (totalWeight !== 100) {
  throw new Error(
    `Warehouse distribution weights must sum to 100%, got ${totalWeight}%`,
  );
}

/**
 * Select a random warehouse based on distribution weights
 * Used for allocating orders across warehouses proportionally
 */
export function selectWarehouseByWeight(
  warehouses: WarehouseConfig[] = ALL_WAREHOUSES,
): WarehouseConfig {
  const random = Math.random() * 100; // 0-100
  let cumulative = 0;

  for (const warehouse of warehouses) {
    cumulative += warehouse.distribution_weight;
    if (random < cumulative) {
      return warehouse;
    }
  }

  // Fallback (should never reach here if weights sum to 100)
  return warehouses[0];
}
