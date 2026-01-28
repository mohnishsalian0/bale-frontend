export type QRTemplateField =
  | "product_name"
  | "product_number"
  | "hsn_code"
  | "material"
  | "color"
  | "gsm"
  | "selling_price_per_unit"
  | "unit_number"
  | "manufacturing_date"
  | "initial_quantity"
  | "quality_grade"
  | "warehouse_location";

export type PageSize = "A4" | "LABEL_4X6";

// Local storage keys for caching
const QR_TEMPLATE_CACHE_KEY = "qr_template_selected_fields";
const QR_PAGE_SIZE_CACHE_KEY = "qr_template_page_size";

/**
 * Get default template fields based on field definitions
 */
export function getDefaultTemplateFields(): QRTemplateField[] {
  // Default fields that should be selected
  const defaultFields: QRTemplateField[] = [
    "product_name",
    "product_number",
    "material",
    "color",
    "gsm",
    "unit_number",
    "manufacturing_date",
    "quality_grade",
    "warehouse_location",
  ];

  return defaultFields;
}

/**
 * Get cached template fields from local storage, or fallback to defaults
 * Validates that cached fields are still valid options
 */
export function getCachedOrDefaultTemplateFields(): QRTemplateField[] {
  // Try to get cached fields from local storage
  try {
    const cached = localStorage.getItem(QR_TEMPLATE_CACHE_KEY);
    if (cached) {
      const parsedFields = JSON.parse(cached) as QRTemplateField[];

      // Validate that all cached fields are still valid options
      const allValidFieldIds: QRTemplateField[] = [
        "product_name",
        "product_number",
        "hsn_code",
        "material",
        "color",
        "gsm",
        "selling_price_per_unit",
        "unit_number",
        "manufacturing_date",
        "initial_quantity",
        "quality_grade",
        "warehouse_location",
      ];

      const validCachedFields = parsedFields.filter((field) =>
        allValidFieldIds.includes(field),
      );

      // If we have valid cached fields, use them
      if (validCachedFields.length > 0) {
        return validCachedFields;
      }
    }
  } catch (error) {
    console.error("Error reading cached template fields:", error);
  }

  // Fallback to defaults if no cache or cache is invalid
  return getDefaultTemplateFields();
}

/**
 * Save template fields to local storage
 */
export function cacheTemplateFields(fields: QRTemplateField[]): void {
  try {
    localStorage.setItem(QR_TEMPLATE_CACHE_KEY, JSON.stringify(fields));
  } catch (error) {
    console.error("Error caching template fields:", error);
  }
}

/**
 * Get default page size
 */
export function getDefaultPageSize(): PageSize {
  return "A4";
}

/**
 * Get cached page size from local storage
 */
export function getCachedPageSize(): PageSize | null {
  try {
    const cached = localStorage.getItem(QR_PAGE_SIZE_CACHE_KEY);
    if (cached && (cached === "A4" || cached === "LABEL_4X6")) {
      return cached as PageSize;
    }
  } catch (error) {
    console.error("Error reading cached page size:", error);
  }
  return null;
}

/**
 * Get cached page size from local storage, or fallback to default
 */
export function getCachedOrDefaultPageSize(): PageSize {
  return getCachedPageSize() ?? getDefaultPageSize();
}

/**
 * Save page size to local storage
 */
export function cachePageSize(pageSize: PageSize): void {
  try {
    localStorage.setItem(QR_PAGE_SIZE_CACHE_KEY, pageSize);
  } catch (error) {
    console.error("Error caching page size:", error);
  }
}

/**
 * Map page size code to short display format
 */
export function getPageSizeShortDisplay(pageSize: PageSize): string {
  const pageSizeMap: Record<PageSize, string> = {
    A4: "A4",
    LABEL_4X6: "Label 4×6",
  };

  return pageSizeMap[pageSize] || pageSize;
}
