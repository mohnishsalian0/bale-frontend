import { ComponentType } from "react";
import { StockType } from "@/types/database/enums";
import { IconCylinder, IconPackage, IconShirt } from "@tabler/icons-react";

/**
 * Get icon component for a product based on stock type
 */
export function getProductIcon(stock_type: StockType | null | undefined): ComponentType<{ className?: string }> {
	if (stock_type === 'roll') return IconCylinder;
	if (stock_type === 'batch') return IconPackage;
	if (stock_type === 'piece') return IconShirt;
	return IconPackage; // default
}

/**
 * Get formatted product info string
 * Format: PROD-{sequence_number} · Material · Color
 */
export function getProductInfo(
	product: {
		sequence_number?: number | null;
		material?: string | null;
		color_name?: string | null;
	} | null | undefined
): string {
	if (!product) return '';

	const parts: string[] = [];

	if (product.sequence_number) {
		parts.push(`PROD-${product.sequence_number}`);
	}

	if (product.material) {
		parts.push(product.material);
	}

	if (product.color_name) {
		parts.push(product.color_name);
	}

	return parts.join(' · ');
}

/**
 * Calculate total stock value based on quantity and price per unit
 */
export function calculateStockValue(
	quantity: number | null | undefined,
	pricePerUnit: number | null | undefined
): number {
	if (!quantity || !pricePerUnit) return 0;
	return quantity * pricePerUnit;
}

/**
 * Get display name for stock type
 */
export function getStockTypeDisplay(stockType: string | null | undefined): string {
	if (!stockType) return 'Not specified';

	switch (stockType.toLowerCase()) {
		case 'roll':
			return 'Roll';
		case 'batch':
			return 'Batch';
		case 'piece':
			return 'Piece';
		default:
			return stockType.charAt(0).toUpperCase() + stockType.slice(1);
	}
}
