import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import type { CartItem } from '@/contexts/cart-context';

export interface CheckoutFormData {
	firstName: string;
	lastName: string;
	phone: string;
	email: string;
	addressLine1: string;
	addressLine2: string;
	city: string;
	state: string;
	country: string;
	pinCode: string;
	gstin: string;
	specialInstructions: string;
	termsAccepted: boolean;
}

type Partner = Tables<'partners'>;
type SalesOrder = Tables<'sales_orders'>;

export interface CreateCatalogOrderParams {
	companyId: string;
	formData: CheckoutFormData;
	cartItems: CartItem[];
}

/**
 * Find existing customer by email or phone, or create a new one
 */
export async function findOrCreateCustomer(
	companyId: string,
	formData: CheckoutFormData
): Promise<Partner> {
	const supabase = createClient();

	// Try to find existing customer by email
	const { data: existingByEmail } = await supabase
		.from('partners')
		.select('*')
		.eq('company_id', companyId)
		.eq('email', formData.email)
		.eq('partner_type', 'customer')
		.is('deleted_at', null)
		.single();

	if (existingByEmail) {
		return existingByEmail as Partner;
	}

	// Try to find by phone
	const { data: existingByPhone } = await supabase
		.from('partners')
		.select('*')
		.eq('company_id', companyId)
		.eq('phone', formData.phone)
		.eq('partner_type', 'customer')
		.is('deleted_at', null)
		.single();

	if (existingByPhone) {
		return existingByPhone as Partner;
	}

	// Create new customer
	const { data: newCustomer, error: customerError } = await supabase
		.from('partners')
		.insert({
			company_id: companyId, // Explicit company_id for anonymous users
			partner_type: 'customer',
			name: `${formData.firstName} ${formData.lastName}`,
			first_name: formData.firstName,
			last_name: formData.lastName,
			email: formData.email,
			phone: formData.phone,
			address_line_1: formData.addressLine1,
			address_line_2: formData.addressLine2 || null,
			city: formData.city,
			state: formData.state,
			country: formData.country,
			pin_code: formData.pinCode,
			gstin: formData.gstin || null,
			source: 'catalog',
			is_guest: true,
		})
		.select()
		.single();

	if (customerError) {
		console.error('Error creating customer:', customerError);
		throw new Error('Failed to create customer');
	}

	return newCustomer as Partner;
}

/**
 * Create a sales order from catalog checkout
 */
export async function createCatalogOrder({
	companyId,
	formData,
	cartItems,
}: CreateCatalogOrderParams): Promise<SalesOrder> {
	const supabase = createClient();

	// Find or create customer
	const customer = await findOrCreateCustomer(companyId, formData);

	// Create sales order with explicit company_id and warehouse_id as null
	const { data: salesOrder, error: orderError } = await supabase
		.from('sales_orders')
		.insert({
			company_id: companyId, // Explicit for anonymous users
			customer_id: customer.id,
			warehouse_id: null, // Will be assigned during approval
			source: 'catalog',
			status: 'approval_pending',
			notes: formData.specialInstructions || null,
			order_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
		})
		.select()
		.single();

	if (orderError) {
		console.error('Error creating sales order:', orderError);
		throw new Error('Failed to create sales order');
	}

	// Create order items
	const orderItems = cartItems.map((item) => ({
		sales_order_id: salesOrder.id,
		product_id: item.product.id,
		quantity: item.quantity,
		unit_price: 0, // Default to 0, can be set later by admin
		line_total: 0,
	}));

	const { error: itemsError } = await supabase.from('sales_order_items').insert(orderItems);

	if (itemsError) {
		console.error('Error creating order items:', itemsError);
		throw new Error('Failed to create order items');
	}

	return salesOrder as SalesOrder;
}

/**
 * Get sales order by sequence number (for anonymous confirmation page)
 */
export async function getSalesOrderBySequenceNumber(
	companyId: string,
	sequenceNumber: number
): Promise<SalesOrder | null> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from('sales_orders')
		.select(
			`
			*,
			customer:partners!customer_id(*),
			sales_order_items(
				*,
				product:products(*)
			)
		`
		)
		.eq('company_id', companyId)
		.eq('sequence_number', sequenceNumber)
		.single();

	if (error) {
		console.error('Error fetching sales order:', error);
		return null;
	}

	return data as any;
}
