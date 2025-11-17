/**
 * Database Enums
 * Type definitions for database enum fields
 */

export type UserRole = 'admin' | 'staff';

export type PartnerType = 'customer' | 'vendor' | 'supplier' | 'agent';

export type MaterialType =
	// Natural Fibers
	| 'Cotton' | 'Silk' | 'Wool' | 'Linen' | 'Jute' | 'Hemp' | 'Cashmere' | 'Mohair' | 'Alpaca'
	// Synthetic Fibers
	| 'Polyester' | 'Nylon' | 'Acrylic' | 'Spandex' | 'Lycra' | 'Rayon' | 'Viscose' | 'Modal'
	// Semi-Synthetic
	| 'Bamboo' | 'Tencel' | 'Cupro'
	// Specialty/Technical
	| 'Microfiber' | 'Fleece' | 'Denim' | 'Canvas' | 'Twill' | 'Satin' | 'Chiffon' | 'Georgette'
	| 'Organza' | 'Taffeta' | 'Velvet' | 'Corduroy' | 'Jacquard' | 'Brocade'
	// Blends & Custom
	| 'Cotton-Polyester' | 'Cotton-Spandex' | 'Cotton-Linen' | 'Poly-Cotton' | 'Wool-Silk'
	| 'Silk-Cotton' | 'Blend' | 'Custom';

export type StockType = 'roll' | 'batch' | 'piece';

export type MeasuringUnit = 'metre' | 'yard' | 'kilogram' | 'unit';

export type StockUnitStatus = 'in_stock' | 'dispatched' | 'removed';

export type SalesOrderStatus = 'approval_pending' | 'in_progress' | 'completed' | 'cancelled';

export type DiscountType = 'none' | 'percentage' | 'flat_amount';

export type JobWorkStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type DispatchType = 'sales' | 'job_work' | 'purchase_return' | 'warehouse_transfer' | 'other';

export type ReceiptType = 'purchase' | 'job_work' | 'sales_return' | 'warehouse_transfer' | 'other';

export type JobWorkItemType = 'raw_material' | 'finished_goods';

/**
 * Source of order/customer record creation
 */
export type Source =
	| 'manual'        // Created by staff in app
	| 'online_store'  // Customer order from e-commerce catalog
	| 'import'        // Bulk CSV/Excel import
	| 'api'           // REST API integration
	| 'whatsapp'      // WhatsApp Business chat
	| 'phone'         // Phone order taken by staff
	| 'email';        // Email order

/**
 * Validate if string is valid Source
 */
export function isValidSource(value: string): value is Source {
	return ['manual', 'online_store', 'import', 'api', 'whatsapp', 'phone', 'email'].includes(value);
}
