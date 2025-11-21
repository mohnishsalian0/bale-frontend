'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import { TabUnderline } from '@/components/ui/tab-underline';
import { createClient } from '@/lib/supabase/client';
import { formatAbsoluteDate } from '@/lib/utils/date';
import type { Tables } from '@/types/database/supabase';
import { OutwardDetailsTab } from './OutwardDetailsTab';
import { StockUnitsTab } from './StockUnitsTab';

type GoodsOutward = Tables<'goods_outwards'>;
type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;
type SalesOrder = Tables<'sales_orders'>;
type JobWork = Tables<'job_works'>;
type Product = Tables<'products'>;
type StockUnit = Tables<'stock_units'>;
type GoodsOutwardItem = Tables<'goods_outward_items'>;

interface OutwardWithDetails extends GoodsOutward {
	partner: Partner | null;
	agent: Partner | null;
	warehouse: Warehouse | null;
	to_warehouse: Warehouse | null;
	sales_order: SalesOrder | null;
	job_work: JobWork | null;
	goods_outward_items: Array<
		GoodsOutwardItem & {
			stock_unit: (StockUnit & {
				product: Product | null;
			}) | null;
		}
	>;
}

interface PageParams {
	params: Promise<{
		warehouse_slug: string;
		outward_number: string;
	}>;
}

export default function GoodsOutwardDetailPage({ params }: PageParams) {
	const router = useRouter();
	const { outward_number } = use(params);
	const [outward, setOutward] = useState<OutwardWithDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'details' | 'stock_units'>('details');

	const fetchOutward = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			const { data, error: fetchError } = await supabase
				.from('goods_outwards')
				.select(`
					*,
					partner:partners!goods_outwards_partner_id_fkey(
						id, first_name, last_name, company_name,
						phone_number, email, address_line1, address_line2,
						city, state, pin_code
					),
					agent:partners!goods_outwards_agent_id_fkey(
						id, first_name, last_name, company_name
					),
					warehouse:warehouses!goods_outwards_warehouse_id_fkey(
						id, name, address_line1, address_line2, city, state, pin_code
					),
					to_warehouse:warehouses!goods_outwards_to_warehouse_id_fkey(
						id, name, address_line1, address_line2, city, state, pin_code
					),
					sales_order:sales_orders(
						id, sequence_number
					),
					job_work:job_works(
						id, sequence_number
					),
					goods_outward_items(
						id, quantity_dispatched,
						stock_unit:stock_units(
							id, sequence_number, initial_quantity, remaining_quantity,
							product:products(
								id, name, material, color_name, measuring_unit,
								product_images, sequence_number
							)
						)
					)
				`)
				.eq('sequence_number', parseInt(outward_number))
				.is('deleted_at', null)
				.single();

			if (fetchError) throw fetchError;
			if (!data) throw new Error('Goods outward not found');

			setOutward(data as OutwardWithDetails);
		} catch (err) {
			console.error('Error fetching goods outward:', err);
			setError(err instanceof Error ? err.message : 'Failed to load goods outward');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOutward();
	}, [outward_number]);

	if (loading) {
		return <LoadingState message="Loading goods outward..." />;
	}

	if (error || !outward) {
		return (
			<ErrorState
				title="Goods outward not found"
				message={error || 'This goods outward does not exist or has been deleted'}
				onRetry={() => router.back()}
				actionText="Go back"
			/>
		);
	}

	return (
		<div className="flex flex-col flex-1 overflow-y-auto">
			<div className="relative flex flex-col flex-1 max-w-3xl border-r border-border">
				{/* Header */}
				<div className="p-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900">GO-{outward.sequence_number}</h1>
						<p className="text-sm text-gray-500">
							Goods outward on {formatAbsoluteDate(outward.outward_date)}
						</p>
					</div>
				</div>

				{/* Tabs */}
				<TabUnderline
					activeTab={activeTab}
					onTabChange={(tab) => setActiveTab(tab as 'details' | 'stock_units')}
					tabs={[
						{ value: 'details', label: 'Outward details' },
						{ value: 'stock_units', label: 'Stock units' },
					]}
				/>

				{/* Tab Content */}
				<div className="flex-1">
					{activeTab === 'details' ? (
						<OutwardDetailsTab outward={outward} />
					) : (
						<StockUnitsTab items={outward.goods_outward_items} />
					)}
				</div>
			</div>
		</div>
	);
}
