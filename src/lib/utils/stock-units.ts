import type {
  ScannedStockUnit,
  StockUnitWithProductDetailView,
} from "@/types/stock-units.types";

/**
 * Transforms StockUnitWithProductDetailView to ScannedStockUnit["stockUnit"]
 * Extracts only the fields needed for scanning flows
 */
export function toScannedStockUnit(
  stockUnit: StockUnitWithProductDetailView,
): ScannedStockUnit["stockUnit"] {
  if (!stockUnit.product) {
    throw new Error("Stock unit must have a product");
  }

  return {
    id: stockUnit.id,
    product_id: stockUnit.product_id,
    remaining_quantity: stockUnit.remaining_quantity,
    stock_number: stockUnit.stock_number,
    product: {
      id: stockUnit.product.id,
      name: stockUnit.product.name,
      stock_type: stockUnit.product.stock_type,
      measuring_unit: stockUnit.product.measuring_unit,
      product_images: stockUnit.product.product_images,
      selling_price_per_unit: stockUnit.product.selling_price_per_unit,
    },
  };
}
