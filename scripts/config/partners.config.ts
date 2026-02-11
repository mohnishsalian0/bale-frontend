/**
 * Partner Configuration
 * Test data for creating partners (customers, suppliers, vendors, agents)
 */

export interface PartnerConfig {
  partner_type: "customer" | "supplier" | "vendor" | "agent";
  first_name: string;
  last_name: string;
  company_name: string;
  phone_number: string;
  email?: string;
  billing_address_line1: string;
  billing_address_line2?: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_pin_code: string;
  shipping_same_as_billing: boolean;
  shipping_address_line1?: string;
  shipping_address_line2?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  shipping_pin_code?: string;
  credit_limit_enabled: boolean;
  credit_limit: number;
  gst_number?: string;
  pan_number?: string;
}

/**
 * Test Customers (3)
 */
export const TEST_CUSTOMERS: PartnerConfig[] = [
  {
    partner_type: "customer",
    first_name: "Rajesh",
    last_name: "Kumar",
    company_name: "Kumar Textiles",
    phone_number: "+91 98765 43210",
    email: "rajesh@kumartextiles.com",
    billing_address_line1: "123 MG Road",
    billing_city: "Mumbai",
    billing_state: "Maharashtra",
    billing_country: "India",
    billing_pin_code: "400001",
    shipping_same_as_billing: false,
    shipping_address_line1: "456 Warehouse Complex",
    shipping_address_line2: "Andheri East",
    shipping_city: "Mumbai",
    shipping_state: "Maharashtra",
    shipping_country: "India",
    shipping_pin_code: "400059",
    credit_limit_enabled: true,
    credit_limit: 100000,
  },
  {
    partner_type: "customer",
    first_name: "Priya",
    last_name: "Sharma",
    company_name: "Sharma Fabrics",
    phone_number: "+91 98765 43211",
    email: "priya@sharmafabrics.com",
    billing_address_line1: "456 Commercial Street",
    billing_city: "Bangalore",
    billing_state: "Karnataka",
    billing_country: "India",
    billing_pin_code: "560001",
    shipping_same_as_billing: true,
    credit_limit_enabled: true,
    credit_limit: 75000,
  },
  {
    partner_type: "customer",
    first_name: "Amit",
    last_name: "Patel",
    company_name: "Patel Traders",
    phone_number: "+91 98765 43212",
    billing_address_line1: "789 Ashram Road",
    billing_city: "Ahmedabad",
    billing_state: "Gujarat",
    billing_country: "India",
    billing_pin_code: "380009",
    shipping_same_as_billing: false,
    shipping_address_line1: "101 Logistics Hub",
    shipping_address_line2: "Naroda Industrial Area",
    shipping_city: "Ahmedabad",
    shipping_state: "Gujarat",
    shipping_country: "India",
    shipping_pin_code: "382330",
    credit_limit_enabled: false,
    credit_limit: 0,
  },
];

/**
 * Test Suppliers (2)
 */
export const TEST_SUPPLIERS: PartnerConfig[] = [
  {
    partner_type: "supplier",
    first_name: "Suresh",
    last_name: "Reddy",
    company_name: "Reddy Cotton Mills",
    phone_number: "+91 98765 43213",
    email: "suresh@reddycotton.com",
    billing_address_line1: "321 Industrial Area",
    billing_city: "Coimbatore",
    billing_state: "Tamil Nadu",
    billing_country: "India",
    billing_pin_code: "641001",
    shipping_same_as_billing: true,
    credit_limit_enabled: true,
    credit_limit: 200000,
  },
  {
    partner_type: "supplier",
    first_name: "Lakshmi",
    last_name: "Naidu",
    company_name: "Naidu Silk House",
    phone_number: "+91 98765 43214",
    billing_address_line1: "654 Silk Market",
    billing_city: "Kanchipuram",
    billing_state: "Tamil Nadu",
    billing_country: "India",
    billing_pin_code: "631502",
    shipping_same_as_billing: false,
    shipping_address_line1: "23 Weaving Unit",
    shipping_address_line2: "Gandhi Road",
    shipping_city: "Kanchipuram",
    shipping_state: "Tamil Nadu",
    shipping_country: "India",
    shipping_pin_code: "631501",
    credit_limit_enabled: true,
    credit_limit: 150000,
  },
];

/**
 * Test Vendors (2)
 */
export const TEST_VENDORS: PartnerConfig[] = [
  {
    partner_type: "vendor",
    first_name: "Arjun",
    last_name: "Singh",
    company_name: "Singh Processing Unit",
    phone_number: "+91 98765 43215",
    email: "arjun@singhprocessing.com",
    billing_address_line1: "987 Factory Lane",
    billing_city: "Ludhiana",
    billing_state: "Punjab",
    billing_country: "India",
    billing_pin_code: "141001",
    shipping_same_as_billing: false,
    shipping_address_line1: "45 Processing Plant",
    shipping_address_line2: "Industrial Area Phase 2",
    shipping_city: "Ludhiana",
    shipping_state: "Punjab",
    shipping_country: "India",
    shipping_pin_code: "141003",
    credit_limit_enabled: false,
    credit_limit: 0,
  },
  {
    partner_type: "vendor",
    first_name: "Meera",
    last_name: "Desai",
    company_name: "Desai Dyeing Works",
    phone_number: "+91 98765 43216",
    billing_address_line1: "147 Textile Park",
    billing_city: "Surat",
    billing_state: "Gujarat",
    billing_country: "India",
    billing_pin_code: "395003",
    shipping_same_as_billing: true,
    credit_limit_enabled: true,
    credit_limit: 80000,
  },
];

/**
 * Test Agents (2)
 */
export const TEST_AGENTS: PartnerConfig[] = [
  {
    partner_type: "agent",
    first_name: "Vikram",
    last_name: "Mehta",
    company_name: "Mehta Logistics",
    phone_number: "+91 98765 43217",
    email: "vikram.mehta@example.com",
    billing_address_line1: "258 Transport Nagar",
    billing_city: "Delhi",
    billing_state: "Delhi",
    billing_country: "India",
    billing_pin_code: "110001",
    shipping_same_as_billing: true,
    credit_limit_enabled: false,
    credit_limit: 0,
  },
  {
    partner_type: "agent",
    first_name: "Anjali",
    last_name: "Gupta",
    company_name: "Gupta & Associates",
    phone_number: "+91 98765 43218",
    billing_address_line1: "369 Market Road",
    billing_city: "Pune",
    billing_state: "Maharashtra",
    billing_country: "India",
    billing_pin_code: "411001",
    shipping_same_as_billing: false,
    shipping_address_line1: "78 Office Complex",
    shipping_address_line2: "Hinjewadi IT Park",
    shipping_city: "Pune",
    shipping_state: "Maharashtra",
    shipping_country: "India",
    shipping_pin_code: "411057",
    credit_limit_enabled: false,
    credit_limit: 0,
  },
];

/**
 * All test partners combined
 */
export const ALL_TEST_PARTNERS: PartnerConfig[] = [
  ...TEST_CUSTOMERS,
  ...TEST_SUPPLIERS,
  ...TEST_VENDORS,
  ...TEST_AGENTS,
];
