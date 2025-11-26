import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';

type Partner = Tables<'partners'>;

/**
 * Fetch all partners (for filters, dropdowns, etc.)
 */
export async function getPartners(): Promise<Partner[]> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from('partners')
		.select('*')
		.is('deleted_at', null)
		.order('first_name', { ascending: true });

	if (error) throw error;
	return data || [];
}

/**
 * Fetch customers (for filters, dropdowns, etc.)
 */
export async function getCustomers(): Promise<Partner[]> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from('partners')
		.select('*')
		.eq('partner_type', 'customer')
		.is('deleted_at', null)
		.order('first_name', { ascending: true });

	if (error) throw error;
	return data || [];
}

/**
 * Fetch suppliers/vendors (for filters, dropdowns, etc.)
 */
export async function getSuppliers(): Promise<Partner[]> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from('partners')
		.select('*')
		.in('partner_type', ['supplier', 'vendor'])
		.is('deleted_at', null)
		.order('first_name', { ascending: true });

	if (error) throw error;
	return data || [];
}
