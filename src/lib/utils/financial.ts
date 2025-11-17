import type { DiscountType } from '@/types/database/enums';

/**
 * Financial calculation results for sales orders
 */
export interface OrderFinancials {
	itemTotal: number;
	discountAmount: number;
	discountedTotal: number;
	gstAmount: number;
	totalAmount: number;
}

/**
 * Calculate order financial breakdown with discount and GST
 * Formula: (itemTotal - discount) + GST
 * GST is calculated after discount
 *
 * @param itemTotal - Sum of all line items
 * @param discountType - Type of discount (none, percentage, flat_amount)
 * @param discountValue - Discount value (percentage 0-100 or flat amount in rupees)
 * @param gstRate - GST rate percentage (default: 10%)
 * @returns Financial breakdown object
 */
export function calculateOrderFinancials(
	itemTotal: number,
	discountType: DiscountType,
	discountValue: number,
	gstRate: number = 10.00
): OrderFinancials {
	let discountAmount = 0;

	if (discountType === 'percentage') {
		discountAmount = (itemTotal * discountValue) / 100;
	} else if (discountType === 'flat_amount') {
		discountAmount = discountValue;
	}
	// discountType === 'none' → discountAmount remains 0

	const discountedTotal = itemTotal - discountAmount;
	const gstAmount = (discountedTotal * gstRate) / 100;
	const totalAmount = discountedTotal + gstAmount;

	return {
		itemTotal,
		discountAmount,
		discountedTotal,
		gstAmount,
		totalAmount,
	};
}

/**
 * Format currency value in Indian format
 * @param value - Amount to format
 * @returns Formatted string without currency symbol
 */
export function formatCurrency(value: number): string {
	return value.toLocaleString('en-IN', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}
