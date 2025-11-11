'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { IconSearch } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TabPills } from '@/components/ui/tab-pills';
import { Fab } from '@/components/ui/fab';
import { createClient } from '@/lib/supabase/client';
import { DropdownMenu } from '@radix-ui/react-dropdown-menu';
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import IconGoodsInward from '@/components/icons/IconGoodsInward';
import IconGoodsOutward from '@/components/icons/IconGoodsOutward';
import { AddGoodsInwardSheet } from '../goods-inward/AddGoodsInwardSheet';
import { AddGoodsOutwardSheet } from '../goods-outward/AddGoodsOutwardSheet';
import { LoadingState } from '@/components/layouts/loading-state';
import { useWarehouse } from '@/contexts/warehouse-context';

interface StockFlowItem {
	id: string;
	type: 'outward' | 'inward';
	productName: string;
	partnerName: string;
	date: string;
	quantity: number;
	unit: string;
	billNumber: string;
}

interface MonthGroup {
	month: string;
	monthYear: string;
	inCount: number;
	outCount: number;
	items: StockFlowItem[];
}

export default function StockFlowPage() {
	const { warehouseId } = useWarehouse();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedFilter, setSelectedFilter] = useState<'all' | 'outward' | 'inward'>('all');
	const [selectedPartner, setSelectedPartner] = useState('all');
	const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [totalReceived, setTotalReceived] = useState(0);
	const [totalOutwarded, setTotalOutwarded] = useState(0);
	const [showGoodsInward, setShowGoodsInward] = useState(false);
	const [showGoodsOutward, setShowGoodsOutward] = useState(false);

	const fetchStockFlow = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			// Fetch inwards with partner details and stock units
			const { data: inwards, error: inwardError } = await supabase
				.from('goods_inwards')
				.select(`
					*,
					partner:partners!goods_inwards_partner_id_fkey(first_name, last_name, company_name),
					stock_units(
						product:products(id, name, measuring_unit),
						initial_quantity
					)
				`)
				.eq('warehouse_id', warehouseId)
				.order('inward_date', { ascending: false });

			if (inwardError) throw inwardError;

			// Fetch outwards with partner details
			const { data: outwards, error: outwardError } = await supabase
				.from('goods_outwards')
				.select(`
					*,
					partner:partners!goods_outwards_partner_id_fkey(first_name, last_name, company_name),
					goods_outward_items(
						quantity_dispatched,
						stock_unit:stock_units(
							product:products(id, name, measuring_unit)
						)
					)
				`)
				.eq('warehouse_id', warehouseId)
				.order('outward_date', { ascending: false });

			if (outwardError) throw outwardError;

			// Transform inwards
			const inwardItems: StockFlowItem[] = (inwards || []).map((r) => {
				const partnerName = r.partner
					? r.partner.company_name || `${r.partner.first_name} ${r.partner.last_name}`
					: 'Unknown Partner';

				const stockUnits = r.stock_units || [];
				const firstProduct = stockUnits[0]?.product;

				// Get unique products
				const uniqueProducts = new Set(stockUnits.map((unit: any) => unit.product?.id).filter(Boolean));
				const productCount = uniqueProducts.size;
				const productName = productCount > 1
					? `${firstProduct?.name || 'Unknown Product'}, ${productCount - 1} more`
					: firstProduct?.name || 'Unknown Product';

				const totalQty = Number(stockUnits.reduce(
					(sum: number, unit: any) => sum + (Number(unit.initial_quantity) || 0),
					0
				).toFixed(2));
				const unit = firstProduct?.measuring_unit || 'm';

				return {
					id: r.id,
					type: 'inward',
					productName,
					partnerName,
					date: r.inward_date,
					quantity: totalQty,
					unit,
					billNumber: r.inward_number,
				};
			});

			// Transform outwards
			const outwardItems: StockFlowItem[] = (outwards || []).map((d) => {
				const partnerName = d.partner
					? d.partner.company_name || `${d.partner.first_name} ${d.partner.last_name}`
					: 'Unknown Partner';

				const items = d.goods_outward_items || [];
				const firstProduct = items[0]?.stock_unit?.product;

				// Get unique products
				const uniqueProducts = new Set(items.map((item: any) => item.stock_unit?.product?.id).filter(Boolean));
				const productCount = uniqueProducts.size;
				const productName = productCount > 1
					? `${firstProduct?.name || 'Unknown Product'}, ${productCount - 1} more`
					: firstProduct?.name || 'Unknown Product';

				const totalQty = Number(items.reduce(
					(sum: number, item: any) => sum + (Number(item.quantity_dispatched) || 0),
					0
				).toFixed(2));
				const unit = firstProduct?.measuring_unit || 'm';

				return {
					id: d.id,
					type: 'outward',
					productName,
					partnerName,
					date: d.outward_date,
					quantity: totalQty,
					unit,
					billNumber: d.outward_number,
				};
			});

			// Combine and sort by date
			const allItems = [...outwardItems, ...inwardItems].sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			);

			// Group by month
			const groups: { [key: string]: MonthGroup } = {};

			allItems.forEach((item) => {
				const date = new Date(item.date);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				const monthName = date.toLocaleString('en-US', { month: 'long' });
				const year = date.getFullYear();

				if (!groups[monthKey]) {
					groups[monthKey] = {
						month: monthName,
						monthYear: `${monthName} ${year}`,
						inCount: 0,
						outCount: 0,
						items: [],
					};
				}

				groups[monthKey].items.push(item);

				if (item.type === 'inward') {
					groups[monthKey].inCount += item.quantity;
				} else {
					groups[monthKey].outCount += item.quantity;
				}
			});

			const sortedGroups = Object.values(groups).map(group => ({
				...group,
				inCount: Number(group.inCount.toFixed(2)),
				outCount: Number(group.outCount.toFixed(2)),
			})).sort((a, b) => {
				const [yearA, monthA] = a.monthYear.split(' ');
				const [yearB, monthB] = b.monthYear.split(' ');
				const dateA = new Date(`${monthA} 1, ${yearA}`);
				const dateB = new Date(`${monthB} 1, ${yearB}`);
				return dateB.getTime() - dateA.getTime();
			});

			setMonthGroups(sortedGroups);

			// Calculate totals for past month
			const oneMonthAgo = new Date();
			oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

			const inward = Number(inwardItems
				.filter((item) => new Date(item.date) >= oneMonthAgo)
				.reduce((sum, item) => sum + item.quantity, 0)
				.toFixed(2));

			const outwarded = Number(outwardItems
				.filter((item) => new Date(item.date) >= oneMonthAgo)
				.reduce((sum, item) => sum + item.quantity, 0)
				.toFixed(2));

			setTotalReceived(inward);
			setTotalOutwarded(outwarded);
		} catch (err) {
			console.error('Error fetching stock flow:', err);
			setError(err instanceof Error ? err.message : 'Failed to load stock flow');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchStockFlow();
	}, []);

	const filteredGroups = monthGroups.map((group) => ({
		...group,
		items: group.items.filter((item) => {
			const matchesSearch =
				item.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.productName.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesFilter =
				selectedFilter === 'all' ||
				(selectedFilter === 'outward' && item.type === 'outward') ||
				(selectedFilter === 'inward' && item.type === 'inward');

			return matchesSearch && matchesFilter;
		}),
	})).filter((group) => group.items.length > 0);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const day = date.getDate();
		const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
		const month = date.toLocaleString('en-US', { month: 'long' });
		return `${day}${suffix} ${month}`;
	};

	// Loading state
	if (loading) {
		return <LoadingState message="Loading stock flow..." />;
	}

	// Error state
	if (error) {
		return (
			<div className="relative flex flex-col min-h-dvh pb-16">
				<div className="flex items-center justify-center h-screen p-4">
					<div className="flex flex-col items-center gap-3 text-center max-w-md">
						<div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
							<span className="text-2xl">⚠️</span>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Failed to load stock flow</h2>
						<p className="text-sm text-gray-600">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-dvh pb-16">
			{/* Header */}
			<div className="flex items-end justify-between gap-4 p-4">
				<div className="flex-1 flex flex-col gap-2">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold text-gray-900">Stock flow</h1>
						<p className="text-sm text-gray-500">
							<span className="text-teal-700">{totalReceived} received</span>
							<span> & </span>
							<span className="text-yellow-700">{totalOutwarded} dispatched</span>
							<span> in past month</span>
						</p>
					</div>

					{/* Search */}
					<div className="relative max-w-md">
						<Input
							type="text"
							placeholder="Search by bill number"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pr-10"
						/>
						<IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
					</div>
				</div>

				{/* Mascot */}
				<div className="relative size-35 shrink-0 flex items-end">
					<Image
						src="/mascot/truck-delivery.png"
						alt="Stock flow"
						width={140}
						height={120}
						// fill
						priority
						className="object-contain"
					/>
				</div>
			</div>

			{/* Filters */}
			<div className="flex gap-4 px-4 py-3">
				{/* Tab Pills */}
				<TabPills
					options={[
						{ value: 'all', label: 'All' },
						{ value: 'inward', label: 'Inward' },
						{ value: 'outward', label: 'Outward' },
					]}
					value={selectedFilter}
					onValueChange={(value) => setSelectedFilter(value as 'all' | 'outward' | 'inward')}
				/>

				{/* Partner Filter */}
				<Select value={selectedPartner} onValueChange={setSelectedPartner}>
					<SelectTrigger className="flex-1 max-w-3xs">
						<SelectValue placeholder="All partners" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All partners</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Stock Flow List */}
			<div className="flex flex-col">
				{filteredGroups.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-600 mb-2">No transactions found</p>
						<p className="text-sm text-gray-500">
							{searchQuery ? 'Try adjusting your search' : 'Start by adding a outward or inward'}
						</p>
					</div>
				) : (
					filteredGroups.map((group, groupIndex) => (
						<div key={group.monthYear} className="flex flex-col">
							{/* Month Header */}
							<div
								className={`flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 ${groupIndex % 2 === 0 ? 'bg-green-100' : 'bg-orange-100'
									}`}
							>
								<p className="text-xs font-semibold text-gray-700">{group.month}</p>
								<p className="text-sm font-bold">
									<span className="text-teal-700">{group.inCount} </span>
									<span className="text-teal-700 font-normal">In</span>
									<span>, </span>
									<span className="text-yellow-700">{group.outCount} </span>
									<span className="text-yellow-700 font-normal">Out</span>
								</p>
							</div>

							{/* Transaction Items */}
							{group.items.map((item) => (
								<button
									key={item.id}
									className="flex items-center gap-4 px-4 py-3 border-t border-dashed border-gray-300 hover:bg-gray-50 transition-colors"
								>
									<div className="flex-1 flex flex-col items-start">
										<p className="text-base font-medium text-gray-900">{item.productName}</p>
										<p className="text-xs text-gray-500">{item.partnerName}</p>
										<p className="text-xs text-gray-500">
											Goods {item.type} on{' '}
											{formatDate(item.date)}
										</p>
									</div>
									<div className="flex flex-col items-end justify-center">
										<p
											className={`text-base font-bold ${item.type === 'inward' ? 'text-teal-700' : 'text-yellow-700'
												}`}
										>
											{item.quantity} {item.unit}
										</p>
										<p className="text-xs text-gray-500">
											{item.type === 'inward' ? 'In' : 'Out'}
										</p>
									</div>
								</button>
							))}
						</div>
					))
				)}
			</div>

			{/* Floating Action Button */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild className='focus-visible:ring-0'>
					<Fab className="fixed bottom-20 right-4" />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56 mx-4" align="start" side='top' sideOffset={8}>
					<DropdownMenuItem className='group' onSelect={() => setShowGoodsInward(true)}>
						<IconGoodsInward className='size-8 mr-1 fill-gray-500 group-hover:fill-primary-foreground' />
						Goods Inward
					</DropdownMenuItem>
					<DropdownMenuItem className='group' onSelect={() => setShowGoodsOutward(true)}>
						<IconGoodsOutward className='size-8 mr-1 fill-gray-500 group-hover:fill-primary-foreground' />
						Goods Outward
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Add Goods Inward Sheet */}
			{showGoodsInward && (
				<AddGoodsInwardSheet
					open={showGoodsInward}
					onOpenChange={setShowGoodsInward}
					onInwardAdded={fetchStockFlow}
				/>
			)}

			{/* Add Goods Outward Sheet */}
			{showGoodsOutward && (
				<AddGoodsOutwardSheet
					open={showGoodsOutward}
					onOpenChange={setShowGoodsOutward}
					onOutwardAdded={fetchStockFlow}
				/>
			)}
		</div>
	);
}
