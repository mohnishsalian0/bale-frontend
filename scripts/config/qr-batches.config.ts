export const QR_BATCHES_CONFIG = {
  // Batches per warehouse
  batchesPerWarehouse: 3, // Create 3 batches per warehouse

  // Stock units per batch
  stockUnitsPerBatch: { min: 5, max: 15 },

  // Batch name templates
  batchNameTemplates: [
    "Silk Collection",
    "Cotton Fabric Batch",
    "Premium Woolen Stock",
    "New Arrivals",
    "Export Ready Stock",
    "Warehouse Audit Batch",
    "Festival Collection QRs",
    "Season Clearance",
    "Luxury Fabrics",
    "Sustainable Range",
  ],

  // Fields that can be selected for QR codes
  availableFields: [
    ["product_name", "quality_grade", "location", "qr_code"],
    ["product_name", "size", "quality_grade", "qr_code"],
    ["product_name", "quality_grade", "supplier_number", "location", "qr_code"],
    ["product_name", "color", "size", "qr_code"],
    [
      "product_name",
      "quality_grade",
      "location",
      "manufacturing_date",
      "qr_code",
    ],
    ["product_name", "size", "location", "qr_code"],
    ["product_name", "color", "quality_grade", "qr_code"],
  ],

  // Date range for batch creation (days in the past)
  batchDateOffsetDays: { min: 1, max: 90 },
} as const;
