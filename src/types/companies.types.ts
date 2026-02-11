import { Tables, TablesUpdate } from "./database/supabase";

export type Company = Tables<"companies">;
export type CompanyUpdate = TablesUpdate<"companies">;

/**
 * Company information for PDF generation
 * Used in: Order PDFs, Invoice PDFs
 */
export type CompanyPDFView = Pick<
  Company,
  | "name"
  | "logo_url"
  | "email"
  | "phone_number"
  | "website_url"
  | "address_line1"
  | "address_line2"
  | "city"
  | "state"
  | "pin_code"
  | "gst_number"
  | "pan_number"
>;
